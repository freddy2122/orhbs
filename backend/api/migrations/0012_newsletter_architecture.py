from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0011_agentsante_salaire_conge"),
    ]

    operations = [
        migrations.AddField(
            model_name="abonnenewsletter",
            name="date_desabonnement",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="abonnenewsletter",
            name="source",
            field=models.CharField(
                choices=[("site", "Site public"), ("admin", "Administration")],
                default="site",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="abonnenewsletter",
            name="token_desabonnement",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddField(
            model_name="abonnenewsletter",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.CreateModel(
            name="CampagneNewsletter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sujet", models.CharField(max_length=200)),
                ("corps", models.TextField()),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("brouillon", "Brouillon"),
                            ("file", "En file d'envoi"),
                            ("envoye", "Envoyée"),
                            ("annule", "Annulée"),
                        ],
                        default="brouillon",
                        max_length=20,
                    ),
                ),
                ("destinataires_prevus", models.PositiveIntegerField(default=0)),
                ("envoyes", models.PositiveIntegerField(default=0)),
                ("erreurs", models.PositiveIntegerField(default=0)),
                ("date_envoi", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="campagnes_newsletter",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Campagne newsletter",
                "verbose_name_plural": "Campagnes newsletter",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="EnvoiNewsletter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254)),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("en_attente", "En attente"),
                            ("envoye", "Envoyé"),
                            ("erreur", "Erreur"),
                        ],
                        default="en_attente",
                        max_length=20,
                    ),
                ),
                ("erreur_message", models.TextField(blank=True)),
                ("date_envoi", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "abonne",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="envois",
                        to="api.abonnenewsletter",
                    ),
                ),
                (
                    "campagne",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="envois",
                        to="api.campagnenewsletter",
                    ),
                ),
            ],
            options={
                "verbose_name": "Envoi newsletter",
                "verbose_name_plural": "Envois newsletter",
                "ordering": ["-created_at"],
            },
        ),
    ]
