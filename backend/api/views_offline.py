import json
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import UserProfile
from api.permissions import get_user_profile
from api.services.offline import OfflineSyncManager


class OfflineDataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Exporte les données nécessaires pour le travail hors ligne."""
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        offline_data = OfflineSyncManager.prepare_offline_data(request.user)
        if not offline_data:
            return Response({"detail": "Impossible de préparer les données hors ligne."}, status=400)

        return Response(offline_data)


class OfflineSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Synchronise les données créées/modifiées hors ligne."""
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        sync_type = request.data.get("type")
        
        if sync_type == "declaration":
            result = OfflineSyncManager.sync_declaration(
                request.user,
                request.data.get("declaration", {})
            )
        elif sync_type == "agents_batch":
            result = OfflineSyncManager.sync_agents_batch(
                request.user,
                request.data.get("agents", [])
            )
        else:
            return Response({"detail": "Type de synchronisation invalide."}, status=400)

        return Response(result)


class OfflineConflictDetectionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Détecte les conflits entre données locales et serveur."""
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        offline_data = request.data.get("offline_data", {})
        conflicts = OfflineSyncManager.detect_conflicts(request.user, offline_data)

        return Response({
            "has_conflicts": len(conflicts) > 0,
            "conflicts": conflicts,
        })
