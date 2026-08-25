from datetime import date, timedelta

from django.core.management.base import BaseCommand
from api.models import (
    AgentSante,
    CampagneCollecte,
    Departement,
    Structure,
    UserProfile,
    ZoneSanitaire,
)
from api.referentiel_benin import (
    DEPARTEMENTS,
    STRUCTURES_NATIONALES,
    ZONES_SANITAIRES,
    structures_operationnelles,
)


class Command(BaseCommand):
    help = "Charge le référentiel territorial (12 départements, 34 zones, structures) et une campagne active."

    def handle(self, *args, **options):
        dept_map = {}
        for code, nom, pop in DEPARTEMENTS:
            dept, _ = Departement.objects.update_or_create(
                code=code,
                defaults={"nom": nom, "population": pop, "actif": True},
            )
            dept_map[code] = dept

        official_zone_codes = {code for code, _, _ in ZONES_SANITAIRES}
        zone_map = {}
        for code, nom, dept_code in ZONES_SANITAIRES:
            zone, _ = ZoneSanitaire.objects.update_or_create(
                code=code,
                defaults={"nom": nom, "departement": dept_map[dept_code], "actif": True},
            )
            zone_map[code] = zone

        deactivated_zones = ZoneSanitaire.objects.exclude(code__in=official_zone_codes).update(actif=False)

        official_struct_codes = set()
        struct_map = {}

        def upsert_structure(code, nom, typ, dept_code, zone_code):
            official_struct_codes.add(code)
            structure, _ = Structure.objects.update_or_create(
                code=code,
                defaults={
                    "nom": nom,
                    "type_structure": typ,
                    "departement": dept_map[dept_code],
                    "zone_sanitaire": zone_map.get(zone_code) if zone_code else None,
                    "actif": True,
                },
            )
            struct_map[code] = structure
            return structure

        for code, nom, typ, dept_code, zone_code in STRUCTURES_NATIONALES:
            upsert_structure(code, nom, typ, dept_code, zone_code)

        for code, nom, typ, dept_code, zone_code in structures_operationnelles():
            upsert_structure(code, nom, typ, dept_code, zone_code)

        deactivated_structs = Structure.objects.exclude(code__in=official_struct_codes).update(actif=False)

        chu_mel = struct_map.get("chu-mel")
        if chu_mel:
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

        purged_agents, _ = AgentSante.objects.filter(source_fichier="seed_rhs_data").delete()

        self.stdout.write(self.style.SUCCESS("Référentiel territorial chargé."))
        self.stdout.write(f"  Départements : {Departement.objects.filter(actif=True).count()}")
        self.stdout.write(f"  Zones sanitaires : {ZoneSanitaire.objects.filter(actif=True).count()}")
        self.stdout.write(f"  Structures actives : {Structure.objects.filter(actif=True).count()}")
        if deactivated_zones:
            self.stdout.write(f"  Anciennes zones désactivées : {deactivated_zones}")
        if deactivated_structs:
            self.stdout.write(f"  Anciennes structures désactivées : {deactivated_structs}")
        if purged_agents:
            self.stdout.write(f"  Agents fictifs retirés : {purged_agents}")
