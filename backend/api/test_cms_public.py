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
        self.coord = User.objects.create_user(username="ops_coord", password="pwd12345")
        UserProfile.objects.create(
            user=self.coord, role=UserProfile.Role.COORDINATION, scope=UserProfile.Scope.NATIONAL
        )
        self.coord2 = User.objects.create_user(username="ops_coord2", password="pwd12345")
        UserProfile.objects.create(
            user=self.coord2, role=UserProfile.Role.COORDINATION, scope=UserProfile.Scope.NATIONAL
        )
        self.redac = User.objects.create_user(username="ops_redac", password="pwd12345")
        UserProfile.objects.create(
            user=self.redac, role=UserProfile.Role.REDACTEUR, scope=UserProfile.Scope.NATIONAL
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

    def _post(self, url_name, data, **kwargs):
        return self.client.post(
            reverse(url_name, **kwargs), data=data, content_type="application/json"
        )

    def _new_contenu(self, **extra):
        payload = {
            "type_contenu": "actualite",
            "titre": "Lancement de la campagne 2026",
            "resume": "Collecte nationale des RHS.",
            "contenu": "Détail de la campagne.",
            "categorie": "Institutionnel",
        }
        payload.update(extra)
        return self._post("cms-contenus", payload)

    def _workflow(self, pk, action, motif="", name="cms-contenu-workflow"):
        return self._post(name, {"action": action, "motif": motif}, kwargs={"pk": pk})

    def test_public_contenu_full_editorial_circuit(self):
        empty = self.client.get(reverse("public-contenus") + "?type=actualite")
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(empty.json(), [])

        self._login("ops_redac")
        # Les champs de publication envoyés par le client sont ignorés.
        created = self._new_contenu(publie=True, statut="publie")
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertEqual(body["statut"], "brouillon")
        self.assertFalse(body["publie"])
        self.assertIn("submit", body["actions_disponibles"])
        self.assertNotIn("publish", body["actions_disponibles"])
        pk, slug = body["id"], body["slug"]

        self.assertEqual(self.client.get(reverse("public-contenus")).json(), [])
        self.assertEqual(self._workflow(pk, "publish").status_code, 403)

        submitted = self._workflow(pk, "submit")
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.json()["statut"], "en_relecture")
        # Verrouillé pendant la relecture.
        locked = self.client.patch(
            reverse("cms-contenu-detail", kwargs={"pk": pk}),
            data={"titre": "Autre"},
            content_type="application/json",
        )
        self.assertEqual(locked.status_code, 409)

        self._login("ops_coord")
        rejected = self._workflow(pk, "reject")
        self.assertEqual(rejected.status_code, 400)  # motif requis
        rejected = self._workflow(pk, "reject", "Source à citer")
        self.assertEqual(rejected.json()["statut"], "rejete")
        self.assertEqual(rejected.json()["motif_rejet"], "Source à citer")

        self._login("ops_redac")
        self.assertEqual(self._workflow(pk, "submit").status_code, 200)

        self._login("ops_coord")
        published = self._workflow(pk, "publish")
        self.assertEqual(published.status_code, 200)
        self.assertEqual(published.json()["statut"], "publie")
        self.assertTrue(published.json()["publie"])
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.VALIDATE, user=self.coord).exists()
        )

        public = self.client.get(reverse("public-contenus") + "?type=actualite")
        self.assertEqual(len(public.json()), 1)
        self.assertNotIn("motif_rejet", public.json()[0])
        self.assertNotIn("actions_disponibles", public.json()[0])
        detail = self.client.get(reverse("public-contenu-detail", kwargs={"slug": slug}))
        self.assertEqual(detail.status_code, 200)

        # Un contenu publié est verrouillé jusqu'à la dépublication.
        locked = self.client.patch(
            reverse("cms-contenu-detail", kwargs={"pk": pk}),
            data={"titre": "Autre"},
            content_type="application/json",
        )
        self.assertEqual(locked.status_code, 409)
        self.assertEqual(self._workflow(pk, "unpublish").json()["statut"], "brouillon")
        self.assertEqual(self.client.get(reverse("public-contenus")).json(), [])

    def test_four_eyes_rule_blocks_self_publication(self):
        self._login("ops_coord")
        pk = self._new_contenu().json()["id"]
        self.assertEqual(self._workflow(pk, "submit").status_code, 200)
        denied = self._workflow(pk, "publish")
        self.assertEqual(denied.status_code, 403)
        self.assertNotIn("publish", self.client.get(reverse("cms-contenus")).json()[0]["actions_disponibles"])

        self._login("ops_coord2")
        self.assertEqual(self._workflow(pk, "publish").status_code, 200)

    def test_reviewer_who_edited_cannot_publish(self):
        self._login("ops_redac")
        pk = self._new_contenu().json()["id"]
        self._login("ops_coord")
        edited = self.client.patch(
            reverse("cms-contenu-detail", kwargs={"pk": pk}),
            data={"resume": "Relu et corrigé."},
            content_type="application/json",
        )
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(self._workflow(pk, "submit").status_code, 200)
        self.assertEqual(self._workflow(pk, "publish").status_code, 403)

    def test_redacteur_sees_only_own_content_and_cannot_publish_or_delete_published(self):
        self._login("ops_coord")
        other = self._new_contenu(titre="Contenu coordination").json()["id"]
        self._login("ops_redac")
        mine = self._new_contenu(titre="Contenu rédacteur").json()["id"]
        listing = self.client.get(reverse("cms-contenus")).json()
        self.assertEqual([i["id"] for i in listing], [mine])
        self.assertEqual(
            self.client.get(reverse("cms-contenu-detail", kwargs={"pk": other})).status_code, 404
        )
        self.assertEqual(self._workflow(other, "submit").status_code, 404)
        self.assertEqual(
            self.client.delete(reverse("cms-contenu-detail", kwargs={"pk": mine})).status_code, 204
        )

    def test_admin_and_partner_have_no_cms_access(self):
        for username in ("ops_admin", "ops_part"):
            self._login(username)
            self.assertEqual(self.client.get(reverse("cms-contenus")).status_code, 403)
            self.assertEqual(self.client.get(reverse("cms-publications")).status_code, 403)
            self.assertEqual(self._new_contenu().status_code, 403)

    def test_publication_circuit_and_public_visibility(self):
        self._login("ops_redac")
        created = self._post(
            "cms-publications",
            {"titre": "Rapport 2026", "type_publication": "rapport_annuel", "resume": "Résumé", "publie": True},
        )
        self.assertEqual(created.status_code, 201)
        pk = created.json()["id"]
        self.assertEqual(created.json()["statut"], "brouillon")
        self.assertEqual(self.client.get(reverse("public-publications")).json(), [])
        name = "cms-publication-workflow"
        self.assertEqual(self._workflow(pk, "submit", name=name).status_code, 200)
        self._login("ops_coord")
        self.assertEqual(self._workflow(pk, "publish", name=name).status_code, 200)
        self.assertEqual(len(self.client.get(reverse("public-publications")).json()), 1)

    def test_admin_cannot_assign_unknown_role(self):
        self._login()
        resp = self.client.post(
            reverse("admin-users"),
            data={"username": "x1", "password": "Mot-de-passe-solide-42", "profile": {"role": "superman"}},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(username="x1").exists())

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

        self._login("ops_coord")
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

        self._login("ops_coord")
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
