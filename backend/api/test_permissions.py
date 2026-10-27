from django.test import TestCase
from django.contrib.auth import get_user_model
from api.models import UserProfile, Departement, ZoneSanitaire, Structure, DeclarationRHS
from api.permissions import (
    CanViewAgents,
    IsAdmin,
    IsCollectorOrCoordinatorOrAdmin,
    declarations_queryset_for_user,
    structures_queryset_for_user,
    IsCollector,
)

User = get_user_model()


class PermissionsTestCase(TestCase):
    def setUp(self):
        # create departments/zones/structures
        self.dept = Departement.objects.create(code='testdept', nom='Test Dept', population=1000)
        self.zone = ZoneSanitaire.objects.create(code='testdept-z1', nom='Zone 1', departement=self.dept)
        self.struct_a = Structure.objects.create(code='testdept-z1-s1', nom='Struct A', departement=self.dept, zone_sanitaire=self.zone)
        self.struct_b = Structure.objects.create(code='testdept-z1-s2', nom='Struct B', departement=self.dept, zone_sanitaire=self.zone)

        # create users with profiles
        self.admin = User.objects.create_user(username='admin', password='pwd')
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)

        self.coord = User.objects.create_user(username='coord', password='pwd')
        UserProfile.objects.create(user=self.coord, role=UserProfile.Role.COORDINATION, scope=UserProfile.Scope.DEPARTEMENTAL, departement=self.dept)

        self.collector = User.objects.create_user(username='collector', password='pwd')
        UserProfile.objects.create(user=self.collector, role=UserProfile.Role.COLLECTEUR, scope=UserProfile.Scope.STRUCTURE, structure=self.struct_a)

        self.validator = User.objects.create_user(username='validator', password='pwd')
        UserProfile.objects.create(user=self.validator, role=UserProfile.Role.VALIDATEUR, scope=UserProfile.Scope.DEPARTEMENTAL, departement=self.dept)

        # campagne + declarations
        from api.models import CampagneCollecte
        campagne = CampagneCollecte.objects.create(code='c2026', libelle='Campagne 2026', annee=2026, date_debut='2026-01-01', date_fin='2026-12-31')
        self.decl_a = DeclarationRHS.objects.create(campagne=campagne, structure=self.struct_a, effectif_total=5)
        self.decl_b = DeclarationRHS.objects.create(campagne=campagne, structure=self.struct_b, effectif_total=7)

    def test_is_admin_permission(self):
        perm = IsAdmin()
        self.assertTrue(perm.has_permission(self._fake_request(self.admin), None))
        self.assertFalse(perm.has_permission(self._fake_request(self.coord), None))

    def test_collector_or_coordination_or_admin(self):
        perm = IsCollectorOrCoordinatorOrAdmin()
        self.assertTrue(perm.has_permission(self._fake_request(self.collector), None))
        self.assertTrue(perm.has_permission(self._fake_request(self.coord), None))
        self.assertTrue(perm.has_permission(self._fake_request(self.admin), None))
        self.assertTrue(perm.has_permission(self._fake_request(self.validator), None))

    def test_can_view_agents(self):
        perm = CanViewAgents()
        self.assertTrue(perm.has_permission(self._fake_request(self.validator), None))
        self.assertTrue(perm.has_permission(self._fake_request(self.collector), None))
        self.assertTrue(perm.has_permission(self._fake_request(self.admin), None))

    def test_declarations_queryset_for_user(self):
        # admin sees all
        qs_admin = declarations_queryset_for_user(self.admin)
        self.assertEqual(set(qs_admin.values_list('id', flat=True)), {self.decl_a.id, self.decl_b.id})

        # collector sees only own structure declarations
        qs_col = declarations_queryset_for_user(self.collector)
        self.assertEqual(list(qs_col.values_list('id', flat=True)), [self.decl_a.id])

        # validator (department) sees both
        qs_val = declarations_queryset_for_user(self.validator)
        self.assertEqual(set(qs_val.values_list('id', flat=True)), {self.decl_a.id, self.decl_b.id})

    def test_departmental_drh_cannot_see_other_department(self):
        other_dept = Departement.objects.create(code="autredept", nom="Autre Dept", population=500)
        other_zone = ZoneSanitaire.objects.create(code="autredept-z1", nom="Zone autre", departement=other_dept)
        other_struct = Structure.objects.create(
            code="autredept-z1-s1",
            nom="Struct autre",
            departement=other_dept,
            zone_sanitaire=other_zone,
        )
        from api.models import CampagneCollecte

        campagne = CampagneCollecte.objects.get(code="c2026")
        other_decl = DeclarationRHS.objects.create(campagne=campagne, structure=other_struct, effectif_total=3)

        qs = declarations_queryset_for_user(self.validator)
        self.assertIn(self.decl_a, qs)
        self.assertNotIn(other_decl, qs)
        structs = structures_queryset_for_user(self.validator)
        self.assertIn(self.struct_a, structs)
        self.assertNotIn(other_struct, structs)

    def test_structures_queryset_for_user(self):
        # admin sees all
        qs_admin = structures_queryset_for_user(self.admin)
        self.assertIn(self.struct_a, qs_admin)
        self.assertIn(self.struct_b, qs_admin)

        # collector sees only assigned structure
        qs_col = structures_queryset_for_user(self.collector)
        self.assertQuerysetEqual(qs_col, [self.struct_a], transform=lambda x: x)

    def _fake_request(self, user):
        class R:
            pass
        r = R()
        r.user = user
        return r


