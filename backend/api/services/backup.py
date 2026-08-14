import os
import subprocess
from datetime import datetime
from typing import Dict, List

from django.conf import settings
from django.core.management import call_command
from django.db import connection


class BackupManager:
    """Gestionnaire de sauvegardes automatiques et monitoring."""

    @staticmethod
    def create_database_backup() -> Dict:
        """Crée une sauvegarde de la base de données PostgreSQL."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        
        # Récupérer les paramètres de connexion
        db_settings = settings.DATABASES["default"]
        db_name = db_settings["NAME"]
        db_user = db_settings["USER"]
        db_password = db_settings["PASSWORD"]
        db_host = db_settings["HOST"]
        db_port = db_settings["PORT"]
        
        backup_file = os.path.join(backup_dir, f"orhsb_backup_{timestamp}.sql")
        
        try:
            # Utiliser pg_dump pour la sauvegarde
            env = os.environ.copy()
            env["PGPASSWORD"] = db_password
            
            command = [
                "pg_dump",
                f"--host={db_host}",
                f"--port={db_port}",
                f"--username={db_user}",
                f"--dbname={db_name}",
                "--no-password",
                "--format=plain",
                "--file=" + backup_file,
            ]
            
            result = subprocess.run(command, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Compresser le fichier
                compressed_file = backup_file + ".gz"
                subprocess.run(["gzip", backup_file], check=True)
                
                # Nettoyer les anciennes sauvegardes (garder les 7 derniers jours)
                BackupManager._cleanup_old_backups(backup_dir, days=7)
                
                return {
                    "success": True,
                    "backup_file": compressed_file,
                    "size": os.path.getsize(compressed_file),
                    "timestamp": timestamp,
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    @staticmethod
    def _cleanup_old_backups(backup_dir: str, days: int = 7):
        """Supprime les sauvegardes plus anciennes que X jours."""
        import time
        cutoff = time.time() - (days * 86400)
        
        for filename in os.listdir(backup_dir):
            file_path = os.path.join(backup_dir, filename)
            if os.path.isfile(file_path):
                if os.path.getmtime(file_path) < cutoff:
                    os.remove(file_path)

    @staticmethod
    def get_system_health() -> Dict:
        """Retourne l'état de santé du système."""
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "database": {"status": "unknown", "details": {}},
            "storage": {"status": "unknown", "details": {}},
            "services": {"status": "unknown", "details": {}},
        }
        
        # Vérifier la connexion à la base de données
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                health_status["database"]["status"] = "healthy"
                health_status["database"]["details"] = {"connection": "ok"}
        except Exception as e:
            health_status["database"]["status"] = "unhealthy"
            health_status["database"]["details"] = {"error": str(e)}
        
        # Vérifier l'espace disque
        try:
            import shutil
            total, used, free = shutil.disk_usage(settings.BASE_DIR)
            free_percent = (free / total) * 100
            
            health_status["storage"]["status"] = "healthy" if free_percent > 10 else "warning"
            health_status["storage"]["details"] = {
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round(used / (1024**3), 2),
                "free_gb": round(free / (1024**3), 2),
                "free_percent": round(free_percent, 2),
            }
        except Exception as e:
            health_status["storage"]["status"] = "unhealthy"
            health_status["storage"]["details"] = {"error": str(e)}
        
        # Vérifier les services critiques
        services_status = []
        
        # Vérifier si Redis est disponible (si configuré)
        if hasattr(settings, "CACHES") and "default" in settings.CACHES:
            try:
                from django.core.cache import cache
                cache.set("health_check", "ok", 10)
                if cache.get("health_check") == "ok":
                    services_status.append({"name": "cache", "status": "ok"})
                else:
                    services_status.append({"name": "cache", "status": "error"})
            except Exception as e:
                services_status.append({"name": "cache", "status": "error", "error": str(e)})
        
        health_status["services"]["status"] = "healthy" if all(s["status"] == "ok" for s in services_status) else "degraded"
        health_status["services"]["details"] = services_status
        
        # Statut global
        all_healthy = all(
            health_status["database"]["status"] == "healthy",
            health_status["storage"]["status"] in ("healthy", "warning"),
            health_status["services"]["status"] in ("healthy", "degraded"),
        )
        health_status["overall_status"] = "healthy" if all_healthy else "unhealthy"
        
        return health_status

    @staticmethod
    def get_backup_history(limit: int = 30) -> List[Dict]:
        """Retourne l'historique des sauvegardes."""
        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        
        if not os.path.exists(backup_dir):
            return []
        
        backups = []
        for filename in sorted(os.listdir(backup_dir), reverse=True)[:limit]:
            file_path = os.path.join(backup_dir, filename)
            if os.path.isfile(file_path) and filename.endswith(".gz"):
                stat = os.stat(file_path)
                backups.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "size_mb": round(stat.st_size / (1024**2), 2),
                })
        
        return backups

    @staticmethod
    def schedule_daily_backup():
        """Planifie une sauvegarde quotidienne (à appeler via cron ou celery)."""
        result = BackupManager.create_database_backup()
        
        # Logger le résultat
        if result["success"]:
            print(f"Backup réussi: {result['backup_file']}")
        else:
            print(f"Backup échoué: {result['error']}")
        
        return result


class MonitoringMetrics:
    """Collecteur de métriques pour le monitoring."""

    @staticmethod
    def get_database_metrics() -> Dict:
        """Retourne les métriques de la base de données."""
        metrics = {}
        
        try:
            with connection.cursor() as cursor:
                # Taille de la base de données
                cursor.execute("""
                    SELECT pg_database_size(%s) as size
                """, [settings.DATABASES["default"]["NAME"]])
                size = cursor.fetchone()[0]
                metrics["database_size_mb"] = round(size / (1024**2), 2)
                
                # Nombre de tables
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_schema = 'public'
                """)
                metrics["table_count"] = cursor.fetchone()[0]
                
                # Nombre d'enregistrements par table principale
                tables_to_monitor = [
                    "api_agentsante",
                    "api_declarationrhs",
                    "api_structure",
                    "api_userprofile",
                    "api_auditlog",
                ]
                
                for table in tables_to_monitor:
                    cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                    metrics[f"{table}_count"] = cursor.fetchone()[0]
                
        except Exception as e:
            metrics["error"] = str(e)
        
        return metrics

    @staticmethod
    def get_application_metrics() -> Dict:
        """Retourne les métriques de l'application."""
        from api.models import (
            AgentSante,
            DeclarationRHS,
            Structure,
            UserProfile,
            AuditLog,
        )
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "agents_count": AgentSante.objects.filter(actif=True).count(),
            "declarations_count": DeclarationRHS.objects.count(),
            "structures_count": Structure.objects.filter(actif=True).count(),
            "users_count": UserProfile.objects.count(),
            "audit_logs_count": AuditLog.objects.count(),
        }
        
        return metrics

    @staticmethod
    def get_performance_metrics() -> Dict:
        """Retourne les métriques de performance."""
        import time
        from django.db import connection
        
        metrics = {}
        
        # Temps de réponse moyen des requêtes (simulé)
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        query_time = time.time() - start
        metrics["avg_query_time_ms"] = round(query_time * 1000, 3)
        
        # Connexions actives
        metrics["active_connections"] = len(connection.queries) if settings.DEBUG else 0
        
        return metrics
