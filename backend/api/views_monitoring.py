from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import UserProfile
from api.permissions import get_user_profile
from api.services.backup import BackupManager, MonitoringMetrics


class SystemHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retourne l'état de santé du système."""
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        health = BackupManager.get_system_health()
        return Response(health)


class BackupTriggerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Déclenche une sauvegarde manuelle."""
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        result = BackupManager.create_database_backup()
        return Response(result)


class BackupHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retourne l'historique des sauvegardes."""
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        limit = int(request.query_params.get("limit", 30))
        history = BackupManager.get_backup_history(limit)
        return Response(history)


class MonitoringMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retourne les métriques de monitoring."""
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        metrics_type = request.query_params.get("type", "all")
        
        if metrics_type == "database":
            metrics = MonitoringMetrics.get_database_metrics()
        elif metrics_type == "application":
            metrics = MonitoringMetrics.get_application_metrics()
        elif metrics_type == "performance":
            metrics = MonitoringMetrics.get_performance_metrics()
        else:
            metrics = {
                "database": MonitoringMetrics.get_database_metrics(),
                "application": MonitoringMetrics.get_application_metrics(),
                "performance": MonitoringMetrics.get_performance_metrics(),
            }
        
        return Response(metrics)
