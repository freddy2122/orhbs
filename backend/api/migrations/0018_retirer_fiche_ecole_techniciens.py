from django.db import migrations

SLUG = "ecole-nationale-de-formation-des-techniciens-superieurs-en-sante"


def retirer_fiche(apps, schema_editor):
    apps.get_model("api", "ContenuEditorial").objects.filter(
        slug=SLUG, type_contenu="formation"
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("api", "0017_securite_comptes")]

    operations = [migrations.RunPython(retirer_fiche, migrations.RunPython.noop)]
