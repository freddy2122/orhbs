from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from api.models import (
    AbonneNewsletter,
    AuditLog,
    ContenuEditorial,
    InscriptionOrdre,
    Publication,
    UserProfile,
)

User = get_user_model()


class CmsPublicAndOpsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="ops_admin", password="pwd12345")
        UserProfile.objects.create(
            user=self.admin, role=UserProfile.Role.ADMIN, scope=UserProfile.Scope.NATIONAL
        )
        self.partner = User.objects.create_user(username="ops_part", password="pwd12345")
        UserProfile.objects.create(
            user=self.partner, role=UserProfile.Role.PARTENAIRE, scope=UserProfile.Scope.NATIONAL
        )

    def _login(self, username="ops_admin"):
        resp = self.client.post(
            reverse("auth-login"),
            data={"username": username, "password": "pwd12345"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        return resp

    def test_login_writes_audit_log(self):
        self._login()
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.LOGIN, user=self.admin).exists()
        )

    def test_audit_list_requires_admin_or_coordination(self):
        self._login("ops_part")
        resp = self.client.get(reverse("admin-audit"))
        self.assertEqual(resp.status_code, 403)
        self._login()
        resp = self.client.get(reverse("admin-audit"))
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)

    def test_public_contenu_and_cms_crud(self):
        empty = self.client.get(reverse("public-contenus") + "?type=actualite")
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(empty.json(), [])

        self._login()
        created = self.client.post(
            reverse("cms-contenus"),
            data={
                "type_contenu": "actualite",
                "titre": "Lancement de la campagne 2026",
                "resume": "Collecte nationale des RHS.",
                "contenu": "Détail de la campagne.",
                "categorie": "Institutionnel",
                "publie": True,
            },
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        slug = created.json()["slug"]

        public = self.client.get(reverse("public-contenus") + "?type=actualite")
        self.assertEqual(len(public.json()), 1)
        detail = self.client.get(reverse("public-contenu-detail", kwargs={"slug": slug}))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["titre"], "Lancement de la campagne 2026")

    def test_newsletter_subscribe_idempotent(self):
        first = self.client.post(
            reverse("public-newsletter"),
            data={"email": "veille@example.org"},
            content_type="application/json",
        )
        self.assertEqual(first.status_code, 201)
        second = self.client.post(
            reverse("public-newsletter"),
            data={"email": "veille@example.org"},
            content_type="application/json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(AbonneNewsletter.objects.filter(email="veille@example.org").count(), 1)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_newsletter_unsubscribe_and_campaign(self):
        from django.core import mail

        subscribe = self.client.post(
            reverse("public-newsletter"),
            data={"email": "abo@example.org"},
            content_type="application/json",
        )
        self.assertEqual(subscribe.status_code, 201)
        abonne = AbonneNewsletter.objects.get(email="abo@example.org")
        token = str(abonne.token_desabonnement)

        preview = self.client.get(reverse("public-newsletter-unsub") + f"?token={token}")
        self.assertEqual(preview.status_code, 200)
        self.assertTrue(preview.json()["actif"])

        self._login()
        created = self.client.post(
            reverse("cms-newsletter-campagnes"),
            data={"sujet": "Veille RHS", "corps": "Nouvelle publication disponible."},
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        sent = self.client.post(
            reverse("cms-newsletter-campagne-send", kwargs={"pk": created.json()["id"]}),
            content_type="application/json",
        )
        self.assertEqual(sent.status_code, 200)
        self.assertGreaterEqual(sent.json()["envoi"]["sent"], 1)
        self.assertTrue(any("Veille RHS" in m.subject for m in mail.outbox))

        unsub = self.client.post(
            reverse("public-newsletter-unsub"),
            data={"token": token},
            content_type="application/json",
        )
        self.assertEqual(unsub.status_code, 200)
        abonne.refresh_from_db()
        self.assertFalse(abonne.actif)

    def test_annuaire_public_and_cms(self):
        empty = self.client.get(reverse("public-annuaire"))
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(empty.json()["stats"]["total"], 0)

        self._login()
        created = self.client.post(
            reverse("cms-annuaire"),
            data={
                "type_entree": "medecin",
                "nom": "Kouassi Ama",
                "numero_inscription": "ONM-TEST-1",
                "departement": "Littoral",
                "commune": "Cotonou",
                "statut": "inscrit",
                "publie": True,
            },
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        public = self.client.get(reverse("public-annuaire") + "?q=Kouassi")
        self.assertEqual(public.json()["stats"]["medecins"], 1)
        self.assertEqual(len(public.json()["resultats"]), 1)

    def test_monitoring_health_and_backup(self):
        self._login()
        health = self.client.get(reverse("monitoring-health"))
        self.assertEqual(health.status_code, 200)
        self.assertIn("overall_status", health.json())
        backup = self.client.post(reverse("monitoring-backup-trigger"))
        self.assertEqual(backup.status_code, 200)
        self.assertTrue(backup.json().get("success"))
        history = self.client.get(reverse("monitoring-backup-history"))
        self.assertEqual(history.status_code, 200)
        self.assertGreaterEqual(len(history.json()), 1)

    def test_openapi_schema_is_public(self):
        resp = self.client.get("/api/schema/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("openapi", resp.content.decode().lower())

    def test_rss_includes_published_publications(self):
        Publication.objects.create(
            titre="Annuaire 2025",
            slug="annuaire-2025",
            type_publication=Publication.TypePublication.ANNUAIRE_STATISTIQUE,
            publie=True,
            annee=2025,
        )
        resp = self.client.get(reverse("publications-rss"))
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Annuaire 2025", resp.content.decode())
        self.assertIn("application/rss+xml", resp["Content-Type"])
