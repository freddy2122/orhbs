from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from api.models import PasswordHistory, UserProfile

User = get_user_model()

# Empreintes (pbkdf2) de mots de passe aléatoires remis hors dépôt au responsable de la plateforme.
# Les comptes ne sont créés que s'ils n'existent pas : un compte existant n'est jamais modifié.
COMPTES = [
    {
        "username": "redacteur",
        "first_name": "Rédacteur",
        "last_name": "ORHS",
        "role": UserProfile.Role.REDACTEUR,
        "poste": "Rédaction — site public",
        "password_hash": "pbkdf2_sha256$600000$Fj3i4Sxm6qpGoU6YDULyV8$Be7hjwb6nnDRfWPwv3dzdLhzEvoKFu4TguBF+kBoG20=",
    },
    {
        "username": "coordination.relecture",
        "first_name": "Relecteur",
        "last_name": "ORHS",
        "role": UserProfile.Role.COORDINATION,
        "poste": "Second relecteur éditorial",
        "password_hash": "pbkdf2_sha256$600000$jKuMCdXK6LzCIr3SbVHGH2$7RuSVqY9cAYey1cPrb5ZTbdTkEbwfcOSWXIQdpphhk0=",
    },
]


class Command(BaseCommand):
    help = "Crée les comptes de rédaction et de relecture manquants (sans toucher aux comptes existants)."

    def handle(self, *args, **options):
        for spec in COMPTES:
            if User.objects.filter(username=spec["username"]).exists():
                self.stdout.write(f"Compte {spec['username']} déjà présent, ignoré.")
                continue
            user = User.objects.create(
                username=spec["username"],
                first_name=spec["first_name"],
                last_name=spec["last_name"],
                password=spec["password_hash"],
            )
            UserProfile.objects.create(
                user=user,
                role=spec["role"],
                scope=UserProfile.Scope.NATIONAL,
                poste=spec["poste"],
            )
            PasswordHistory.objects.create(user=user, password_hash=spec["password_hash"])
            self.stdout.write(self.style.SUCCESS(f"Compte {spec['username']} créé."))
