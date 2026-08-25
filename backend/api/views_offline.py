from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.services.offline import OfflineSyncManager


class OfflineDataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        offline_data = OfflineSyncManager.prepare_offline_data(request.user)
        if not offline_data:
            return Response({"detail": "Impossible de préparer les données hors ligne."}, status=400)
        return Response(offline_data)


class OfflineSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, "profile", None):
            return Response({"detail": "Non autorisé."}, status=403)

        sync_type = request.data.get("type")
        if sync_type == "declaration":
            result = OfflineSyncManager.sync_declaration(
                request.user,
                request.data.get("declaration", {}),
            )
        elif sync_type == "agents_batch":
            result = OfflineSyncManager.sync_agents_batch(
                request.user,
                request.data.get("agents", []),
            )
        else:
            return Response({"detail": "Type de synchronisation invalide."}, status=400)

        status_code = 200 if result.get("success") or result.get("success") == 0 else 400
        if sync_type == "agents_batch":
            status_code = 200
        elif result.get("conflict"):
            status_code = 409
        elif not result.get("success"):
            status_code = 400
        return Response(result, status=status_code)


class OfflineConflictDetectionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, "profile", None):
            return Response({"detail": "Non autorisé."}, status=403)

        offline_data = request.data.get("offline_data", {})
        conflicts = OfflineSyncManager.detect_conflicts(request.user, offline_data)
        return Response({"has_conflicts": len(conflicts) > 0, "conflicts": conflicts})
