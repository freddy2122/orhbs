from datetime import timedelta
from typing import Dict, List

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from api.models import (
    AgentSante,
    AlerteEmail,
    ConfigAlerte,
    DeclarationRHS,
    Departement,
    Structure,
    UserProfile,
    ZoneSanitaire,
)
from api.services.email import normalize_recipients
from api.services.stats import get_active_campagne

User = get_user_model()

DEFAULT_ALERT_CONFIGS = [
    {
        "type_alerte": AlerteEmail.TypeAlerte.STRUCTURE_SANS_MEDECIN,
        "seuil_min": 90,
        "frequence_rappel_heures": 24,
        "template_sujet": "ORHS — Structure sans médecin : {structure}",
        "template_corps": (
            "Alerte couverture RHS\n\n"
            "La structure {structure} ({departement}) n'a aucun médecin déclaré "
            "depuis {jours} jours.\n\n"
            "Action attendue : vérifier l'affectation et relancer la collecte.\n"
            "— Observatoire des RHS, Bénin"
        ),
    },
    {
        "type_alerte": AlerteEmail.TypeAlerte.DESEQUILIBRE_GENRE,
        "seuil_min": 30,
        "frequence_rappel_heures": 48,
        "template_sujet": "ORHS — Déséquilibre de genre : {nom}",
        "template_corps": (
            "Alerte genre\n\n"
            "Le territoire {nom} présente un ratio de {ratio_femmes} % de femmes "
            "(seuil {seuil} %).\n\n"
            "— Observatoire des RHS, Bénin"
        ),
    },
    {
        "type_alerte": AlerteEmail.TypeAlerte.SEUIL_COUVERTURE,
        "seuil_min": 1.5,
        "frequence_rappel_heures": 24,
        "template_sujet": "ORHS — Pénurie critique : {zone}",
        "template_corps": (
            "Alerte densité médicale\n\n"
            "La zone {zone} ({departement}) est en dessous du seuil : "
            "{ratio} médecins / 10 000 habitants.\n\n"
            "— Observatoire des RHS, Bénin"
        ),
    },
    {
        "type_alerte": AlerteEmail.TypeAlerte.RETRAITE_PROCHE,
        "seuil_min": 180,
        "frequence_rappel_heures": 168,
        "template_sujet": "ORHS — Départs à la retraite à {jours} jours",
        "template_corps": (
            "Alerte planification RH\n\n"
            "{nombre} agent(s) partent à la retraite dans les {jours} prochains jours.\n"
            "Exemples : {exemples}\n\n"
            "— Observatoire des RHS, Bénin"
        ),
    },
    {
        "type_alerte": AlerteEmail.TypeAlerte.RAPPEL_COLLECTE,
        "seuil_min": 14,
        "frequence_rappel_heures": 24,
        "template_sujet": "ORHS — Rappel collecte {campagne}",
        "template_corps": (
            "Rappel de collecte\n\n"
            "La campagne {campagne} se clôture le {date_fin} ({jours} jour(s) restant(s)).\n"
            "{manquantes} structure(s) n'ont pas encore soumis de déclaration.\n\n"
            "— Observatoire des RHS, Bénin"
        ),
    },
    {
        "type_alerte": AlerteEmail.TypeAlerte.VALIDATION_EN_ATTENTE,
        "seuil_min": 1,
        "frequence_rappel_heures": 24,
        "template_sujet": "ORHS — {nombre} déclaration(s) en attente de validation",
        "template_corps": (
            "Rappel validation\n\n"
            "{nombre} déclaration(s) sont en attente ({detail}).\n\n"
            "— Observatoire des RHS, Bénin"
        ),
    },
]


def default_alert_recipients():
    emails = list(
        User.objects.filter(
            profile__role__in=(UserProfile.Role.ADMIN, UserProfile.Role.COORDINATION),
            is_active=True,
        )
        .exclude(email="")
        .values_list("email", flat=True)
    )
    return emails or ["coordination@orhsb.bj"]


def ensure_default_configs() -> List[ConfigAlerte]:
    created = []
    recipients = default_alert_recipients()
    for spec in DEFAULT_ALERT_CONFIGS:
        config, was_created = ConfigAlerte.objects.get_or_create(
            type_alerte=spec["type_alerte"],
            defaults={
                "actif": True,
                "seuil_min": spec.get("seuil_min"),
                "destinataires_defaut": recipients,
                "frequence_rappel_heures": spec.get("frequence_rappel_heures"),
                "template_sujet": spec["template_sujet"],
                "template_corps": spec["template_corps"],
            },
        )
        if was_created:
            created.append(config)
        elif not normalize_recipients(config.destinataires_defaut):
            config.destinataires_defaut = recipients
            config.save(update_fields=["destinataires_defaut", "updated_at"])
    return created


