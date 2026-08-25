from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_rh_complet_oms_pdf"),
    ]

    operations = [
        migrations.AddField(
            model_name="agentsante",
            name="salaire",
            field=models.PositiveIntegerField(blank=True, help_text="Rémunération mensuelle en FCFA.", null=True),
        ),
        migrations.AddField(
            model_name="agentsante",
            name="date_debut_conge",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="agentsante",
            name="date_fin_conge",
            field=models.DateField(blank=True, null=True),
        ),
    ]
