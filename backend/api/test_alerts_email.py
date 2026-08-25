from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from api.models import (
    AgentSante,
    AlerteEmail,
    CampagneCollecte,
    ConfigAlerte,
    Departement,
    Structure,
    UserProfile,
)
from api.services.alerts import AlertGenerator, ensure_default_configs
from api.services.email import send_pending_alerts

User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AlertEmailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="coordination",
            email="coordination@orhsb.bj",
            password="demo123",
        )
        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.COORDINATION,
            scope=UserProfile.Scope.NATIONAL,
        )
        self.departement = Departement.objects.create(code="littoral", nom="Littoral", population=1000)
        self.structure = Structure.objects.create(
            code="chu-mel",
            nom="CHU-MEL",
            type_structure=Structure.TypeStructure.CHU,
            departement=self.departement,
        )
        self.campagne = CampagneCollecte.objects.create(
            code="camp-test",
            libelle="Campagne test",
            annee=2026,
            date_debut=date.today(),
            date_fin=date.today() + timedelta(days=7),
            active=True,
        )

    def test_ensure_default_configs_creates_all_types(self):
        created = ensure_default_configs()
        self.assertEqual(len(created), len(AlerteEmail.TypeAlerte.choices))
        self.assertTrue(ConfigAlerte.objects.filter(actif=True).exists())

    def test_retraite_alert_is_created_and_sent(self):
        AgentSante.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            matricule="A001",
            nom="Kouassi",
            prenom="Paul",
            sexe=AgentSante.Sexe.M,
            profession="Médecin",
            depart_retraite_prevu=date.today() + timedelta(days=30),
        )
        created = AlertGenerator.run_all_checks(self.campagne)
        retraites = [a for a in created if a.type_alerte == AlerteEmail.TypeAlerte.RETRAITE_PROCHE]
        self.assertEqual(len(retraites), 1)
        self.assertEqual(retraites[0].statut, AlerteEmail.StatutAlerte.EN_ATTENTE)

        result = send_pending_alerts()
        self.assertGreaterEqual(result["sent"], 1)
        self.assertGreaterEqual(len(mail.outbox), 1)
        retraites[0].refresh_from_db()
        self.assertEqual(retraites[0].statut, AlerteEmail.StatutAlerte.ENVOYE)

    def test_duplicate_alert_is_not_recreated_within_frequency(self):
        AgentSante.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            matricule="A002",
            nom="Dossou",
            prenom="Aline",
            sexe=AgentSante.Sexe.F,
            profession="Infirmière",
            depart_retraite_prevu=date.today() + timedelta(days=10),
        )
        first = AlertGenerator.run_all_checks(self.campagne)
        second = AlertGenerator.run_all_checks(self.campagne)
        self.assertGreaterEqual(len(first), 1)
        self.assertEqual(len(second), 0)

    def test_trigger_endpoint_sends_mail(self):
        login = self.client.post(
            "/api/auth/login/",
            data={"username": "coordination", "password": "demo123"},
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)
        response = self.client.post(
            "/api/alerts/trigger/",
            data={"send": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("alertes_creees", body)
        self.assertIn("emails_envoyes", body)

    def test_scheduled_jobs_dry_run(self):
        ensure_default_configs()
        call_command("run_scheduled_jobs", "--dry-run", "--skip-backup")
        self.assertGreaterEqual(ConfigAlerte.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 0)
