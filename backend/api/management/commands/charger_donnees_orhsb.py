"""Charge des données métier réalistes (collecte RHS, CMS, annuaire) pour l'affichage public et les tableaux de bord.

Ce n'est pas le seed de comptes : les utilisateurs restent gérés par seed_orhsb.
Les chiffres RHS s'appuient sur les structures officielles (CHU-MEL, CHUD Borgou-Alibori)
et deux établissements des secteurs privé et confessionnel.
"""

from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from api.models import (
    AgentQualification,
    AgentSante,
    CampagneCollecte,
    CategoriePublication,
    ContenuEditorial,
    DeclarationRHS,
    InscriptionOrdre,
    Publication,
    Structure,
    ZoneSanitaire,
)


SOURCE = "orhsb_donnees_metier"


def _now():
    return timezone.now()


def _user(*names):
    for name in names:
        user = User.objects.filter(username=name).first()
        if user:
            return user
    return User.objects.filter(is_superuser=True).first()


class Command(BaseCommand):
    help = "Charge déclarations RHS validées, agents des 3 secteurs, actualités, publications et annuaire."

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Ne fait rien si des déclarations nationales et des actualités existent déjà.",
        )

    def handle(self, *args, **options):
        has_stats = DeclarationRHS.objects.filter(
            statut=DeclarationRHS.Statut.VALIDE_NATIONAL
        ).exists()
        has_cms = ContenuEditorial.objects.filter(
            type_contenu=ContenuEditorial.TypeContenu.ACTUALITE,
            publie=True,
        ).exists()
        if options["if_empty"] and has_stats and has_cms:
            self.stdout.write("Données métier déjà présentes, chargement ignoré.")
            return

        if not Structure.objects.filter(code="chu-mel").exists():
            call_command("seed_orhsb")
            call_command("seed_rhs_data")

        admin = _user("admin", "coordination")
        validateur = _user("validateur", "coordination", "admin")
        collecteur = _user("collecteur.chu-mel", "admin")

        campagne_2025 = self._campagne(
            "collecte-2025",
            "Collecte annuelle RHS 2025",
            2025,
            active=False,
            debut=date(2025, 1, 15),
            fin=date(2025, 12, 31),
        )
        campagne_2026 = self._campagne(
            "collecte-2026",
            "Collecte annuelle RHS 2026",
            2026,
            active=True,
            debut=date(2026, 1, 10),
            fin=date(2026, 12, 31),
        )

        chu_mel = Structure.objects.get(code="chu-mel")
        chu_parakou = Structure.objects.get(code="chu-parakou")
        clinique = self._structure_privee()
        hopital_confessionnel = self._structure_confessionnelle()

        self._declarations_2025(campagne_2025, chu_mel, chu_parakou, admin, validateur)
        self._declarations_2026(
            campagne_2026,
            chu_mel,
            chu_parakou,
            clinique,
            hopital_confessionnel,
            admin,
            validateur,
            collecteur,
        )
        self._agents(campagne_2026, chu_mel, chu_parakou, clinique, hopital_confessionnel)
        self._cms(admin)
        self._annuaire()

        self.stdout.write(self.style.SUCCESS("Données métier ORHS chargées."))
        self.stdout.write("  2 campagnes (2025 historique, 2026 active)")
        self.stdout.write("  Déclarations validées nationales : public, privé, confessionnel")
        self.stdout.write("  Actualités, événements, FAQ, textes, formations, publications, annuaire")

    def _campagne(self, code, libelle, annee, active, debut, fin):
        campagne, _ = CampagneCollecte.objects.update_or_create(
            code=code,
            defaults={
                "libelle": libelle,
                "annee": annee,
                "periode": "Annuelle",
                "date_debut": debut,
                "date_fin": fin,
                "active": active,
            },
        )
        if active:
            CampagneCollecte.objects.exclude(pk=campagne.pk).update(active=False)
            campagne.active = True
            campagne.save(update_fields=["active"])
        return campagne

    def _structure_privee(self):
        zone = ZoneSanitaire.objects.get(code="zs-cotonou")
        structure, _ = Structure.objects.update_or_create(
            code="clinique-le-benin",
            defaults={
                "nom": "Clinique Le Bénin (Cotonou)",
                "type_structure": Structure.TypeStructure.PRIVE,
                "departement": zone.departement,
                "zone_sanitaire": zone,
                "actif": True,
            },
        )
        return structure

    def _structure_confessionnelle(self):
        zone = ZoneSanitaire.objects.get(code="zs-tanguieta")
        structure, _ = Structure.objects.update_or_create(
            code="hsjd-tanguieta",
            defaults={
                "nom": "Hôpital Saint-Jean-de-Dieu de Tanguiéta",
                "type_structure": Structure.TypeStructure.HZ,
                "departement": zone.departement,
                "zone_sanitaire": zone,
                "actif": True,
            },
        )
        return structure

    def _upsert_declaration(self, campagne, structure, admin, validateur, extra, statut=None):
        now = _now()
        payload = {
            "statut": statut or DeclarationRHS.Statut.VALIDE_NATIONAL,
            "soumis_par": extra.pop("soumis_par", admin),
            "valide_dept_par": validateur,
            "valide_national_par": admin,
            "date_soumission": now - timedelta(days=21),
            "date_valide_dept": now - timedelta(days=14),
            "date_valide_national": now - timedelta(days=6),
            **extra,
        }
        if payload["statut"] != DeclarationRHS.Statut.VALIDE_NATIONAL:
            payload["valide_national_par"] = None
            payload["date_valide_national"] = None
        declaration, _ = DeclarationRHS.objects.update_or_create(
            campagne=campagne,
            structure=structure,
            defaults=payload,
        )
        if not declaration.effectif_total:
            declaration.effectif_total = declaration.dont_femmes + declaration.dont_hommes
            declaration.save(update_fields=["effectif_total"])
        return declaration

    def _declarations_2025(self, campagne, chu_mel, chu_parakou, admin, validateur):
        self._upsert_declaration(
            campagne,
            chu_mel,
            admin,
            validateur,
            {
                "dont_femmes": 241,
                "dont_hommes": 179,
                "effectif_total": 420,
                "medecins": 71,
                "medecins_generalistes": 28,
                "medecins_specialistes": 43,
                "infirmiers": 152,
                "infirmiers_auxiliaires": 20,
                "sages_femmes": 38,
                "sages_femmes_auxiliaires": 7,
                "pharmaciens": 10,
                "techniciens_laboratoire": 14,
                "techniciens_imagerie": 6,
                "agents_sante_communautaire": 10,
                "chirurgiens_dentistes": 5,
                "kinesitherapeutes": 4,
                "autres_paramedicaux": 12,
                "administratifs": 44,
                "agents_entretien": 16,
                "autre_personnel": 8,
                "postes_budgetes": 450,
                "postes_pourvus": 417,
                "postes_vacants": 33,
                "departs_retraite_6_mois": 7,
                "departs_retraite_12_mois": 18,
                "observations": "Bilan consolidé CHU-MEL, campagne 2025, validé par la coordination ORHS.",
            },
        )
        self._upsert_declaration(
            campagne,
            chu_parakou,
            admin,
            validateur,
            {
                "dont_femmes": 108,
                "dont_hommes": 94,
                "effectif_total": 202,
                "medecins": 31,
                "medecins_generalistes": 14,
                "medecins_specialistes": 17,
                "infirmiers": 88,
                "infirmiers_auxiliaires": 12,
                "sages_femmes": 24,
                "sages_femmes_auxiliaires": 5,
                "pharmaciens": 5,
                "techniciens_laboratoire": 8,
                "techniciens_imagerie": 3,
                "agents_sante_communautaire": 6,
                "chirurgiens_dentistes": 2,
                "kinesitherapeutes": 2,
                "autres_paramedicaux": 7,
                "administratifs": 22,
                "agents_entretien": 10,
                "autre_personnel": 5,
                "postes_budgetes": 230,
                "postes_pourvus": 202,
                "postes_vacants": 28,
                "departs_retraite_6_mois": 4,
                "departs_retraite_12_mois": 11,
                "observations": "Bilan CHUD Borgou-Alibori 2025.",
            },
        )

    def _declarations_2026(
        self,
        campagne,
        chu_mel,
        chu_parakou,
        clinique,
        hopital_confessionnel,
        admin,
        validateur,
        collecteur,
    ):
        self._upsert_declaration(
            campagne,
            chu_mel,
            admin,
            validateur,
            {
                "soumis_par": collecteur,
                "dont_femmes": 268,
                "dont_hommes": 192,
                "effectif_total": 460,
                "medecins": 78,
                "medecins_generalistes": 30,
                "medecins_specialistes": 48,
                "infirmiers": 165,
                "infirmiers_auxiliaires": 22,
                "sages_femmes": 41,
                "sages_femmes_auxiliaires": 8,
                "pharmaciens": 11,
                "techniciens_laboratoire": 16,
                "techniciens_imagerie": 7,
                "agents_sante_communautaire": 12,
                "chirurgiens_dentistes": 6,
                "kinesitherapeutes": 5,
                "autres_paramedicaux": 14,
                "administratifs": 48,
                "agents_entretien": 18,
                "autre_personnel": 9,
                "postes_budgetes": 490,
                "postes_pourvus": 460,
                "postes_vacants": 30,
                "departs_retraite_6_mois": 8,
                "departs_retraite_12_mois": 21,
                "observations": (
                    "Déclaration annuelle 2026 du CHU de la Mère et de l'Enfant Lagune. "
                    "Données arrêtées après contrôle qualité DRH Littoral puis validation nationale ORHS."
                ),
            },
        )
        self._upsert_declaration(
            campagne,
            chu_parakou,
            admin,
            validateur,
            {
                "dont_femmes": 118,
                "dont_hommes": 97,
                "effectif_total": 215,
                "medecins": 34,
                "medecins_generalistes": 15,
                "medecins_specialistes": 19,
                "infirmiers": 96,
                "infirmiers_auxiliaires": 13,
                "sages_femmes": 26,
                "sages_femmes_auxiliaires": 5,
                "pharmaciens": 6,
                "techniciens_laboratoire": 9,
                "techniciens_imagerie": 4,
                "agents_sante_communautaire": 7,
                "chirurgiens_dentistes": 3,
                "kinesitherapeutes": 2,
                "autres_paramedicaux": 8,
                "administratifs": 24,
                "agents_entretien": 11,
                "autre_personnel": 5,
                "postes_budgetes": 248,
                "postes_pourvus": 215,
                "postes_vacants": 33,
                "departs_retraite_6_mois": 5,
                "departs_retraite_12_mois": 12,
                "observations": "Déclaration 2026 du CHUD Borgou-Alibori, validée nationalement.",
            },
        )
        self._upsert_declaration(
            campagne,
            clinique,
            admin,
            validateur,
            {
                "dont_femmes": 29,
                "dont_hommes": 19,
                "effectif_total": 48,
                "medecins": 9,
                "medecins_generalistes": 5,
                "medecins_specialistes": 4,
                "infirmiers": 16,
                "infirmiers_auxiliaires": 3,
                "sages_femmes": 4,
                "sages_femmes_auxiliaires": 1,
                "pharmaciens": 2,
                "techniciens_laboratoire": 2,
                "techniciens_imagerie": 1,
                "agents_sante_communautaire": 0,
                "chirurgiens_dentistes": 1,
                "kinesitherapeutes": 1,
                "autres_paramedicaux": 2,
                "administratifs": 5,
                "agents_entretien": 2,
                "autre_personnel": 1,
                "postes_budgetes": 52,
                "postes_pourvus": 48,
                "postes_vacants": 4,
                "departs_retraite_6_mois": 0,
                "departs_retraite_12_mois": 1,
                "observations": "Établissement privé — Clinique Le Bénin, Cotonou. Collecte 2026.",
            },
        )
        self._upsert_declaration(
            campagne,
            hopital_confessionnel,
            admin,
            validateur,
            {
                "dont_femmes": 58,
                "dont_hommes": 44,
                "effectif_total": 102,
                "medecins": 14,
                "medecins_generalistes": 8,
                "medecins_specialistes": 6,
                "infirmiers": 42,
                "infirmiers_auxiliaires": 8,
                "sages_femmes": 11,
                "sages_femmes_auxiliaires": 3,
                "pharmaciens": 3,
                "techniciens_laboratoire": 4,
                "techniciens_imagerie": 2,
                "agents_sante_communautaire": 5,
                "chirurgiens_dentistes": 1,
                "kinesitherapeutes": 1,
                "autres_paramedicaux": 3,
                "administratifs": 8,
                "agents_entretien": 5,
                "autre_personnel": 2,
                "postes_budgetes": 115,
                "postes_pourvus": 102,
                "postes_vacants": 13,
                "departs_retraite_6_mois": 2,
                "departs_retraite_12_mois": 6,
                "observations": (
                    "Hôpital Saint-Jean-de-Dieu de Tanguiéta (secteur confessionnel). "
                    "Données 2026 transmises par la DDS Atacora et validées par l'ORHS."
                ),
            },
        )
        hz_parakou = Structure.objects.filter(code="hz-parakou").first()
        if hz_parakou:
            self._upsert_declaration(
                campagne,
                hz_parakou,
                admin,
                validateur,
                {
                    "dont_femmes": 41,
                    "dont_hommes": 33,
                    "effectif_total": 74,
                    "medecins": 8,
                    "medecins_generalistes": 6,
                    "medecins_specialistes": 2,
                    "infirmiers": 28,
                    "infirmiers_auxiliaires": 6,
                    "sages_femmes": 9,
                    "sages_femmes_auxiliaires": 2,
                    "pharmaciens": 2,
                    "techniciens_laboratoire": 3,
                    "techniciens_imagerie": 1,
                    "agents_sante_communautaire": 4,
                    "chirurgiens_dentistes": 1,
                    "kinesitherapeutes": 0,
                    "autres_paramedicaux": 2,
                    "administratifs": 7,
                    "agents_entretien": 4,
                    "autre_personnel": 2,
                    "postes_budgetes": 88,
                    "postes_pourvus": 74,
                    "postes_vacants": 14,
                    "departs_retraite_6_mois": 1,
                    "departs_retraite_12_mois": 4,
                    "observations": "HZ Parakou — soumise, en attente de validation nationale.",
                },
                statut=DeclarationRHS.Statut.VALIDE_DEPARTEMENT,
            )

    def _agents(self, campagne, chu_mel, chu_parakou, clinique, hopital):
        rows = [
            ("MEL-2026-001", chu_mel, "Adéoti", "Marie-Claire", "F", "Médecin spécialiste", "Gynécologie-obstétrique", "public", "Chef de service Gynécologie", date(2027, 3, 1)),
            ("MEL-2026-002", chu_mel, "Hounsou", "Jean-Baptiste", "M", "Médecin généraliste", "", "public", "Praticien hospitalier", None),
            ("MEL-2026-003", chu_mel, "Dossou", "Fidélia", "F", "Infirmier(ère) d'État", "Soins intensifs", "public", "Infirmière major", date(2026, 11, 15)),
            ("MEL-2026-004", chu_mel, "Kpeto", "Serge", "M", "Sage-femme", "", "public", "Sage-femme diplômée d'État", None),
            ("MEL-2026-005", chu_mel, "Lawson", "Afiavi", "F", "Pharmacien", "Pharmacie hospitalière", "public", "Pharmacienne clinicienne", None),
            ("MEL-2026-006", chu_mel, "Agbo", "Pascal", "M", "Technicien de laboratoire", "", "public", "Technicien biomédical", None),
            ("PAR-2026-001", chu_parakou, "Bio", "Issa", "M", "Médecin spécialiste", "Pédiatrie", "public", "Chef de clinique Pédiatrie", date(2026, 9, 1)),
            ("PAR-2026-002", chu_parakou, "Sero", "Ramatou", "F", "Infirmier(ère) d'État", "", "public", "Infirmière de salle", None),
            ("PAR-2026-003", chu_parakou, "Toukourou", "Abdou", "M", "Technicien en imagerie médicale", "Radiologie", "public", "Manipulateur radio", None),
            ("CBN-2026-001", clinique, "Mensah", "Koffi", "M", "Médecin spécialiste", "Chirurgie générale", "prive", "Chirurgien consultant", None),
            ("CBN-2026-002", clinique, "Hounkanlin", "Gisèle", "F", "Infirmier(ère) d'État", "", "prive", "Infirmière de bloc", None),
            ("CBN-2026-003", clinique, "Zinsou", "Patricia", "F", "Sage-femme", "", "prive", "Sage-femme libérale associée", None),
            ("CBN-2026-004", clinique, "Adjovi", "Eric", "M", "Personnel administratif", "", "prive", "Gestionnaire de clinique", None),
            ("TGT-2026-001", hopital, "Yarca", "Paul", "M", "Médecin spécialiste", "Chirurgie viscérale", "confessionnel", "Chirurgien (HSJD)", None),
            ("TGT-2026-002", hopital, "N'tcha", "Bernadette", "F", "Infirmier(ère) d'État", "Bloc opératoire", "confessionnel", "Infirmière de bloc", date(2027, 6, 30)),
            ("TGT-2026-003", hopital, "Kassa", "Monique", "F", "Sage-femme", "", "confessionnel", "Sage-femme de maternité", None),
            ("TGT-2026-004", hopital, "Atacora", "Dieudonné", "M", "Agent de santé communautaire", "", "confessionnel", "Relais communautaire", None),
            ("TGT-2026-005", hopital, "Pognon", "Claire", "F", "Pharmacien", "", "confessionnel", "Pharmacienne hospitalière", None),
        ]
        for matricule, structure, nom, prenom, sexe, profession, specialite, secteur, poste, retraite in rows:
            agent, _ = AgentSante.objects.update_or_create(
                campagne=campagne,
                matricule=matricule,
                defaults={
                    "structure": structure,
                    "nom": nom,
                    "prenom": prenom,
                    "sexe": sexe,
                    "date_naissance": date(1984, 5, 12),
                    "profession": profession,
                    "specialite": specialite,
                    "diplome_principal": "Doctorat d'État / diplôme professionnel",
                    "ecole_formation": "FSS Cotonou / INMeS",
                    "annee_diplome": 2012,
                    "secteur": secteur,
                    "statut_agent": AgentSante.StatutAgent.ACTIF,
                    "type_contrat": AgentSante.TypeContrat.PERMANENT
                    if secteur == "public"
                    else AgentSante.TypeContrat.CONTRACTUEL,
                    "poste_occupe": poste,
                    "date_prise_service": date(2016, 3, 1),
                    "depart_retraite_prevu": retraite,
                    "nationalite": "Béninoise",
                    "actif": True,
                    "source_fichier": SOURCE,
                },
            )
            AgentQualification.objects.update_or_create(
                agent=agent,
                intitule=profession,
                defaults={
                    "niveau": "Licence / Doctorat",
                    "ecole": "Université d'Abomey-Calavi",
                    "date_obtention": date(2012, 7, 15),
                },
            )

    def _cms(self, admin):
        now = _now()
        categories = [
            ("rapports", "Rapports et bilans", "Bilans annuels et rapports d'activités de l'ORHS et du MS.", 1),
            ("annuaires", "Annuaires statistiques", "Annuaires RHS et séries statistiques officielles.", 2),
            ("notes", "Notes et communiqués", "Notes de politique, communiqués et bulletins.", 3),
            ("etudes", "Études thématiques", "Études ciblées (rétention, formation, genre).", 4),
        ]
        cat_map = {}
        for code, nom, description, ordre in categories:
            cat, _ = CategoriePublication.objects.update_or_create(
                code=code,
                defaults={"nom": nom, "description": description, "ordre_affichage": ordre},
            )
            cat_map[code] = cat

        publications = [
            (
                "annuaire-rhs-benin-2025",
                "Annuaire statistique des RHS du Bénin 2025",
                Publication.TypePublication.ANNUAIRE_STATISTIQUE,
                "annuaires",
                2025,
                "Série officielle des effectifs, densités et répartitions territoriales des ressources humaines en santé.",
            ),
            (
                "bilan-orhs-2025",
                "Bilan annuel de l'ORHS Bénin 2025",
                Publication.TypePublication.RAPPORT_ANNUEL,
                "rapports",
                2025,
                "État d'avancement de l'observatoire, collecte, validation nationale et partenariats.",
            ),
            (
                "pdrhs-2024-2028",
                "Plan de développement des RHS 2024-2028",
                Publication.TypePublication.PLAN_STRATEGIQUE,
                "rapports",
                2024,
                "Orientations stratégiques du Ministère de la Santé pour la formation, le recrutement et la rétention.",
            ),
            (
                "note-densite-medicale-2026",
                "Note de politique : densité médicale et seuil OMS",
                Publication.TypePublication.NOTE_POLITIQUE,
                "notes",
                2026,
                "Écart aux 23 agents de santé qualifiés pour 10 000 habitants et priorités de recrutement.",
            ),
            (
                "bulletin-t1-2026",
                "Bulletin trimestriel ORHS — 1er trimestre 2026",
                Publication.TypePublication.BULLETIN_TRIMESTRIEL,
                "notes",
                2026,
                "Avancement de la collecte 2026, alertes de postes vacants et actualités partenariales.",
            ),
            (
                "etude-retention-zones-enclavees",
                "Étude : rétention du personnel dans les zones enclavées",
                Publication.TypePublication.ETUDE_THEMATIQUE,
                "etudes",
                2025,
                "Facteurs de départ des médecins et infirmiers en Atacora, Donga et Alibori.",
            ),
            (
                "communique-lancement-collecte-2026",
                "Communiqué : lancement de la collecte annuelle RHS 2026",
                Publication.TypePublication.COMMUNIQUE,
                "notes",
                2026,
                "Le secrétariat permanent de l'ORHS ouvre la campagne de déclaration auprès des structures.",
            ),
            (
                "rapport-genre-rhs-2025",
                "Rapport genre et RHS au Bénin 2025",
                Publication.TypePublication.RAPPORT_ANNUEL,
                "etudes",
                2025,
                "Part des femmes dans les effectifs, postes de responsabilité et formation spécialisée.",
            ),
        ]
        for slug, titre, typ, cat_code, annee, resume in publications:
            Publication.objects.update_or_create(
                slug=slug,
                defaults={
                    "titre": titre,
                    "type_publication": typ,
                    "categorie": cat_map[cat_code],
                    "resume": resume,
                    "contenu": (
                        f"{resume}\n\nDocument produit dans le cadre de l'Observatoire des ressources "
                        "humaines en santé du Bénin, sous tutelle du Ministère de la Santé. "
                        "Les indicateurs publiés ne retiennent que les déclarations validées au niveau national."
                    ),
                    "annee": annee,
                    "auteur": "Secrétariat permanent ORHS — Ministère de la Santé",
                    "mot_cles": "RHS, Bénin, ORHS, statistiques, santé",
                    "langue": "fr",
                    "publie": True,
                    "date_publication": now - timedelta(days=40),
                    "cree_par": admin,
                },
            )

        editorial = [
            (
                ContenuEditorial.TypeContenu.ACTUALITE,
                "Lancement officiel de la collecte annuelle RHS 2026",
                "Le Ministère de la Santé ouvre la campagne de déclaration des effectifs dans les 12 départements.",
                "actualite",
                "Cotonou",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.ACTUALITE,
                "Validation nationale des premières déclarations du Littoral et du Borgou",
                "Les dossiers du CHU-MEL et du CHUD Borgou-Alibori sont désormais intégrés aux statistiques officielles.",
                "actualite",
                "Cotonou",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.ACTUALITE,
                "Partenariat OMS-Bénin pour le renforcement du suivi NHWA",
                "L'OMS appuie l'alignement progressif des indicateurs ORHS sur les comptes nationaux des personnels de santé.",
                "actualite",
                "Cotonou",
                "OMS / Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.ACTUALITE,
                "Atelier DRH départementaux : qualité des données et délais de validation",
                "Les 12 points focaux DRH se sont accordés sur un calendrier unique de contrôle des déclarations 2026.",
                "actualite",
                "Porto-Novo",
                "Direction des ressources humaines",
            ),
            (
                ContenuEditorial.TypeContenu.ACTUALITE,
                "Publication de l'annuaire statistique RHS 2025",
                "L'annuaire est disponible dans le portail public : densités, professions et couverture territoriale.",
                "actualite",
                "Cotonou",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.ACTUALITE,
                "Cartographie sanitaire : les établissements privés et confessionnels entrent dans le dispositif",
                "La Clinique Le Bénin et l'Hôpital Saint-Jean-de-Dieu de Tanguiéta illustrent la couverture des trois secteurs.",
                "actualite",
                "Cotonou",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.EVENEMENT,
                "Journée nationale des ressources humaines en santé",
                "Rencontre annuelle des acteurs de la formation, de la collecte et de la planification RHS.",
                "agenda",
                "Palais des Congrès, Cotonou",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.EVENEMENT,
                "Comité de pilotage ORHS — session de juin 2026",
                "Examen des taux de réponse à la collecte et des postes vacants critiques.",
                "agenda",
                "Ministère de la Santé, Cotonou",
                "Secrétariat permanent ORHS",
            ),
            (
                ContenuEditorial.TypeContenu.EVENEMENT,
                "Forum formation sanitaire : INMeS, FSS et écoles privées",
                "Adéquation entre les flux de diplômés et les besoins exprimés par les zones sanitaires.",
                "agenda",
                "Campus d'Abomey-Calavi",
                "FSS / INMeS",
            ),
            (
                ContenuEditorial.TypeContenu.OPPORTUNITE,
                "Concours de recrutement d'infirmiers d'État — session 2026",
                "Le Ministère ouvre un concours national pour renforcer les hôpitaux de zone.",
                "concours",
                "Cotonou",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.OPPORTUNITE,
                "Recrutement de médecins généralistes pour les ZS du nord",
                "Postes budgétés en Atacora, Donga et Alibori, avec mesures d'accompagnement à l'installation.",
                "recrutement",
                "Natitingou",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.OPPORTUNITE,
                "Bourses de spécialisation OMS / Gouvernement du Bénin",
                "Gynécologie, anesthésie-réanimation et pédiatrie : dossier à déposer avant la clôture nationale.",
                "bourse",
                "Cotonou",
                "OMS / Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.OPPORTUNITE,
                "Appel à formateurs pour l'INMeS — filière sages-femmes",
                "L'institut recherche des cadres pédagogiques pour la rentrée académique 2026-2027.",
                "recrutement",
                "Cotonou",
                "INMeS",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Qui peut saisir une déclaration RHS ?",
                "Le point focal collecteur de la structure, dans le périmètre attribué par l'administrateur.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Quand une statistique devient-elle officielle ?",
                "Uniquement après validation nationale. Les brouillons et validations départementales ne sont pas publiés.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Comment sont traités les secteurs public, privé et confessionnel ?",
                "Les effectifs sectoriels proviennent des fiches agents. Les totaux de densité viennent des déclarations validées.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Un établissement privé doit-il déclarer ?",
                "Oui, dès qu'il est inscrit au référentiel. La Clinique Le Bénin illustre le circuit privé dans la collecte 2026.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Comment vérifier qu'un médecin est inscrit à l'Ordre ?",
                "Utilisez le module public de vérification de conformité (annuaire des Ordres nationaux).",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Les données individuelles des patients sont-elles collectées ?",
                "Non. L'ORHS ne collecte que des totaux agrégés de personnel et des fiches agents, jamais de dossiers patients.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Comment s'abonner à la newsletter ?",
                "Le formulaire d'abonnement se trouve en pied de page du site public. Un lien de désabonnement est envoyé à chaque inscription.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.FAQ,
                "Que faire en cas d'identifiants oubliés ?",
                "Les comptes sont attribués par l'administrateur de la plateforme. Contactez le secrétariat ORHS, ne créez pas de compte seul.",
                "faq",
                "",
                "ORHS Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.TEXTE_LEGAL,
                "Loi n° 2017-20 portant code du numérique en République du Bénin",
                "Cadre de protection des données et d'administration électronique applicable aux systèmes d'information publics.",
                "loi",
                "Cotonou",
                "Assemblée nationale",
            ),
            (
                ContenuEditorial.TypeContenu.TEXTE_LEGAL,
                "Décret portant organisation du Ministère de la Santé",
                "Fixe les attributions des directions centrales, des DDS et le rattachement de l'observatoire RHS.",
                "decret",
                "Cotonou",
                "Présidence de la République",
            ),
            (
                ContenuEditorial.TypeContenu.TEXTE_LEGAL,
                "Plan national de développement sanitaire (PNDS)",
                "Document d'orientation des investissements et des ressources humaines du système de santé.",
                "politique",
                "Cotonou",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.TEXTE_LEGAL,
                "Arrêté portant création de l'Observatoire des RHS",
                "Institutionnalise la collecte, la validation et la diffusion des statistiques de personnel de santé.",
                "arrete",
                "Cotonou",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.TEXTE_LEGAL,
                "Code de déontologie des médecins du Bénin",
                "Règles d'exercice, d'inscription à l'Ordre et de sanctions disciplinaires.",
                "deontologie",
                "Cotonou",
                "Ordre national des médecins du Bénin",
            ),
            (
                ContenuEditorial.TypeContenu.TEXTE_LEGAL,
                "Comptes nationaux des personnels de santé (NHWA) — cadre OMS",
                "Référentiel international vers lequel l'ORHS aligne progressivement ses indicateurs.",
                "international",
                "Genève / Cotonou",
                "OMS",
            ),
            (
                ContenuEditorial.TypeContenu.FORMATION,
                "Faculté des sciences de la santé (FSS) — Université d'Abomey-Calavi",
                "Formation des médecins, pharmaciens et odontologistes.",
                "universite",
                "Abomey-Calavi",
                "UAC / FSS",
            ),
            (
                ContenuEditorial.TypeContenu.FORMATION,
                "Institut national médico-sanitaire (INMeS)",
                "Formation des infirmiers, sages-femmes et techniciens de santé.",
                "institut",
                "Cotonou",
                "INMeS",
            ),
            (
                ContenuEditorial.TypeContenu.FORMATION,
                "École nationale de formation des techniciens supérieurs en santé",
                "Filières laboratoire, imagerie et maintenance biomédicale.",
                "ecole",
                "Porto-Novo",
                "Ministère de la Santé",
            ),
            (
                ContenuEditorial.TypeContenu.FORMATION,
                "Faculté de médecine de Parakou",
                "Formation médicale pour le nord du pays, stages au CHUD Borgou-Alibori.",
                "universite",
                "Parakou",
                "Université de Parakou",
            ),
            (
                ContenuEditorial.TypeContenu.FORMATION,
                "Institut de formation en soins infirmiers — Tanguiéta",
                "Appui à la formation en zone rurale, partenariat Hôpital Saint-Jean-de-Dieu.",
                "institut",
                "Tanguiéta",
                "HSJD / partenaires",
            ),
        ]
        for index, (typ, titre, resume, categorie, lieu, organisation) in enumerate(editorial):
            slug = slugify(titre)[:290]
            defaults = {
                "type_contenu": typ,
                "titre": titre,
                "resume": resume,
                "contenu": f"{resume}\n\nInformation publiée par l'ORHS Bénin à des fins d'information du public et des partenaires institutionnels.",
                "categorie": categorie,
                "lieu": lieu,
                "organisation": organisation,
                "annee": 2026,
                "publie": True,
                "date_publication": now - timedelta(days=8 + index),
                "cree_par": admin,
            }
            if typ == ContenuEditorial.TypeContenu.EVENEMENT:
                defaults["date_debut"] = date(2026, 6, 12) + timedelta(days=index)
                defaults["date_fin"] = defaults["date_debut"] + timedelta(days=1)
            if typ == ContenuEditorial.TypeContenu.OPPORTUNITE:
                defaults["date_fin"] = date(2026, 9, 30)
            ContenuEditorial.objects.update_or_create(slug=slug, defaults=defaults)

    def _annuaire(self):
        medecins = [
            ("Dr Adéoti Marie-Claire", "ONMB-2014-1182", "Gynécologie-obstétrique", "Littoral", "Cotonou", "CHU-MEL"),
            ("Dr Hounsou Jean-Baptiste", "ONMB-2016-0844", "Médecine générale", "Littoral", "Cotonou", "CHU-MEL"),
            ("Dr Bio Issa", "ONMB-2015-0621", "Pédiatrie", "Borgou", "Parakou", "CHUD Borgou-Alibori"),
            ("Dr Mensah Koffi", "ONMB-2011-0330", "Chirurgie générale", "Littoral", "Cotonou", "Clinique Le Bénin"),
            ("Dr Yarca Paul", "ONMB-2009-0198", "Chirurgie viscérale", "Atacora", "Tanguiéta", "HSJD Tanguiéta"),
            ("Dr Dossou-Yovo Aimée", "ONMB-2018-1502", "Anesthésie-réanimation", "Ouémé", "Porto-Novo", "CHUD Ouémé-Plateau"),
            ("Dr Sero Ramatou", "ONMB-2017-1290", "Médecine générale", "Borgou", "Parakou", "HZ Parakou"),
            ("Dr Agossou Lucien", "ONMB-2013-0711", "Cardiologie", "Littoral", "Cotonou", "CNHU-HKM"),
            ("Dr Tchibozo Nadège", "ONMB-2019-1774", "Pédiatrie", "Atlantique", "Abomey-Calavi", "Cabinet privé"),
            ("Dr Kassa Pierre", "ONMB-2012-0440", "Santé publique", "Zou", "Abomey", "DDS Zou"),
            ("Dr Lawani Fatou", "ONMB-2020-2011", "Médecine générale", "Mono", "Lokossa", "HZ Lokossa"),
            ("Dr Amoussou Gilles", "ONMB-2010-0255", "Ophtalmologie", "Littoral", "Cotonou", "Cabinet d'ophtalmologie"),
        ]
        for nom, numero, specialite, dept, commune, lieu in medecins:
            InscriptionOrdre.objects.update_or_create(
                numero_inscription=numero,
                defaults={
                    "type_entree": InscriptionOrdre.TypeEntree.MEDECIN,
                    "nom": nom,
                    "ordre": "Ordre National des Médecins du Bénin",
                    "specialite": specialite,
                    "departement": dept,
                    "commune": commune,
                    "statut": InscriptionOrdre.Statut.INSCRIT,
                    "inscrit_depuis": date(2014, 3, 1),
                    "titre": "Dr",
                    "nationalite": "Béninoise",
                    "universite": "Université d'Abomey-Calavi — FSS",
                    "annee_diplome": 2012,
                    "mode_exercice": "salarie",
                    "lieu_exercice": lieu,
                    "publie": True,
                },
            )
        cliniques = [
            ("Clinique Le Bénin", "MS-CLIN-0412", "Littoral", "Cotonou", "Dr Mensah Koffi", "MS/SG/0412", 32),
            ("Polyclinique Les Cocotiers", "MS-CLIN-0088", "Littoral", "Cotonou", "Dr Agossou Lucien", "MS/SG/0088", 48),
            ("Clinique de l'Amitié", "MS-CLIN-0219", "Ouémé", "Porto-Novo", "Dr Dossou-Yovo Aimée", "MS/SG/0219", 24),
            ("Centre médical Saint-Camille", "MS-CLIN-0301", "Atlantique", "Abomey-Calavi", "Dr Tchibozo Nadège", "MS/SG/0301", 18),
            ("Hôpital Saint-Jean-de-Dieu de Tanguiéta", "MS-CLIN-0007", "Atacora", "Tanguiéta", "Dr Yarca Paul", "MS/SG/0007", 120),
        ]
        for nom, numero, dept, commune, directeur, autorisation, lits in cliniques:
            InscriptionOrdre.objects.update_or_create(
                numero_inscription=numero,
                defaults={
                    "type_entree": InscriptionOrdre.TypeEntree.CLINIQUE,
                    "nom": nom,
                    "ordre": "Ministère de la Santé — autorisation d'ouverture",
                    "departement": dept,
                    "commune": commune,
                    "statut": InscriptionOrdre.Statut.INSCRIT,
                    "directeur": directeur,
                    "numero_autorisation": autorisation,
                    "lits": lits,
                    "lieu_exercice": nom,
                    "publie": True,
                },
            )
        InscriptionOrdre.objects.update_or_create(
            numero_inscription="ONMB-2004-SUSP",
            defaults={
                "type_entree": InscriptionOrdre.TypeEntree.MEDECIN,
                "nom": "Dr Exemple suspension (dossier disciplinaire)",
                "ordre": "Ordre National des Médecins du Bénin",
                "specialite": "Médecine générale",
                "departement": "Littoral",
                "commune": "Cotonou",
                "statut": InscriptionOrdre.Statut.SUSPENDU,
                "publie": True,
            },
        )
