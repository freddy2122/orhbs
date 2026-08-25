from django.core.management.base import BaseCommand

from api.services.alerts import AlertGenerator, ensure_default_configs
from api.services.backup import BackupManager
from api.services.email import send_pending_alerts
from api.services.newsletter import send_pending_newsletters


class Command(BaseCommand):
    help = "Tâches planifiées : génération d'alertes, envoi des emails, sauvegarde optionnelle."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-alerts",
            action="store_true",
            help="Ne génère pas les alertes.",
        )
        parser.add_argument(
            "--skip-send",
            action="store_true",
            help="N'envoie pas les emails en attente.",
        )
        parser.add_argument(
            "--skip-backup",
            action="store_true",
            help="Ne lance pas la sauvegarde PostgreSQL.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Calcule les alertes sans envoyer ni sauvegarder.",
        )

    def handle(self, *args, **options):
        ensure_default_configs()
        self.stdout.write("Configurations d'alerte à jour.")

        if not options["skip_alerts"]:
            created = AlertGenerator.run_all_checks()
            self.stdout.write(self.style.SUCCESS(f"{len(created)} alerte(s) créée(s)."))

        if options["dry_run"]:
            self.stdout.write("Dry-run : aucun email ni sauvegarde.")
            return

        if not options["skip_send"]:
            result = send_pending_alerts()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Alertes : {result['sent']} envoyée(s), {result['errors']} erreur(s)."
                )
            )
            news = send_pending_newsletters()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Newsletter : {news['sent']} envoyé(s), {news['errors']} erreur(s)."
                )
            )

        if not options["skip_backup"]:
            backup = BackupManager.create_database_backup()
            if backup.get("success"):
                self.stdout.write(self.style.SUCCESS(f"Sauvegarde : {backup.get('backup_file')}"))
            else:
                self.stdout.write(self.style.WARNING(f"Sauvegarde ignorée ou échouée : {backup.get('error')}"))
