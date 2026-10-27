from django.db import migrations
from django.utils import timezone

TITRE = "IRSP-CAQ — Institut Régional de Santé Publique"
SLUG = "irsp-caq-institut-regional-de-sante-publique"
RESUME = "Institut régional de formation en santé publique, situé à Ouidah."


def ajouter_irsp(apps, schema_editor):
    apps.get_model("api", "ContenuEditorial").objects.get_or_create(
        slug=SLUG,
        defaults={
            "type_contenu": "formation",
            "titre": TITRE,
            "resume": RESUME,
            "contenu": f"{RESUME}\n\nInformation publiée par l'ORHS Bénin à des fins d'information du public et des partenaires institutionnels.",
            "categorie": "institut",
            "lieu": "Ouidah",
            "organisation": "IRSP-CAQ",
            "annee": 2026,
            "publie": True,
            "statut": "publie",
            "date_publication": timezone.now(),
        },
    )


class Migration(migrations.Migration):
    dependencies = [("api", "0019_ajouter_ifsio")]

    operations = [migrations.RunPython(ajouter_irsp, migrations.RunPython.noop)]
