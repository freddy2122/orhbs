from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_categoriepublication_publication_configalerte_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='departement',
            name='actif',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='zonesanitaire',
            name='actif',
            field=models.BooleanField(default=True),
        ),
    ]
