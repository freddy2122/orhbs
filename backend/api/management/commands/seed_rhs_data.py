from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    AgentSante,
    CampagneCollecte,
    DeclarationRHS,
    Departement,
    Structure,
    UserProfile,
    ZoneSanitaire,
)

DEPARTEMENTS = [
    ("alibori", "Alibori", 968_000),
    ("atacora", "Atacora", 969_000),
    ("atlantique", "Atlantique", 1_364_000),
    ("borgou", "Borgou", 1_155_000),
    ("collines", "Collines", 717_000),
    ("couffo", "Couffo", 741_000),
    ("donga", "Donga", 543_000),
    ("littoral", "Littoral", 678_000),
    ("mono", "Mono", 495_000),
    ("oueme", "Ouémé", 1_122_000),
    ("plateau", "Plateau", 624_000),
    ("zou", "Zou", 851_000),
]

# (code, nom, type, dept_code, medecins base multiplier index)
STRUCTURES_TEMPLATE = [
    ("chu-mel", "CHU-MEL Cotonou", Structure.TypeStructure.CHU, "littoral", 3.5),
    ("cnhu", "CNHU Hubert Koutoukou Maga", Structure.TypeStructure.CNHU, "littoral", 2.8),
    ("hz-cotonou", "HZ Cotonou", Structure.TypeStructure.HZ, "littoral", 1.8),
    ("hz-parakou", "HZ Parakou", Structure.TypeStructure.HZ, "borgou", 1.6),
    ("hz-natitingou", "HZ Natitingou", Structure.TypeStructure.HZ, "atacora", 1.2),
    ("hz-abomey", "HZ Abomey", Structure.TypeStructure.HZ, "zou", 1.3),
    ("hz-lokossa", "HZ Lokossa", Structure.TypeStructure.HZ, "mono", 1.1),
    ("hz-porto-novo", "HZ Porto-Novo", Structure.TypeStructure.HZ, "oueme", 1.5),
    ("hz-kandi", "HZ Kandi", Structure.TypeStructure.HZ, "alibori", 1.0),
    ("dds-littoral", "DDS Littoral", Structure.TypeStructure.DIRECTION, "littoral", 0.2),
    ("dds-borgou", "DDS Borgou", Structure.TypeStructure.DIRECTION, "borgou", 0.2),
]

DEPT_HZ = {
    "alibori": ("hz-kandi", "HZ Kandi"),
    "atacora": ("hz-natitingou", "HZ Natitingou"),
    "atlantique": ("hz-allada", "HZ Allada"),
    "borgou": ("hz-parakou", "HZ Parakou"),
    "collines": ("hz-dassa", "HZ Dassa-Zoumè"),
    "couffo": ("hz-aplahoue", "HZ Aplahoué"),
    "donga": ("hz-djougou", "HZ Djougou"),
    "littoral": ("hz-cotonou", "HZ Cotonou"),
    "mono": ("hz-lokossa", "HZ Lokossa"),
    "oueme": ("hz-porto-novo", "HZ Porto-Novo"),
    "plateau": ("hz-pobe", "HZ Pobè"),
    "zou": ("hz-abomey", "HZ Abomey"),
}


