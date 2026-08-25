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
