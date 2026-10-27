import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from api.models import AuditLog, LoginLockout, UserProfile

User = get_user_model()
GOOD = "Cigogne-Bleue-Lac-47"  # 20 caractères, sans terme interdit


def make_user(username, role=UserProfile.Role.ANALYSTE, password="Ancien-Mot-2026-xyz", email=""):
    user = User.objects.create_user(username=username, password=password, email=email)
    UserProfile.objects.create(user=user, role=role, scope=UserProfile.Scope.NATIONAL)
    return user


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AccountSecurityTests(TestCase):
    def post(self, name, data, **kwargs):
        return self.client.post(reverse(name, kwargs=kwargs or None), data=data, content_type="application/json")

    def login(self, username, password):
        return self.post("auth-login", {"username": username, "password": password})

    # --- politique de mot de passe -------------------------------------------

    def test_policy_rejects_short_and_trivial_passwords(self):
        from api.services.account_security import password_policy_errors

        user = make_user("pol1")
        self.assertTrue(password_policy_errors(user, "Court-1a"))  # < 12
        self.assertTrue(password_policy_errors(user, "Orhsb-Securise-2026"))  # terme projet
        self.assertTrue(password_policy_errors(user, "123456789012"))  # numérique
        self.assertEqual(password_policy_errors(user, GOOD), [])

    def test_sensitive_roles_require_14_characters(self):
        from api.services.account_security import password_policy_errors

        coord = make_user("pol2", role=UserProfile.Role.COORDINATION)
        analyst = make_user("pol3")
        twelve = "Cigogne-Lac-4"  # 13 caractères
        self.assertEqual(len(twelve), 13)
        self.assertTrue(password_policy_errors(coord, twelve))
        self.assertEqual(password_policy_errors(analyst, twelve), [])

    def test_password_history_blocks_reuse(self):
        from api.services.account_security import set_user_password
        from rest_framework.exceptions import ValidationError

        user = make_user("hist")
        set_user_password(user, GOOD)
        with self.assertRaises(ValidationError):
            set_user_password(user, GOOD)
        set_user_password(user, "Autre-Phrase-Longue-91")
        with self.assertRaises(ValidationError):
            set_user_password(user, GOOD)  # encore dans les 5 derniers

    def test_user_can_change_own_password(self):
        make_user("chg", password="Ancien-Mot-2026-xyz")
        self.assertEqual(self.login("chg", "Ancien-Mot-2026-xyz").status_code, 200)
        bad = self.post("auth-password-change", {"current_password": "faux", "new_password": GOOD})
        self.assertEqual(bad.status_code, 400)
        weak = self.post("auth-password-change", {"current_password": "Ancien-Mot-2026-xyz", "new_password": "court"})
        self.assertEqual(weak.status_code, 400)
        ok = self.post("auth-password-change", {"current_password": "Ancien-Mot-2026-xyz", "new_password": GOOD})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.login("chg", GOOD).status_code, 200)

    # --- verrouillage ---------------------------------------------------------

    def test_lockout_after_five_failures_then_expires(self):
        make_user("lock1", password=GOOD)
        for _ in range(4):
            self.assertEqual(self.login("lock1", "mauvais").status_code, 401)
        self.assertEqual(self.login("lock1", "mauvais").status_code, 423)
        # Même avec le bon mot de passe, le compte reste verrouillé.
        locked = self.login("lock1", GOOD)
        self.assertEqual(locked.status_code, 423)
        self.assertIn("verrouillé", locked.json()["detail"])
        self.assertTrue(AuditLog.objects.filter(description__contains="verrouillé").exists())

        LoginLockout.objects.filter(username="lock1").update(locked_until=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.login("lock1", GOOD).status_code, 200)
        self.assertFalse(LoginLockout.objects.filter(username="lock1").exists())

    def test_success_resets_failure_counter(self):
        make_user("lock2", password=GOOD)
        for _ in range(3):
            self.login("lock2", "mauvais")
        self.assertEqual(self.login("lock2", GOOD).status_code, 200)
        for _ in range(4):
            self.assertEqual(self.login("lock2", "mauvais").status_code, 401)

    def test_unknown_username_is_locked_the_same_way(self):
        for _ in range(5):
            self.login("fantome", "x")
        self.assertEqual(self.login("fantome", "x").status_code, 423)

    def test_admin_can_unlock(self):
        admin = make_user("adm", role=UserProfile.Role.ADMIN, password=GOOD)
        target = make_user("lock3", password=GOOD)
        for _ in range(5):
            self.login("lock3", "mauvais")
        self.assertEqual(self.login("lock3", GOOD).status_code, 423)
        self.assertEqual(self.login("adm", GOOD).status_code, 200)
        resp = self.post("admin-user-unlock", {}, pk=target.pk)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.login("lock3", GOOD).status_code, 200)

    # --- invitation / réinitialisation ---------------------------------------

    def _link_params(self):
        body = mail.outbox[-1].body
        match = re.search(r"activation\?uid=([^&\s]+)&token=([^\s]+)", body)
        self.assertIsNotNone(match, body)
        return match.group(1), match.group(2)

    def test_invitation_flow(self):
        make_user("adm2", role=UserProfile.Role.ADMIN, password=GOOD)
        self.login("adm2", GOOD)
        created = self.post(
            "admin-users",
            {"username": "nouveau", "email": "nouveau@example.org", "profile": {"role": "redacteur"}},
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertTrue(created.json()["invitation_envoyee"])
        user = User.objects.get(username="nouveau")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(len(mail.outbox), 1)
        uid, token = self._link_params()

        weak = self.post("auth-password-set", {"uid": uid, "token": token, "password": "court"})
        self.assertEqual(weak.status_code, 400)
        ok = self.post("auth-password-set", {"uid": uid, "token": token, "password": GOOD})
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(self.login("nouveau", GOOD).status_code, 200)
        # Le lien est à usage unique.
        reuse = self.post("auth-password-set", {"uid": uid, "token": token, "password": "Autre-Phrase-Longue-91"})
        self.assertEqual(reuse.status_code, 400)

    def test_invalid_token_is_rejected(self):
        user = make_user("tok")
        resp = self.post("auth-password-set", {"uid": "AAAA", "token": "nope", "password": GOOD})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["detail"], "Lien invalide ou expiré.")
        self.assertTrue(user.has_usable_password())

    def test_malformed_activation_payloads_never_crash(self):
        for payload in ({}, {"uid": None, "token": None}, {"uid": 5, "token": 7}, {"uid": "%%%", "token": "x"}, {"uid": "\u00e9", "token": "x", "password": GOOD}):
            resp = self.post("auth-password-set", payload)
            self.assertEqual(resp.status_code, 400, payload)

    def test_creating_user_without_email_or_password_is_refused(self):
        make_user("adm3", role=UserProfile.Role.ADMIN, password=GOOD)
        self.login("adm3", GOOD)
        resp = self.post("admin-users", {"username": "vide", "profile": {"role": "analyste"}})
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(username="vide").exists())

    def test_admin_given_password_must_respect_policy(self):
        make_user("adm4", role=UserProfile.Role.ADMIN, password=GOOD)
        self.login("adm4", GOOD)
        resp = self.post(
            "admin-users", {"username": "faible", "password": "court", "profile": {"role": "analyste"}}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(username="faible").exists())

    def test_forgot_password_is_uniform_and_sends_mail_only_for_known_account(self):
        make_user("oubli", email="oubli@example.org")
        known = self.post("auth-password-forgot", {"email": "oubli@example.org"})
        unknown = self.post("auth-password-forgot", {"email": "inconnu@example.org"})
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.assertEqual(len(mail.outbox), 1)
        uid, token = self._link_params()
        self.assertEqual(self.post("auth-password-set", {"uid": uid, "token": token, "password": GOOD}).status_code, 200)

    def test_only_admin_can_invite_or_unlock(self):
        make_user("simple", password=GOOD)
        target = make_user("cible", email="c@example.org")
        self.login("simple", GOOD)
        self.assertEqual(self.post("admin-user-invite", {}, pk=target.pk).status_code, 403)
        self.assertEqual(self.post("admin-user-unlock", {}, pk=target.pk).status_code, 403)
