from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from api.models import (
    AgentQualification,
    AgentSante,
    CampagneCollecte,
    DeclarationRHS,
    Departement,
    Structure,
    UserProfile,
    ZoneSanitaire,
)

User = get_user_model()


class ActeursEndpointsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="acteurs-admin", password="admin123")
        UserProfile.objects.create(
            user=self.admin,
            role=UserProfile.Role.ADMIN,
            scope=UserProfile.Scope.NATIONAL,
        )
        resp = self.client.post(
            reverse("auth-login"),
            data={"username": "acteurs-admin", "password": "admin123"},
            content_type="application/json",
        )
        if resp.status_code != 200:
            self.client.force_login(self.admin)

        self.campagne = CampagneCollecte.objects.create(
            code="camp-acteurs",
            libelle="Campagne acteurs",
            annee=2026,
            date_debut=date(2026, 1, 1),
            date_fin=date(2026, 12, 31),
            active=True,
        )
        self.dept = Departement.objects.create(code="atu", nom="Atacora", population=800000)
        self.zone = ZoneSanitaire.objects.create(code="atu-z1", nom="ZS Natitingou", departement=self.dept)
        self.structure = Structure.objects.create(
            code="atu-hz",
            nom="HZ Natitingou",
            type_structure=Structure.TypeStructure.HZ,
            departement=self.dept,
            zone_sanitaire=self.zone,
        )
        DeclarationRHS.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            statut=DeclarationRHS.Statut.VALIDE_NATIONAL,
            effectif_total=40,
            medecins=8,
            infirmiers=20,
            sages_femmes=4,
            postes_vacants=6,
            postes_budgetes=46,
            departs_retraite_6_mois=2,
        )
        self.agent = AgentSante.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            matricule="ACT-1",
            nom="Bio",
            prenom="Chantal",
            sexe="F",
            profession="Médecin spécialiste",
            diplome_principal="Doctorat en médecine",
            ecole_formation="FSS Cotonou",
            specialite="Pédiatrie",
            depart_retraite_prevu=date.today() + timedelta(days=90),
        )
        AgentQualification.objects.create(agent=self.agent, intitule="DU pédiatrie", ecole="FSS")

    def test_planification(self):
        response = self.client.get(reverse("acteurs-planification"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["besoins_recruitement"])
        self.assertEqual(data["alertes_retraite"][0]["matricule"], "ACT-1")

    def test_cartographie(self):
        response = self.client.get(reverse("acteurs-cartographie"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["structures"][0]["structure"]["nom"], "HZ Natitingou")
        self.assertIn("population_density", data)

    def test_competences(self):
        response = self.client.get(reverse("acteurs-competences"))
        self.assertEqual(response.status_code, 200)
        diplomes = {row["diplome"] for row in response.json()["formations"]}
        self.assertIn("Doctorat en médecine", diplomes)
        self.assertIn("DU pédiatrie", diplomes)
        self.assertEqual(response.json()["specialisations"][0]["specialite"], "Pédiatrie")

    def test_referentiel_counts_when_seeded(self):
        from api.referentiel_benin import DEPARTEMENTS, STRUCTURES_NATIONALES, ZONES_SANITAIRES, structures_operationnelles

        self.assertEqual(len(DEPARTEMENTS), 12)
        self.assertEqual({code for code, _, _ in DEPARTEMENTS}, {
            "alibori", "atacora", "atlantique", "borgou", "collines", "couffo",
            "donga", "littoral", "mono", "oueme", "plateau", "zou",
        })
        from api.management.commands.seed_orhsb import DRH_ACCOUNTS

        self.assertEqual(len(DRH_ACCOUNTS), 12)
        self.assertEqual({code for code, _ in DRH_ACCOUNTS}, {code for code, _, _ in DEPARTEMENTS})
        self.assertEqual(len(ZONES_SANITAIRES), 34)
        self.assertEqual(len({dept for _, _, dept in ZONES_SANITAIRES}), 12)
        self.assertEqual(len(STRUCTURES_NATIONALES), 6)
        operationnelles = structures_operationnelles()
        self.assertEqual(len(operationnelles), 34 + 12)
        self.assertEqual(len({row[0] for row in operationnelles} | {row[0] for row in STRUCTURES_NATIONALES}), 52)

    def test_interoperabilite(self):
        response = self.client.get(reverse("acteurs-interoperabilite"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_agents"], 1)
        self.assertTrue(any(s["id"] == "excel-orhs" for s in data["sources"]))
