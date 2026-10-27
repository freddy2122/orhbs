from django.db import migrations
from django.utils import timezone

TITRE = "Institut de Formation en Soins Infirmiers et Obstétricaux (IFSIO)"
SLUG = "institut-de-formation-en-soins-infirmiers-et-obstetricaux-ifsio"
RESUME = "Formation en soins infirmiers et obstétricaux, située à Parakou."


def ajouter_ifsio(apps, schema_editor):
    apps.get_model("api", "ContenuEditorial").objects.get_or_create(
        slug=SLUG,
        defaults={
            "type_contenu": "formation",
            "titre": TITRE,
            "resume": RESUME,
            "contenu": f"{RESUME}\n\nInformation publiée par l'ORHS Bénin à des fins d'information du public et des partenaires institutionnels.",
            "categorie": "institut",
            "lieu": "Parakou",
            "organisation": "IFSIO",
            "annee": 2026,
            "publie": True,
            "statut": "publie",
            "date_publication": timezone.now(),
        },
    )


class Migration(migrations.Migration):
    dependencies = [("api", "0018_retirer_fiche_ecole_techniciens")]

    operations = [migrations.RunPython(ajouter_ifsio, migrations.RunPython.noop)]
