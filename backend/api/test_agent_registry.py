from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from api.models import CampagneCollecte, Departement, Structure, AgentSante, UserProfile

User = get_user_model()


class AgentRegistryAPITests(TestCase):
    def setUp(self):
        # create admin and campagne
        self.admin = User.objects.create_user(username="testadmin", email="testadmin@example.com", password="admin123")
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)
        # login via auth endpoint (cookie-based) or fallback
        resp = self.client.post(reverse('auth-login'), data={"username": "testadmin", "password": "admin123"}, content_type='application/json')
        if resp.status_code != 200:
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
            "matricule_externe": "EXT-999",
            "nom": "Doe",
            "prenom": "John",
            "sexe": "M",
            "profession": "Infirmier",
            "telephone_pro": "+22960000000",
            "email_pro": "john.doe@structure.test",
            "historique_contrats": [{"employeur": "Struct 1", "type": "permanent", "date_debut": "2020-01-01"}],
        }
        response = self.client.post(url, data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['matricule'], 'M-100')
        self.assertEqual(data.get('matricule_externe'), 'EXT-999')
        self.assertEqual(data.get('telephone_pro'), '+22960000000')
        self.assertEqual(data.get('email_pro'), 'john.doe@structure.test')
        self.assertEqual(isinstance(data.get('historique_contrats'), list), True)

    def test_patch_agent_updates(self):
        agent = AgentSante.objects.create(campagne=self.campagne, structure=self.structure, matricule='M-101', nom='X', prenom='Y', sexe='F', profession='Sage-femme')
        url = reverse('collecte-agent-detail', args=[agent.id])
        response = self.client.patch(url, data={"profession": "Sage-femme senior", "matricule_externe": "EXT-100"}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        agent.refresh_from_db()
        self.assertEqual(agent.profession, 'Sage-femme senior')
        self.assertEqual(agent.matricule_externe, 'EXT-100')

    def test_patch_changing_structure_creates_mouvement(self):
        # create a second structure
        new_struct = Structure.objects.create(code='st2', nom='Struct 2', type_structure=Structure.TypeStructure.CS, departement=self.depart)
        agent = AgentSante.objects.create(campagne=self.campagne, structure=self.structure, matricule='M-150', nom='Move', prenom='Agent', sexe='M', profession='Tech')
        url = reverse('collecte-agent-detail', args=[agent.id])
        response = self.client.patch(url, data={"structure_id": new_struct.id, "poste_occupe": "Nouveau poste"}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        agent.refresh_from_db()
        # check mouvement exists
        from api.models import MouvementAgent
        mouvements = MouvementAgent.objects.filter(agent=agent)
        self.assertTrue(mouvements.exists())
        mouv = mouvements.first()
        self.assertEqual(mouv.structure_origine.id, self.structure.id)
        self.assertEqual(mouv.structure_destination.id, new_struct.id)

    def test_delete_agent_requires_coordination_or_admin(self):
        agent = AgentSante.objects.create(campagne=self.campagne, structure=self.structure, matricule='M-102', nom='A', prenom='B', sexe='M', profession='Tech')
        url = reverse('collecte-agent-detail', args=[agent.id])
        # logged in as admin -> allowed
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        # agent should be soft-deleted (actif=False) and still present in DB
        agent.refresh_from_db()
        self.assertFalse(agent.actif)

    def test_validator_can_list_and_create_agents(self):
        validator = User.objects.create_user(username="val", email="val@example.com", password="val123")
        UserProfile.objects.create(
            user=validator,
            role=UserProfile.Role.VALIDATEUR,
            scope=UserProfile.Scope.DEPARTEMENTAL,
            departement=self.depart,
        )
        AgentSante.objects.create(
            campagne=self.campagne,
            structure=self.structure,
            matricule="M-200",
            nom="Val",
            prenom="Vue",
            sexe="F",
            profession="Infirmier",
        )
        self.client.force_login(validator)
        url = reverse("collecte-agents")
        listed = self.client.get(url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["count"], 1)
        created = self.client.post(
            url,
            data={
                "campagne_id": self.campagne.id,
                "structure_id": self.structure.id,
                "matricule": "M-201",
                "nom": "Nouveau",
                "prenom": "Agent",
                "sexe": "M",
                "profession": "Médecin",
            },
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["matricule"], "M-201")

    def test_delete_agent_forbidden_for_collector(self):
        # create a collector user and try to delete an agent
        collector = User.objects.create_user(username="coll", email="coll@example.com", password="coll123")
        UserProfile.objects.create(user=collector, role=UserProfile.Role.COLLECTEUR, scope=UserProfile.Scope.STRUCTURE, structure=self.structure)
        self.client.force_login(collector)

        agent = AgentSante.objects.create(campagne=self.campagne, structure=self.structure, matricule='M-103', nom='C', prenom='D', sexe='F', profession='Nurse')
        url = reverse('collecte-agent-detail', args=[agent.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 403)
