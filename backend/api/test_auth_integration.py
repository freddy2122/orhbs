from unittest.mock import patch

from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model

from api.models import Departement, Structure, UserProfile, ZoneSanitaire
from api.throttling import LoginRateThrottle

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


class CsrfEnforcementTests(TestCase):
    """Cookie-based auth (SPA on a different origin than the API) is exposed
    to CSRF unless the double-submit token is actually checked. These tests
    use enforce_csrf_checks=True — the default test Client silently disables
    CSRF, which would hide a regression here."""

    def setUp(self):
        self.user = User.objects.create_user(username="csrf_user", password="csrf12345")
        UserProfile.objects.create(user=self.user, role=UserProfile.Role.COLLECTEUR, scope=UserProfile.Scope.NATIONAL)
        self.client = Client(enforce_csrf_checks=True)
        login = self.client.post(
            reverse("auth-login"),
            data={"username": "csrf_user", "password": "csrf12345"},
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertIsNotNone(login.cookies.get("csrftoken"))

    def test_cookie_authenticated_post_without_csrf_token_is_rejected(self):
        forged = self.client.post(reverse("declarations-list"), data={}, content_type="application/json")
        self.assertEqual(forged.status_code, 403)

    def test_cookie_authenticated_post_with_csrf_token_is_allowed(self):
        csrf_token = self.client.cookies["csrftoken"].value
        legit = self.client.post(
            reverse("declarations-list"),
            data={},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertNotEqual(legit.status_code, 403)

    def test_get_requests_do_not_require_csrf_token(self):
        # Safe methods are exempt by design (CsrfViewMiddleware itself skips them).
        me = self.client.get(reverse("auth-me"))
        self.assertEqual(me.status_code, 200)


# DEFAULT_THROTTLE_RATES["login"] is forced to "1000/min" while tests run
# (settings.py) so the rest of the suite's incidental logins never trip it —
# THROTTLE_RATES is also a plain class attribute DRF reads once at import
# time, so an @override_settings on REST_FRAMEWORK wouldn't reach it anyway.
# Patching LoginRateThrottle directly is what actually exercises the limit.
@patch.object(LoginRateThrottle, "THROTTLE_RATES", {"login": "3/min"})
class LoginThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = User.objects.create_user(username="throttle_user", password="throttle12345")
        UserProfile.objects.create(user=self.user, role=UserProfile.Role.COLLECTEUR, scope=UserProfile.Scope.NATIONAL)

    def _attempt(self, password="wrong-password"):
        return self.client.post(
            reverse("auth-login"),
            data={"username": "throttle_user", "password": password},
            content_type="application/json",
        )

    def test_repeated_login_attempts_are_throttled_per_ip(self):
        for _ in range(3):
            resp = self._attempt()
            self.assertEqual(resp.status_code, 401)

        blocked = self._attempt()
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked)
        self.assertIn("Trop de tentatives de connexion", blocked.json()["detail"])

    def test_correct_password_does_not_bypass_the_throttle(self):
        for _ in range(3):
            self._attempt()

        still_blocked = self._attempt(password="throttle12345")
        self.assertEqual(still_blocked.status_code, 429)