class Command(BaseCommand):
    help = "Initialise zones sanitaires, structures et déclarations RHS de démonstration."

    def handle(self, *args, **options):
        dept_map = {}
        for code, nom, pop in DEPARTEMENTS:
            dept, _ = Departement.objects.update_or_create(
                code=code,
                defaults={"nom": nom, "population": pop},
            )
            dept_map[code] = dept

        zone_map = {}
        for code, nom, pop in DEPARTEMENTS:
            zone_code = f"zs-{code}"
            zone, _ = ZoneSanitaire.objects.update_or_create(
                code=zone_code,
                defaults={"nom": f"Zone sanitaire {nom}", "departement": dept_map[code]},
            )
            zone_map[code] = zone
            zone_code2 = f"zs-{code}-2"
            zone2, _ = ZoneSanitaire.objects.update_or_create(
                code=zone_code2,
                defaults={
                    "nom": f"Zone sanitaire {nom} — Nord",
                    "departement": dept_map[code],
                },
            )
            zone_map[f"{code}-2"] = zone2

        struct_map = {}
        for code, nom, typ, dept_code, _ in STRUCTURES_TEMPLATE:
            structure, _ = Structure.objects.update_or_create(
                code=code,
                defaults={
                    "nom": nom,
                    "type_structure": typ,
                    "departement": dept_map[dept_code],
                    "zone_sanitaire": zone_map[dept_code],
                },
            )
            struct_map[code] = structure

        for dept_code, (hz_code, hz_nom) in DEPT_HZ.items():
            if hz_code in struct_map:
                continue
            structure, _ = Structure.objects.update_or_create(
                code=hz_code,
                defaults={
                    "nom": hz_nom,
                    "type_structure": Structure.TypeStructure.HZ,
                    "departement": dept_map[dept_code],
                    "zone_sanitaire": zone_map[dept_code],
                },
            )
            struct_map[hz_code] = structure

            cs_code = f"cs-{dept_code}-1"
            cs, _ = Structure.objects.update_or_create(
                code=cs_code,
                defaults={
                    "nom": f"CS {dept_map[dept_code].nom} Centre",
                    "type_structure": Structure.TypeStructure.CS,
                    "departement": dept_map[dept_code],
                    "zone_sanitaire": zone_map[dept_code],
                },
            )
            struct_map[cs_code] = cs

            cscom_code = f"cscom-{dept_code}-1"
            cscom, _ = Structure.objects.update_or_create(
                code=cscom_code,
                defaults={
                    "nom": f"CSCOM {dept_map[dept_code].nom} Rural",
                    "type_structure": Structure.TypeStructure.CSCOM,
                    "departement": dept_map[dept_code],
                    "zone_sanitaire": zone_map.get(f"{dept_code}-2", zone_map[dept_code]),
                },
            )
            struct_map[cscom_code] = cscom

        chu_mel = struct_map.get("chu-mel")
        if chu_mel:
            User.objects.filter(username="collecteur.chu-mel").update()
            profile = UserProfile.objects.filter(user__username="collecteur.chu-mel").first()
            if profile:
                profile.structure = chu_mel
                profile.departement = chu_mel.departement
                profile.save()

        today = date.today()
        campagne, _ = CampagneCollecte.objects.update_or_create(
            code="collecte-2026",
            defaults={
                "libelle": "Collecte annuelle RHS 2026",
                "annee": 2026,
                "periode": "Annuelle",
                "date_debut": today - timedelta(days=60),
                "date_fin": today + timedelta(days=120),
                "active": True,
            },
        )

        validateur = User.objects.filter(username="validateur").first()
        now = timezone.now()
        created_count = 0

        for idx, (dept_code, dept) in enumerate(dept_map.items()):
            dept_structures = Structure.objects.filter(departement=dept, actif=True).exclude(
                type_structure=Structure.TypeStructure.DIRECTION
            )
            base_med = 45 + (idx * 7) % 120
            for s_idx, structure in enumerate(dept_structures):
                if structure.type_structure == Structure.TypeStructure.CHU:
                    med, inf, sf = 180 + s_idx * 5, 620, 95
                    total = med + inf + sf + 340
                elif structure.type_structure == Structure.TypeStructure.HZ:
                    med = base_med + s_idx * 3
                    inf = med * 4 + 20
                    sf = max(8, med // 2)
                    total = med + inf + sf + 30
                elif structure.type_structure == Structure.TypeStructure.CSCOM:
                    med = max(2, base_med // 10)
                    inf = med * 3 + 5
                    sf = max(2, med)
                    total = med + inf + sf + 4
                else:
                    med = max(5, base_med // 4)
                    inf = med * 3 + 10
                    sf = max(4, med // 2)
                    total = med + inf + sf + 15

                femmes = int(total * 0.55)
                statut = DeclarationRHS.Statut.VALIDE_NATIONAL
                if dept_code in ("alibori", "atacora") and s_idx % 2 == 0:
                    statut = DeclarationRHS.Statut.SOUMIS
                elif dept_code == "couffo" and structure.type_structure == Structure.TypeStructure.CSCOM:
                    statut = DeclarationRHS.Statut.VALIDE_DEPARTEMENT

                decl, created = DeclarationRHS.objects.update_or_create(
                    campagne=campagne,
                    structure=structure,
                    defaults={
                        "statut": statut,
                        "effectif_total": total,
                        "medecins": med,
                        "infirmiers": inf,
                        "sages_femmes": sf,
                        "dont_femmes": femmes,
                        "postes_budgetes": total + max(2, s_idx % 5),
                        "postes_pourvus": total,
                        "postes_vacants": max(0, (s_idx % 4) + (idx % 3)),
                        "departs_retraite_6_mois": max(0, s_idx % 3),
                        "departs_retraite_12_mois": max(0, (s_idx + 1) % 4),
                        "date_soumission": now - timedelta(days=10 - s_idx),
                        "date_valide_dept": now - timedelta(days=5 - s_idx)
                        if statut
                        in (
                            DeclarationRHS.Statut.VALIDE_DEPARTEMENT,
                            DeclarationRHS.Statut.VALIDE_NATIONAL,
                        )
                        else None,
                        "date_valide_national": now - timedelta(days=2)
                        if statut == DeclarationRHS.Statut.VALIDE_NATIONAL
                        else None,
                        "valide_national_par": validateur if statut == DeclarationRHS.Statut.VALIDE_NATIONAL else None,
                    },
                )
                if created:
                    created_count += 1

        sample_agents = [
            ("MS-2012-45821", "Agossa", "Jean-Baptiste", "M", "Médecin spécialiste", "chu-mel", 120, "Cardiologie"),
            ("MS-2015-38492", "Diallo", "Fatou", "F", "Médecin spécialiste", "hz-parakou", 90, "Pédiatrie"),
            ("MS-2008-22104", "Hounkpatin", "Emmanuel", "M", "Infirmier(ère) d'État", "chu-mel", 180, ""),
            ("MS-2020-61033", "Toko", "Marie", "F", "Sage-femme", "hz-abomey", 200, ""),
            ("MS-2018-77201", "Kpadonou", "Clarisse", "F", "Infirmier(ère) d'État", "cs-littoral-1", 150, ""),
            ("MS-2011-33902", "Sossa", "Paul", "M", "Pharmacien", "hz-cotonou", 365, ""),
            ("MS-2019-88410", "Aïdé", "Rachida", "F", "Technicien de laboratoire", "hz-porto-novo", 300, ""),
            ("MS-2005-11298", "Gbedo", "Victor", "M", "Agent de santé communautaire", "cscom-borgou-1", 60, ""),
        ]
        agent_count = 0
        chu = struct_map.get("chu-mel") or Structure.objects.filter(code="chu-mel").first()
        for matricule, nom, prenom, sexe, profession, struct_code, retraite_jours, specialite in sample_agents:
            structure = struct_map.get(struct_code) or Structure.objects.filter(code=struct_code).first()
            if not structure:
                structure = chu
            if not structure:
                continue
            _, created = AgentSante.objects.update_or_create(
                campagne=campagne,
                matricule=matricule,
                defaults={
                    "structure": structure,
                    "nom": nom,
                    "prenom": prenom,
                    "sexe": sexe,
                    "profession": profession,
                    "grade": profession,
                    "specialite": specialite,
                    "secteur": AgentSante.Secteur.PUBLIC,
                    "statut_agent": AgentSante.StatutAgent.ACTIF,
                    "type_contrat": AgentSante.TypeContrat.PERMANENT,
                    "poste_occupe": profession,
                    "diplome_principal": f"Diplôme {profession}",
                    "ecole_formation": "École nationale de santé publique",
                    "annee_diplome": 2010 + (int(matricule[-2:]) % 10),
                    "depart_retraite_prevu": today + timedelta(days=retraite_jours),
                    "nationalite": "Béninoise",
                    "source_fichier": "seed_rhs_data",
                },
            )
            if created:
                agent_count += 1

        self.stdout.write(self.style.SUCCESS("Données RHS initialisées."))
        self.stdout.write(f"  Départements : {len(dept_map)}")
        self.stdout.write(f"  Zones sanitaires : {ZoneSanitaire.objects.count()}")
        self.stdout.write(f"  Structures : {Structure.objects.count()}")
        self.stdout.write(f"  Déclarations : {DeclarationRHS.objects.count()} ({created_count} nouvelles)")
        self.stdout.write(f"  Agents santé : {AgentSante.objects.count()} ({agent_count} nouveaux)")
