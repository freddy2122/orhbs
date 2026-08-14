from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CampagneCollecte, UserProfile
from api.permissions import get_user_profile
from api.serializers import CampagneCollecteSerializer
from api.services.stats import (
    departement_stats,
    get_active_campagne,
    national_stats,
    structure_stats,
    zone_stats,
)


def serialize_campagne(campagne):
    if not campagne:
        return None
    return CampagneCollecteSerializer(campagne).data


def serialize_totals(totals):
    return {
        "effectif_total": totals["effectif_total"],
        "medecins": totals["medecins"],
        "infirmiers": totals["infirmiers"],
        "sages_femmes": totals["sages_femmes"],
        "dont_femmes": totals["dont_femmes"],
        "structures_count": totals["structures_count"],
    }


class NationalStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)
        
        # Les statistiques nationales ne sont accessibles qu'aux rôles nationaux
        if profile.scope not in (UserProfile.Scope.NATIONAL, UserProfile.Scope.DEPARTEMENTAL):
            return Response({"detail": "Non autorisé pour ce périmètre."}, status=403)
        
        campagne_code = request.query_params.get("campagne")
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else get_active_campagne()
        )
        stats = national_stats(campagne)
        totals = stats["totals"]
        return Response(
            {
                "campagne": serialize_campagne(stats["campagne"]),
                "effectif_total": totals["effectif_total"],
                "medecins": totals["medecins"],
                "infirmiers": totals["infirmiers"],
                "sages_femmes": totals["sages_femmes"],
                "dont_femmes": totals["dont_femmes"],
                "ratio_medecins": stats["ratio_medecins"],
                "ratio_infirmiers": stats["ratio_infirmiers"],
                "population": stats["population"],
                "structures_actives": stats["structures_actives"],
                "structures_declarantes": stats["structures_declarantes"],
                "taux_reponse": stats["taux_reponse"],
                "departements_couverts": stats["departements_couverts"],
                "departements_total": stats["departements_total"],
                "en_attente_validation": stats["en_attente_validation"],
            }
        )


class DepartementStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)
        
        campagne_code = request.query_params.get("campagne")
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else get_active_campagne()
        )
        rows = departement_stats(campagne)
        data = []
        for row in rows:
            dept = row["departement"]
            
            # Filtrer par périmètre utilisateur
            if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
                if dept.id != profile.departement_id:
                    continue
            
            data.append(
                {
                    "departement": {
                        "code": dept.code,
                        "nom": dept.nom,
                        "population": dept.population,
                    },
                    "rang": row["rang"],
                    "totals": serialize_totals(row["totals"]),
                    "ratio_medecins": row["ratio_medecins"],
                    "structures_total": row["structures_total"],
                    "structures_declarantes": row["structures_declarantes"],
                    "taux_reponse": row["taux_reponse"],
                }
            )
        return Response({"campagne": serialize_campagne(campagne), "departements": data})


class ZoneStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)
        
        campagne_code = request.query_params.get("campagne")
        departement_code = request.query_params.get("departement")
        
        # Si utilisateur départemental, forcer son département
        if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
            from api.models import Departement
            dept = Departement.objects.filter(id=profile.departement_id).first()
            if dept:
                departement_code = dept.code
        
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else get_active_campagne()
        )
        rows = zone_stats(campagne, departement_code)
        data = []
        for row in rows:
            zone = row["zone"]
            data.append(
                {
                    "zone": {"code": zone.code, "nom": zone.nom},
                    "departement": {
                        "code": row["departement"].code,
                        "nom": row["departement"].nom,
                    },
                    "totals": serialize_totals(row["totals"]),
                    "ratio_medecins": row["ratio_medecins"],
                    "structures_total": row["structures_total"],
                    "structures_declarantes": row["structures_declarantes"],
                    "taux_reponse": row["taux_reponse"],
                }
            )
        return Response({"campagne": serialize_campagne(campagne), "zones": data})


class StructureStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)
        
        campagne_code = request.query_params.get("campagne")
        departement_code = request.query_params.get("departement")
        zone_code = request.query_params.get("zone")
        type_structure = request.query_params.get("type")
        
        # Filtrer par périmètre utilisateur
        if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
            from api.models import Departement
            dept = Departement.objects.filter(id=profile.departement_id).first()
            if dept:
                departement_code = dept.code
        
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else get_active_campagne()
        )
        rows = structure_stats(campagne, departement_code, zone_code, type_structure)
        data = []
        for row in rows:
            structure = row["structure"]
            zone = row["zone"]
            
            # Filtrer par périmètre utilisateur (structure)
            if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
                if structure.id != profile.structure_id:
                    continue
            
            data.append(
                {
                    "structure": {
                        "code": structure.code,
                        "nom": structure.nom,
                        "type_structure": structure.type_structure,
                        "type_structure_label": structure.get_type_structure_display(),
                    },
                    "departement": {
                        "code": row["departement"].code,
                        "nom": row["departement"].nom,
                    },
                    "zone": {"code": zone.code, "nom": zone.nom} if zone else None,
                    "effectif_total": row["effectif_total"],
                    "medecins": row["medecins"],
                    "infirmiers": row["infirmiers"],
                    "sages_femmes": row["sages_femmes"],
                    "dont_femmes": row["dont_femmes"],
                    "date_validation": row["date_validation"],
                }
            )
        return Response({"campagne": serialize_campagne(campagne), "structures": data})