class AlertGenerator:
    """Générateur d'alertes automatiques pour ORHSB."""

    @staticmethod
    def check_structures_sans_medecin(campagne=None):
        """Détecte les structures sans médecin titulaire depuis plus de 3 mois."""
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)

        structures_sans_medecin = []
        now = timezone.now()
        date_limite = now - timedelta(days=90)

        for decl in qs:
            if decl.medecins == 0:
                validated = decl.date_valide_national
                if validated and timezone.is_naive(validated):
                    validated = timezone.make_aware(validated, timezone.get_current_timezone())
                if validated and validated < date_limite:
                    structures_sans_medecin.append({
                        "structure": decl.structure.nom,
                        "type_structure": decl.structure.get_type_structure_display(),
                        "departement": decl.structure.departement.nom,
                        "zone": decl.structure.zone_sanitaire.nom if decl.structure.zone_sanitaire else None,
                        "date_derniere_validation": validated.isoformat(),
                        "jours_sans_medecin": (now - validated).days,
                    })

        return structures_sans_medecin

    @staticmethod
    def check_desequilibres_genre(campagne=None, seuil_ratio=0.3):
        """Détecte les déséquilibres de genre dans certaines spécialités ou zones."""
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)

        desequilibres = []

        # Par département
        for dept in Departement.objects.all():
            dept_qs = qs.filter(structure__departement=dept)
            totals = dept_qs.aggregate(
                total=Coalesce(Sum("effectif_total"), 0),
                femmes=Coalesce(Sum("dont_femmes"), 0),
            )

            if totals["total"] > 0:
                ratio_femmes = totals["femmes"] / totals["total"]
                if ratio_femmes < seuil_ratio or ratio_femmes > (1 - seuil_ratio):
                    desequilibres.append({
                        "type": "departement",
                        "nom": dept.nom,
                        "effectif_total": totals["total"],
                        "femmes": totals["femmes"],
                        "hommes": totals["total"] - totals["femmes"],
                        "ratio_femmes": round(ratio_femmes * 100, 2),
                        "seuil_alerte": round(seuil_ratio * 100, 2),
                    })

        # Par spécialité (médecins)
        medecins_qs = qs.filter(medecins__gt=0)
        for dept in Departement.objects.all():
            dept_med_qs = medecins_qs.filter(structure__departement=dept)
            totals = dept_med_qs.aggregate(
                total_med=Coalesce(Sum("medecins"), 0),
            )

            # Estimer le nombre de femmes médecins (approximation basée sur le ratio global)
            dept_totals = qs.filter(structure__departement=dept).aggregate(
                total=Coalesce(Sum("effectif_total"), 0),
                femmes=Coalesce(Sum("dont_femmes"), 0),
            )

            if totals["total_med"] > 0 and dept_totals["total"] > 0:
                ratio_femmes_global = dept_totals["femmes"] / dept_totals["total"]
                femmes_med_estimees = int(totals["total_med"] * ratio_femmes_global)
                
                if ratio_femmes_global < seuil_ratio or ratio_femmes_global > (1 - seuil_ratio):
                    desequilibres.append({
                        "type": "specialite",
                        "specialite": "Médecins",
                        "departement": dept.nom,
                        "total": totals["total_med"],
                        "femmes_estimees": femmes_med_estimees,
                        "hommes_estimes": totals["total_med"] - femmes_med_estimees,
                        "ratio_femmes": round(ratio_femmes_global * 100, 2),
                    })

        return desequilibres

    @staticmethod
    def check_zones_penurie_critique(campagne=None, seuil_ratio=1.5):
        """Détecte les zones sanitaires en situation de pénurie critique."""
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)

        zones_critiques = []

        for zone in ZoneSanitaire.objects.select_related("departement").all():
            zone_qs = qs.filter(structure__zone_sanitaire=zone)
            totals = zone_qs.aggregate(
                medecins=Coalesce(Sum("medecins"), 0),
                infirmiers=Coalesce(Sum("infirmiers"), 0),
            )

            population = zone.departement.population
            if population > 0:
                ratio_medecins = totals["medecins"] / population * 10000
                ratio_infirmiers = totals["infirmiers"] / population * 10000

                if ratio_medecins < seuil_ratio:
                    zones_critiques.append({
                        "zone": zone.nom,
                        "departement": zone.departement.nom,
                        "medecins": totals["medecins"],
                        "infirmiers": totals["infirmiers"],
                        "population": population,
                        "ratio_medecins_10k": round(ratio_medecins, 2),
                        "ratio_infirmiers_10k": round(ratio_infirmiers, 2),
                        "seuil_critique": seuil_ratio,
                        "niveau": "critique" if ratio_medecins < 1.0 else "alerte",
                    })

        return zones_critiques

    @staticmethod
    def check_retraites_proches(jours=None):
        config = ConfigAlerte.objects.filter(
            type_alerte=AlerteEmail.TypeAlerte.RETRAITE_PROCHE, actif=True
        ).first()
        horizon_jours = int(jours or (config.seuil_min if config and config.seuil_min else 180))
        today = timezone.now().date()
        limite = today + timedelta(days=horizon_jours)
        agents = (
            AgentSante.objects.filter(
                actif=True,
                depart_retraite_prevu__isnull=False,
                depart_retraite_prevu__gte=today,
                depart_retraite_prevu__lte=limite,
            )
            .select_related("structure")
            .order_by("depart_retraite_prevu")[:50]
        )
        if not agents:
            return None
        exemples = ", ".join(
            f"{a.prenom} {a.nom} ({a.structure.nom if a.structure else '—'}, {a.depart_retraite_prevu.strftime('%d/%m/%Y')})"
            for a in agents[:8]
        )
        return {
            "nombre": AgentSante.objects.filter(
                actif=True,
                depart_retraite_prevu__isnull=False,
                depart_retraite_prevu__gte=today,
                depart_retraite_prevu__lte=limite,
            ).count(),
            "jours": horizon_jours,
            "exemples": exemples or "—",
        }

    @staticmethod
    def check_rappel_collecte():
        campagne = get_active_campagne()
        if not campagne:
            return None
        config = ConfigAlerte.objects.filter(
            type_alerte=AlerteEmail.TypeAlerte.RAPPEL_COLLECTE, actif=True
        ).first()
        seuil_jours = int(config.seuil_min if config and config.seuil_min else 14)
        today = timezone.now().date()
        jours_restants = (campagne.date_fin - today).days
        if jours_restants < 0 or jours_restants > seuil_jours:
            return None
        soumises = DeclarationRHS.objects.filter(
            campagne=campagne,
            statut__in=[
                DeclarationRHS.Statut.SOUMIS,
                DeclarationRHS.Statut.VALIDE_DEPARTEMENT,
                DeclarationRHS.Statut.VALIDE_NATIONAL,
            ],
        ).values_list("structure_id", flat=True)
        manquantes = Structure.objects.filter(actif=True).exclude(id__in=soumises).count()
        if manquantes == 0:
            return None
        return {
            "campagne": campagne.libelle,
            "date_fin": campagne.date_fin.strftime("%d/%m/%Y"),
            "jours": jours_restants,
            "manquantes": manquantes,
        }

    @staticmethod
    def check_validation_en_attente():
        soumis = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.SOUMIS).count()
        national = DeclarationRHS.objects.filter(
            statut=DeclarationRHS.Statut.VALIDE_DEPARTEMENT
        ).count()
        total = soumis + national
        if total == 0:
            return None
        detail = f"{soumis} départementale(s), {national} nationale(s)"
        return {"nombre": total, "detail": detail}

    @staticmethod
    def _already_notified(type_alerte: str, fingerprint: str, hours: int) -> bool:
        since = timezone.now() - timedelta(hours=max(hours, 1))
        return AlerteEmail.objects.filter(
            type_alerte=type_alerte,
            created_at__gte=since,
            statut__in=[
                AlerteEmail.StatutAlerte.EN_ATTENTE,
                AlerteEmail.StatutAlerte.ENVOYE,
            ],
            donnees_contexte__fingerprint=fingerprint,
        ).exists()

    @staticmethod
    def generate_alerte_email(
        type_alerte: str,
        donnees_contexte: Dict,
        structure=None,
        departement=None,
        seuil_declencheur=None,
        valeur_actuelle=None,
        valeur_seuil=None,
    ):
        """Crée une alerte email si la config est active et qu'aucune alerte récente n'existe."""
        ensure_default_configs()
        config = ConfigAlerte.objects.filter(type_alerte=type_alerte, actif=True).first()
        if not config:
            return None

        fingerprint = donnees_contexte.get("fingerprint") or "|".join(
            str(donnees_contexte.get(key, ""))
            for key in ("structure", "zone", "nom", "campagne", "type")
        )
        donnees_contexte = {**donnees_contexte, "fingerprint": fingerprint, "seuil": config.seuil_min}
        hours = config.frequence_rappel_heures or 24
        if AlertGenerator._already_notified(type_alerte, fingerprint, hours):
            return None

        sujet = config.template_sujet or f"Alerte ORHS : {type_alerte}"
        corps = config.template_corps or f"Une alerte a été déclenchée : {type_alerte}"
        for key, value in donnees_contexte.items():
            sujet = sujet.replace(f"{{{key}}}", str(value))
            corps = corps.replace(f"{{{key}}}", str(value))

        destinataires = normalize_recipients(config.destinataires_defaut) or default_alert_recipients()

        alerte = AlerteEmail.objects.create(
            type_alerte=type_alerte,
            statut=AlerteEmail.StatutAlerte.EN_ATTENTE,
            destinataires=destinataires,
            sujet=sujet,
            corps=corps,
            donnees_contexte=donnees_contexte,
            structure_concernee=structure,
            departement_concerne=departement,
            seuil_declencheur=seuil_declencheur or "",
            valeur_actuelle=valeur_actuelle,
            valeur_seuil=valeur_seuil if valeur_seuil is not None else config.seuil_min,
        )
        config.dernier_envoi = timezone.now()
        config.save(update_fields=["dernier_envoi", "updated_at"])
        return alerte

    @staticmethod
    def run_all_checks(campagne=None):
        """Exécute tous les contrôles d'alerte et crée les alertes email."""
        ensure_default_configs()
        alertes_creees = []

        for struct in AlertGenerator.check_structures_sans_medecin(campagne):
            alerte = AlertGenerator.generate_alerte_email(
                type_alerte=AlerteEmail.TypeAlerte.STRUCTURE_SANS_MEDECIN,
                donnees_contexte={
                    "structure": struct["structure"],
                    "departement": struct["departement"],
                    "jours": struct["jours_sans_medecin"],
                    "fingerprint": f"sans-medecin:{struct['structure']}",
                },
                seuil_declencheur="jours_sans_medecin",
                valeur_actuelle=struct["jours_sans_medecin"],
                valeur_seuil=90,
            )
            if alerte:
                alertes_creees.append(alerte)

        for deseq in AlertGenerator.check_desequilibres_genre(campagne):
            nom = deseq.get("nom") or deseq.get("departement")
            alerte = AlertGenerator.generate_alerte_email(
                type_alerte=AlerteEmail.TypeAlerte.DESEQUILIBRE_GENRE,
                donnees_contexte={
                    "type": deseq["type"],
                    "nom": nom,
                    "ratio_femmes": deseq["ratio_femmes"],
                    "fingerprint": f"genre:{deseq['type']}:{nom}",
                },
                seuil_declencheur="ratio_femmes",
                valeur_actuelle=deseq["ratio_femmes"],
                valeur_seuil=30.0,
            )
            if alerte:
                alertes_creees.append(alerte)

        for zone in AlertGenerator.check_zones_penurie_critique(campagne):
            alerte = AlertGenerator.generate_alerte_email(
                type_alerte=AlerteEmail.TypeAlerte.SEUIL_COUVERTURE,
                donnees_contexte={
                    "zone": zone["zone"],
                    "departement": zone["departement"],
                    "ratio": zone["ratio_medecins_10k"],
                    "fingerprint": f"penurie:{zone['zone']}",
                },
                seuil_declencheur="ratio_medecins_10k",
                valeur_actuelle=zone["ratio_medecins_10k"],
                valeur_seuil=1.5,
            )
            if alerte:
                alertes_creees.append(alerte)

        retraites = AlertGenerator.check_retraites_proches()
        if retraites:
            alerte = AlertGenerator.generate_alerte_email(
                type_alerte=AlerteEmail.TypeAlerte.RETRAITE_PROCHE,
                donnees_contexte=retraites,
                seuil_declencheur="jours_retraite",
                valeur_actuelle=retraites["nombre"],
                valeur_seuil=retraites["jours"],
            )
            if alerte:
                alertes_creees.append(alerte)

        rappel = AlertGenerator.check_rappel_collecte()
        if rappel:
            alerte = AlertGenerator.generate_alerte_email(
                type_alerte=AlerteEmail.TypeAlerte.RAPPEL_COLLECTE,
                donnees_contexte=rappel,
                seuil_declencheur="jours_restants",
                valeur_actuelle=rappel["manquantes"],
                valeur_seuil=rappel["jours"],
            )
            if alerte:
                alertes_creees.append(alerte)

        validation = AlertGenerator.check_validation_en_attente()
        if validation:
            alerte = AlertGenerator.generate_alerte_email(
                type_alerte=AlerteEmail.TypeAlerte.VALIDATION_EN_ATTENTE,
                donnees_contexte=validation,
                seuil_declencheur="declarations_en_attente",
                valeur_actuelle=validation["nombre"],
                valeur_seuil=1,
            )
            if alerte:
                alertes_creees.append(alerte)

        return alertes_creees
