from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from api.models import CampagneCollecte, DeclarationRHS, Departement, ZoneSanitaire, Structure, UserProfile, AgentSante
from api.permissions import declarations_queryset_for_user, user_can_access_national_data, user_has_any_role, user_has_scope

User = get_user_model()


class ApiSmokeTests(TestCase):
    def test_health_endpoint_is_available(self):
        response = self.client.get(reverse("health-check"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_login_without_payload_is_rejected(self):
        response = self.client.post(reverse("auth-login"), data={}, content_type="application/json")

        self.assertEqual(response.status_code, 400)

    def test_login_sets_http_only_auth_cookies(self):
        user = User.objects.create_user(
            username="demo",
            email="demo@example.com",
            password="demo123",
        )
        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.ADMIN,
            scope=UserProfile.Scope.NATIONAL,
        )

        response = self.client.post(
            reverse("auth-login"),
            data={"username": "demo", "password": "demo123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.cookies.get("access_token"))
        self.assertIsNotNone(response.cookies.get("refresh_token"))
        self.assertTrue(response.cookies["access_token"]["httponly"])

    def test_permissions_follow_orhs_role_model(self):
        user = User.objects.create_user(username="drh", email="drh@example.com", password="demo123")
        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.VALIDATEUR,
            scope=UserProfile.Scope.DEPARTEMENTAL,
        )

        self.assertTrue(user_has_any_role(user, UserProfile.Role.VALIDATEUR))
        self.assertTrue(user_has_scope(user, UserProfile.Scope.DEPARTEMENTAL))
        self.assertFalse(user_can_access_national_data(user))

    def test_declarations_scope_is_limited_to_structure(self):
        departement = Departement.objects.create(code="littoral", nom="Littoral", population=1000)
        structure_a = Structure.objects.create(
            code="chu-mel",
            nom="CHU-MEL",
            type_structure=Structure.TypeStructure.CHU,
            departement=departement,
        )
        structure_b = Structure.objects.create(
            code="cs-kpomasse",
            nom="CS Kpomassè",
            type_structure=Structure.TypeStructure.CS,
            departement=departement,
        )
        campagne = CampagneCollecte.objects.create(
            code="camp-2026",
            libelle="Campagne 2026",
            annee=2026,
            periode="Q1",
            date_debut=date(2026, 1, 1),
            date_fin=date(2026, 3, 31),
        )
        DeclarationRHS.objects.create(campagne=campagne, structure=structure_a, effectif_total=10)
        DeclarationRHS.objects.create(campagne=campagne, structure=structure_b, effectif_total=12)

        user = User.objects.create_user(username="collecteur", email="collecteur@example.com", password="demo123")
        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.COLLECTEUR,
            scope=UserProfile.Scope.STRUCTURE,
            structure=structure_a,
        )

        qs = declarations_queryset_for_user(user)
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().structure, structure_a)


class OrganizationCrudTests(TestCase):
    def setUp(self):
        # admin user
        self.admin = User.objects.create_user(username="admin", email="admin@example.com", password="admin123")
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)
        # Login via auth endpoint to ensure DRF authentication is applied correctly (cookies/JWT)
        resp = self.client.post(reverse('auth-login'), data={"username": "admin", "password": "admin123"}, content_type='application/json')
        if resp.status_code != 200:
            # Fallback to session auth if login endpoint is not available in test settings
            self.client.force_login(self.admin)

    def test_patch_departement_updates_fields(self):
        dep = Departement.objects.create(code="dpt1", nom="Dépt 1", population=1000)
        url = reverse("admin-organization-detail", args=["departement", dep.id])
        response = self.client.patch(url, data={"nom": "Département Modifié", "population": 2500}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        dep.refresh_from_db()
        self.assertEqual(dep.nom, "Département Modifié")
        self.assertEqual(dep.population, 2500)

    def test_delete_departement_blocked_if_children(self):
        dep = Departement.objects.create(code="dpt2", nom="Dépt 2", population=500)
        ZoneSanitaire.objects.create(code="z1", nom="Zone 1", departement=dep)
        url = reverse("admin-organization-detail", args=["departement", dep.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Departement.objects.filter(pk=dep.id).exists())

    def test_delete_structure_allowed(self):
        dep = Departement.objects.create(code="dpt3", nom="Dépt 3", population=800)
        struct = Structure.objects.create(code="s1", nom="Struct 1", type_structure=Structure.TypeStructure.CS, departement=dep)
        url = reverse("admin-organization-detail", args=["structure", struct.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Structure.objects.filter(pk=struct.id).exists())


class AgentRegistryTests(TestCase):
    def setUp(self):
        # create admin and campagne
        self.admin = User.objects.create_user(username="admin2", email="admin2@example.com", password="admin123")
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)
        self.client.force_login(self.admin)
        self.campagne = CampagneCollecte.objects.create(code="camp-test", libelle="Camp Test", annee=2026, periode="Q1", date_debut=date(2026,1,1), date_fin=date(2026,3,31))
        self.depart = Departement.objects.create(code="dptest", nom="Dept Test", population=100)
        self.structure = Structure.objects.create(code="st1", nom="Struct 1", type_structure=Structure.TypeStructure.CS, departement=self.depart)

    def test_create_agent_via_api(self):
        url = reverse('collecte-agents')
        payload = {
            "campagne_id": self.campagne.id,
            "structure_id": self.structure.id,
            "matricule": "M-100",
            "nom": "Doe",
            "prenom": "John",
            "sexe": "M",
            "profession": "Infirmier",
        }
        response = self.client.post(url, data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['matricule'], 'M-100')

    def test_patch_agent_updates(self):
        # create agent directly
        agent = AgentSante.objects.create(campagne=self.campagne, structure=self.structure, matricule='M-101', nom='X', prenom='Y', sexe='F', profession='Sage-femme')
        url = reverse('collecte-agent-detail', args=[agent.id])
        response = self.client.patch(url, data={"profession": "Sage-femme senior"}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        agent.refresh_from_db()
        self.assertEqual(agent.profession, 'Sage-femme senior')

    def test_delete_agent_requires_coordination_or_admin(self):
        agent = AgentSante.objects.create(campagne=self.campagne, structure=self.structure, matricule='M-102', nom='A', prenom='B', sexe='M', profession='Tech')
        url = reverse('collecte-agent-detail', args=[agent.id])
        # logged in as admin -> allowed
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
