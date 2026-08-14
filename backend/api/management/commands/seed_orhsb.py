from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.models import Departement, Structure, UserProfile

DEPARTEMENTS = [
    ("alibori", "Alibori"),
    ("atacora", "Atacora"),
    ("atlantique", "Atlantique"),
    ("borgou", "Borgou"),
    ("collines", "Collines"),
    ("couffo", "Couffo"),
    ("donga", "Donga"),
    ("littoral", "Littoral"),
    ("mono", "Mono"),
    ("oueme", "Ouémé"),
    ("plateau", "Plateau"),
    ("zou", "Zou"),
]

STRUCTURES = [
    ("chu-mel", "CHU-MEL Cotonou", "CHU", "littoral"),
    ("hz-parakou", "HZ Parakou", "HZ", "borgou"),
]

DEFAULT_PASSWORD = "Orhsb2026!"

USERS = [
    {
        "username": "admin",
        "first_name": "Admin",
        "last_name": "Système",
        "email": "admin@orhsb.bj",
        "role": UserProfile.Role.ADMIN,
        "scope": UserProfile.Scope.NATIONAL,
        "poste": "Administrateur technique",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "coordination",
        "first_name": "Marie",
        "last_name": "Adéoti",
        "email": "coordination@orhsb.bj",
        "role": UserProfile.Role.COORDINATION,
        "scope": UserProfile.Scope.NATIONAL,
        "poste": "Secrétariat permanent ORHS",
    },
    {
        "username": "analyste",
        "first_name": "Koffi",
        "last_name": "Mensah",
        "email": "analyste@orhsb.bj",
        "role": UserProfile.Role.ANALYSTE,
        "scope": UserProfile.Scope.NATIONAL,
        "poste": "Analyste statisticien",
    },
    {
        "username": "validateur",
        "first_name": "Fatou",
        "last_name": "Bio",
        "email": "validateur@orhsb.bj",
        "role": UserProfile.Role.VALIDATEUR,
        "scope": UserProfile.Scope.NATIONAL,
        "poste": "Contrôle qualité ORHS (national)",
    },
    {
        "username": "dds.borgou",
        "first_name": "Issa",
        "last_name": "Sanou",
        "email": "dds.borgou@orhsb.bj",
        "role": UserProfile.Role.VALIDATEUR,
        "scope": UserProfile.Scope.DEPARTEMENTAL,
        "departement": "borgou",
        "poste": "DDS Borgou",
    },
    {
        "username": "collecteur.chu-mel",
        "first_name": "Grace",
        "last_name": "Houédanou",
        "email": "chu-mel@orhsb.bj",
        "role": UserProfile.Role.COLLECTEUR,
        "scope": UserProfile.Scope.STRUCTURE,
        "structure": "chu-mel",
        "poste": "Point focal CHU-MEL",
    },
    {
        "username": "decideur",
        "first_name": "Directeur",
        "last_name": "Général",
        "email": "decideur@ms.bj",
        "role": UserProfile.Role.DECIDEUR,
        "scope": UserProfile.Scope.NATIONAL,
        "poste": "Direction générale MS",
    },
    {
        "username": "partenaire.who",
        "first_name": "Partenaire",
        "last_name": "OMS",
        "email": "who@partenaire.bj",
        "role": UserProfile.Role.PARTENAIRE,
        "scope": UserProfile.Scope.NATIONAL,
        "organisation": "Organisation mondiale de la Santé",
        "poste": "Accès recherche",
    },
]

# Un compte DRH départemental par département (validateur + périmètre départemental)
DRH_ACCOUNTS = [
    ("alibori", "DRH Alibori"),
    ("atacora", "DRH Atacora"),
    ("atlantique", "DRH Atlantique"),
    ("borgou", "DRH Borgou"),
    ("collines", "DRH Collines"),
    ("couffo", "DRH Couffo"),
    ("donga", "DRH Donga"),
    ("littoral", "DRH Littoral"),
    ("mono", "DRH Mono"),
    ("oueme", "DRH Ouémé"),
    ("plateau", "DRH Plateau"),
    ("zou", "DRH Zou"),
]


class Command(BaseCommand):
    help = "Initialise départements, structures et comptes ORHS de démonstration."

    def handle(self, *args, **options):
        dept_map = {}
        for code, nom in DEPARTEMENTS:
            dept, _ = Departement.objects.update_or_create(
                code=code,
                defaults={"nom": nom},
            )
            dept_map[code] = dept

        struct_map = {}
        for code, nom, type_structure, dept_code in STRUCTURES:
            structure, _ = Structure.objects.update_or_create(
                code=code,
                defaults={
                    "nom": nom,
                    "type_structure": type_structure,
                    "departement": dept_map[dept_code],
                },
            )
            struct_map[code] = structure

        for spec in USERS:
            user, created = User.objects.update_or_create(
                username=spec["username"],
                defaults={
                    "email": spec["email"],
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "is_staff": spec.get("is_staff", False),
                    "is_superuser": spec.get("is_superuser", False),
                },
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()

            profile_defaults = {
                "role": spec["role"],
                "scope": spec["scope"],
                "poste": spec.get("poste", ""),
                "organisation": spec.get("organisation", ""),
                "departement": dept_map.get(spec.get("departement", "")),
                "structure": struct_map.get(spec.get("structure", "")),
            }
            UserProfile.objects.update_or_create(
                user=user,
                defaults=profile_defaults,
            )

        for dept_code, poste_label in DRH_ACCOUNTS:
            if dept_code == "borgou":
                continue  # déjà couvert par dds.borgou
            username = f"drh.{dept_code}"
            dept = dept_map.get(dept_code)
            if not dept:
                continue
            user, created = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": f"{username}@orhsb.bj",
                    "first_name": "Responsable",
                    "last_name": dept.nom,
                },
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    "role": UserProfile.Role.VALIDATEUR,
                    "scope": UserProfile.Scope.DEPARTEMENTAL,
                    "poste": poste_label,
                    "departement": dept,
                },
            )

        self.stdout.write(self.style.SUCCESS("Données ORHS initialisées."))
        self.stdout.write(f"Mot de passe par défaut : {DEFAULT_PASSWORD}")
        self.stdout.write("Comptes nationaux : admin, coordination, analyste, validateur,")
        self.stdout.write("                    decideur, partenaire.who")
        self.stdout.write("Comptes départementaux DRH : drh.littoral, drh.oueme, drh.zou… (12 dépts)")
        self.stdout.write("Comptes terrain : dds.borgou, collecteur.chu-mel")
