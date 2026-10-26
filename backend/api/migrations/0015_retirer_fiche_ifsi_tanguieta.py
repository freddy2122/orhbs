from django.db import migrations

SLUG = "institut-de-formation-en-soins-infirmiers-tanguieta"


def retirer_fiche(apps, schema_editor):
    apps.get_model("api", "ContenuEditorial").objects.filter(
        slug=SLUG, type_contenu="formation"
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("api", "0014_workflow_editorial")]

    operations = [migrations.RunPython(retirer_fiche, migrations.RunPython.noop)]
