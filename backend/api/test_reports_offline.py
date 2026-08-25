from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from api.models import CampagneCollecte, DeclarationRHS, Departement, Structure, UserProfile
from api.services.reports import ReportGenerator

User = get_user_model()


class ReportsAndOfflineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analyste",
            email="analyste@orhsb.bj",
            password="demo123",
        )
        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.ANALYSTE,
            scope=UserProfile.Scope.NATIONAL,
        )
        self.collecteur = User.objects.create_user(
            username="collecteur",
            email="collecteur@orhsb.bj",
            password="demo123",
        )
        self.departement = Departement.objects.create(code="littoral", nom="Littoral", population=800000)
        self.structure = Structure.objects.create(
            code="chu-mel",
            nom="CHU-MEL",
            type_structure=Structure.TypeStructure.CHU,
            departement=self.departement,
        )
        UserProfile.objects.create(
            user=self.collecteur,
            role=UserProfile.Role.COLLECTEUR,
            scope=UserProfile.Scope.STRUCTURE,
            structure=self.structure,
        )
        self.campagne = CampagneCollecte.objects.create(
            code="camp-r",
            libelle="Campagne rapports",
            annee=2026,
            date_debut=date(2026, 1, 1),
            date_fin=date(2026, 12, 31),
            active=True,
        )
        DeclarationRHS.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            statut=DeclarationRHS.Statut.VALIDE_NATIONAL,
            effectif_total=40,
            medecins=8,
            infirmiers=20,
            sages_femmes=4,
            dont_femmes=22,
            dont_hommes=18,
        )
        login = self.client.post(
            reverse("auth-login"),
            data={"username": "analyste", "password": "demo123"},
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)

    def test_report_json_excel_pdf(self):
        login = self.client.post(
            reverse("auth-login"),
            data={"username": "analyste", "password": "demo123"},
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)
        data = ReportGenerator.generate_report_data("mensuel_drh", campagne=self.campagne)
        self.assertEqual(data["indicateurs"]["effectifs"]["total"], 40)

        excel = ReportGenerator.export_excel(data)
        self.assertGreater(len(excel), 100)
        self.assertEqual(excel[:2], b"PK")

        pdf = ReportGenerator.export_pdf(data)
        self.assertTrue(pdf.startswith(b"%PDF"))

        response = self.client.get("/api/reports/generate/?modele=mensuel_drh&export=pdf")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")

    def test_offline_pack_and_sync_for_collector(self):
        self.client.post(
            reverse("auth-login"),
            data={"username": "collecteur", "password": "demo123"},
            content_type="application/json",
        )
        pack = self.client.get("/api/offline/export/")
        self.assertEqual(pack.status_code, 200)
        body = pack.json()
        self.assertEqual(len(body["structures"]), 1)

        sync = self.client.post(
            "/api/offline/sync/",
            data={
                "type": "declaration",
                "declaration": {
                    "structure_id": self.structure.id,
                    "effectif_total": 12,
                    "dont_hommes": 5,
                    "medecins": 2,
                    "observations": "saisie hors ligne",
                },
            },
            content_type="application/json",
        )
        # Déclaration déjà validée nationalement → conflit, pas d'écrasement
        self.assertEqual(sync.status_code, 409)
        self.assertTrue(sync.json().get("conflict"))
        self.structure.refresh_from_db()
        decl = DeclarationRHS.objects.get(campagne=self.campagne, structure=self.structure)
        self.assertEqual(decl.effectif_total, 40)
        self.assertEqual(decl.statut, DeclarationRHS.Statut.VALIDE_NATIONAL)