class DeclarationWriteAccessTests(TestCase):
    """Les rôles en lecture seule ne doivent ni modifier ni soumettre une déclaration."""

    def setUp(self):
        from api.models import CampagneCollecte

        self.dept = Departement.objects.create(code="wd", nom="Dept W", population=1)
        self.zone = ZoneSanitaire.objects.create(code="wd-z", nom="Zone W", departement=self.dept)
        self.struct = Structure.objects.create(
            code="wd-s", nom="Struct W", departement=self.dept, zone_sanitaire=self.zone, type_structure="HZ"
        )
        campagne = CampagneCollecte.objects.create(
            code="cw", libelle="Campagne W", annee=2026, date_debut="2026-01-01", date_fin="2026-12-31"
        )
        self.decl = DeclarationRHS.objects.create(campagne=campagne, structure=self.struct, effectif_total=3)

    def _login(self, username, role, scope=UserProfile.Scope.NATIONAL, **extra):
        user = User.objects.create_user(username=username, password="Phrase-Solide-2026-x")
        UserProfile.objects.create(user=user, role=role, scope=scope, **extra)
        resp = self.client.post(
            "/api/auth/login/",
            data={"username": username, "password": "Phrase-Solide-2026-x"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_read_only_roles_cannot_submit_or_patch(self):
        for role in (UserProfile.Role.DECIDEUR, UserProfile.Role.ANALYSTE, UserProfile.Role.PARTENAIRE):
            self._login(f"ro-{role}", role)
            submit = self.client.post(f"/api/collecte/declarations/{self.decl.id}/submit/")
            patch = self.client.patch(
                f"/api/collecte/declarations/{self.decl.id}/",
                data={"effectif_total": 999},
                content_type="application/json",
            )
            self.assertEqual(submit.status_code, 403, role)
            self.assertEqual(patch.status_code, 403, role)
        self.decl.refresh_from_db()
        self.assertEqual(self.decl.statut, DeclarationRHS.Statut.BROUILLON)
        self.assertEqual(self.decl.effectif_total, 3)

    def test_collector_in_scope_can_still_submit(self):
        self._login("col-ok", UserProfile.Role.COLLECTEUR, UserProfile.Scope.STRUCTURE, structure=self.struct)
        resp = self.client.post(f"/api/collecte/declarations/{self.decl.id}/submit/")
        self.assertEqual(resp.status_code, 200)


class MouvementScopeTests(TestCase):
    """Un collecteur ne peut enregistrer un mouvement que pour un agent de son périmètre."""

    def setUp(self):
        from api.models import AgentSante, CampagneCollecte

        self.dept = Departement.objects.create(code="md", nom="Dept M", population=1)
        self.zone = ZoneSanitaire.objects.create(code="md-z", nom="Zone M", departement=self.dept)
        self.struct_a = Structure.objects.create(code="md-a", nom="A", departement=self.dept, zone_sanitaire=self.zone, type_structure="HZ")
        self.struct_b = Structure.objects.create(code="md-b", nom="B", departement=self.dept, zone_sanitaire=self.zone, type_structure="HZ")
        campagne = CampagneCollecte.objects.create(
            code="cm", libelle="Campagne M", annee=2026, date_debut="2026-01-01", date_fin="2026-12-31"
        )
        mk = lambda mat, st: AgentSante.objects.create(
            campagne=campagne, structure=st, matricule=mat, nom="N", prenom="P", sexe="M", profession="Infirmier"
        )
        self.agent_a, self.agent_b = mk("A1", self.struct_a), mk("B1", self.struct_b)
        user = User.objects.create_user(username="col-mv", password="Phrase-Solide-2026-x")
        UserProfile.objects.create(user=user, role=UserProfile.Role.COLLECTEUR, scope=UserProfile.Scope.STRUCTURE, structure=self.struct_a)
        resp = self.client.post(
            "/api/auth/login/",
            data={"username": "col-mv", "password": "Phrase-Solide-2026-x"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

    def _post(self, agent_id, **extra):
        payload = {"agent": agent_id, "type_mouvement": "deces", "date_effet": "2026-05-01"}
        payload.update(extra)
        return self.client.post("/api/admin/mouvements/", data=payload, content_type="application/json")

    def test_cannot_move_or_archive_agent_of_another_structure(self):
        resp = self._post(self.agent_b.id)
        self.assertEqual(resp.status_code, 404)
        self.agent_b.refresh_from_db()
        self.assertTrue(self.agent_b.actif)

    def test_can_record_movement_for_own_agent(self):
        resp = self._post(self.agent_a.id, type_mouvement="mutation", structure_destination=self.struct_b.id)
        self.assertEqual(resp.status_code, 201, resp.content)
        self.agent_a.refresh_from_db()
        self.assertEqual(self.agent_a.structure_id, self.struct_b.id)
