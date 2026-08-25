from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model

from api.models import Departement, Structure, UserProfile, ZoneSanitaire

User = get_user_model()


class AuthIntegrationTests(TestCase):
    def test_login_sets_http_only_cookie_and_me_endpoint(self):
        # create admin user and profile
        user = User.objects.create_user(username="integ_admin", email="integ_admin@example.com", password="admin123")
        UserProfile.objects.create(user=user, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)

        # login via auth endpoint (cookie-based)
        resp = self.client.post(reverse("auth-login"), data={"username": "integ_admin", "password": "admin123"}, content_type="application/json")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.cookies.get("access_token"))
        self.assertTrue(resp.cookies["access_token"]["httponly"])

        # authenticated request to /auth/me/ should return user data
        me = self.client.get(reverse("auth-me"))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json().get("username"), "integ_admin")

    def test_stats_national_forbidden_for_departemental_validator(self):
        # user with departmental scope should not access national stats
        user = User.objects.create_user(username="val", email="val@example.com", password="val123")
        UserProfile.objects.create(user=user, role=UserProfile.Role.VALIDATEUR, scope=UserProfile.Scope.DEPARTEMENTAL)

        resp = self.client.post(reverse("auth-login"), data={"username": "val", "password": "val123"}, content_type="application/json")
        if resp.status_code != 200:
            # fallback to session auth in case cookie auth is not active in test env
            self.client.force_login(user)

        r = self.client.get(reverse("stats-national"))
        # Expect 403 for authenticated but unauthorized, or 401 if unauthenticated
        self.assertIn(r.status_code, (401, 403))
        if r.status_code == 401:
            # try again with force_login to ensure we observe 403
            self.client.force_login(user)
            r2 = self.client.get(reverse("stats-national"))
            self.assertEqual(r2.status_code, 403)

    def test_collecte_post_requires_authentication(self):
        # posting to declarations endpoint without authentication should be rejected (401)
        url = reverse("declarations-list")
        resp = self.client.post(url, data={}, content_type="application/json")
        self.assertEqual(resp.status_code, 401)

    def test_admin_organization_forbidden_for_non_admin(self):
        # a non-admin user should not access admin organization endpoints
        user = User.objects.create_user(username="coll", email="coll@example.com", password="coll123")
        UserProfile.objects.create(user=user, role=UserProfile.Role.COLLECTEUR, scope=UserProfile.Scope.STRUCTURE)

        resp = self.client.post(reverse("auth-login"), data={"username": "coll", "password": "coll123"}, content_type="application/json")
        if resp.status_code != 200:
            self.client.force_login(user)

        r = self.client.get(reverse("admin-organization"))
        self.assertIn(r.status_code, (401, 403))
        if r.status_code == 401:
            self.client.force_login(user)
            r2 = self.client.get(reverse("admin-organization"))
            self.assertEqual(r2.status_code, 403)

    def test_admin_can_manage_territorial_referential(self):
        admin = User.objects.create_user(username="org_admin", password="admin123")
        UserProfile.objects.create(user=admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL)
        login = self.client.post(
            reverse("auth-login"),
            data={"username": "org_admin", "password": "admin123"},
            content_type="application/json",
        )
        if login.status_code != 200:
            self.client.force_login(admin)

        created = self.client.post(
            reverse("admin-organization"),
            data={"kind": "departement", "code": "mono-test", "nom": "Mono test", "population": 1000},
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        dept_id = created.json()["item"]["id"]

        zone = self.client.post(
            reverse("admin-organization"),
            data={"kind": "zone", "code": "zs-mono-test", "nom": "ZS Mono test", "departement_id": dept_id},
            content_type="application/json",
        )
        self.assertEqual(zone.status_code, 201)
        zone_id = zone.json()["item"]["id"]

        structure = self.client.post(
            reverse("admin-organization"),
            data={
                "kind": "structure",
                "code": "cs-mono-test",
                "nom": "CS Mono test",
                "type_structure": "CS",
                "departement_id": dept_id,
                "zone_sanitaire_id": zone_id,
            },
            content_type="application/json",
        )
        self.assertEqual(structure.status_code, 201)
        structure_id = structure.json()["item"]["id"]
        self.assertTrue(structure.json()["item"]["actif"])

        deactivated = self.client.patch(
            reverse("admin-organization-detail", kwargs={"kind": "structure", "pk": structure_id}),
            data={"actif": False},
            content_type="application/json",
        )
        self.assertEqual(deactivated.status_code, 200)
        self.assertFalse(deactivated.json()["item"]["actif"])
        self.assertFalse(Structure.objects.get(pk=structure_id).actif)

        collector = User.objects.create_user(username="pf.mono", password="pass123")
        assigned = self.client.patch(
            reverse("admin-user-detail", kwargs={"pk": collector.id}),
            data={
                "email": "pf.mono@orhsb.bj",
                "profile": {
                    "role": "collecteur",
                    "scope": "structure",
                    "departement_id": dept_id,
                    "structure_id": structure_id,
                },
            },
            content_type="application/json",
        )
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.json()["profile"]["structure"]["id"], structure_id)
