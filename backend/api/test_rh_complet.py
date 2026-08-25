from datetime import date, timedelta
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from api.models import (
    AgentQualification,
    AgentSante,
    AlerteEmail,
    CampagneCollecte,
    DeclarationRHS,
    Departement,
    MouvementAgent,
    Publication,
    RapportGenere,
    Structure,
    UserProfile,
)
from api.services.stats import national_stats

User = get_user_model()


class RhCompletTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="rhadmin", password="admin123")
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)
        resp = self.client.post(
            reverse("auth-login"),
            data={"username": "rhadmin", "password": "admin123"},
            content_type="application/json",
        )
        if resp.status_code != 200:
            self.client.force_login(self.admin)

        self.campagne = CampagneCollecte.objects.create(
            code="camp-rh",
            libelle="Campagne RH",
            annee=2026,
            periode="annuelle",
            date_debut=date(2026, 1, 1),
            date_fin=date(2026, 12, 31),
            active=True,
        )
        self.depart = Departement.objects.create(code="littoral", nom="Littoral", population=10000)
        self.structure = Structure.objects.create(
            code="st-rh",
            nom="CHU Test",
            type_structure=Structure.TypeStructure.CHU,
            departement=self.depart,
        )
        self.structure_b = Structure.objects.create(
            code="st-rh-b",
            nom="CS Test",
            type_structure=Structure.TypeStructure.CS,
            departement=self.depart,
        )
        self.agent = AgentSante.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            matricule="RH-1",
            nom="Koffi",
            prenom="Afi",
            sexe="F",
            profession="Médecin",
            date_naissance=date.today() - timedelta(days=40 * 365),
            secteur=AgentSante.Secteur.PUBLIC,
        )
        AgentSante.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            matricule="RH-2",
            nom="Koffi",
            prenom="Afi",
            sexe="F",
            profession="Infirmier",
        )
        DeclarationRHS.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            statut=DeclarationRHS.Statut.VALIDE_NATIONAL,
            effectif_total=50,
            medecins=10,
            infirmiers=20,
            sages_femmes=5,
        )

    def test_mouvement_mutation_updates_structure(self):
        response = self.client.post(
            reverse("admin-mouvements"),
            data={
                "agent": self.agent.id,
                "type_mouvement": "mutation",
                "structure_destination": self.structure_b.id,
                "date_effet": "2026-03-01",
                "motif": "Mutation de test",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.structure_id, self.structure_b.id)
        self.assertTrue(MouvementAgent.objects.filter(agent=self.agent, type_mouvement="mutation").exists())

    def test_qualification_create_and_list(self):
        response = self.client.post(
            reverse("admin-qualifications"),
            data={"agent": self.agent.id, "intitule": "DES pédiatrie", "niveau": "DES", "ecole": "FSS"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        listed = self.client.get(reverse("admin-qualifications"), {"agent": self.agent.id})
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)

    def test_age_filter_and_duplicates(self):
        response = self.client.get(reverse("collecte-agents"), {"age_min": 35, "age_max": 45})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["count"], 1)
        dupes = self.client.get(reverse("collecte-agents-doublons"))
        self.assertEqual(dupes.status_code, 200)
        self.assertTrue(any(g["type"] == "homonyme" for g in dupes.json()["groupes"]))

    def test_oms_ratio_in_national_stats(self):
        stats = national_stats(self.campagne)
        self.assertIn("ratio_personnel_qualifie_10k", stats)
        self.assertEqual(stats["seuil_oms_rhs"], 23)
        self.assertEqual(stats["effectif_public"], 2)
        response = self.client.get(reverse("stats-national"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("conforme_oms_rhs", response.json())

    def test_alert_traiter(self):
        alerte = AlerteEmail.objects.create(
            type_alerte=AlerteEmail.TypeAlerte.RAPPEL_COLLECTE,
            sujet="Rappel",
            corps="Test",
        )
        response = self.client.patch(
            reverse("admin-alerte-detail", args=[alerte.id]),
            data={"action": "traiter", "action_prise": "Relance effectuée"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        alerte.refresh_from_db()
        self.assertEqual(alerte.statut, AlerteEmail.StatutAlerte.TRAITE)
        self.assertEqual(alerte.action_prise, "Relance effectuée")

    def test_report_history(self):
        response = self.client.post(
            reverse("reports-generate"),
            data={"modele": "oms_unfpa", "export": "json"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(RapportGenere.objects.filter(modele="oms_unfpa").exists())
        history = self.client.get(reverse("reports-history"))
        self.assertEqual(history.status_code, 200)
        self.assertGreaterEqual(len(history.json()), 1)

    @override_settings(MEDIA_ROOT="/tmp/orhsb-test-media")
    def test_publication_pdf_upload(self):
        pub = Publication.objects.create(titre="Rapport test", slug="rapport-test", type_publication="note")
        pdf = SimpleUploadedFile("doc.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        response = self.client.post(reverse("cms-publication-upload", args=[pub.id]), data={"fichier_pdf": pdf})
        self.assertEqual(response.status_code, 200, response.content)
        pub.refresh_from_db()
        self.assertTrue(bool(pub.fichier_pdf))
