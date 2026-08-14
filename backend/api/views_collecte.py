from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.constants.rhs_fields import (
    DECLARATION_EFFECTIF_FIELDS,
    DECLARATION_PLANIFICATION_FIELDS,
    DECLARATION_PROFESSION_FIELDS,
    PROFESSIONS_SANTE,
)
from api.models import CampagneCollecte, DeclarationRHS, UserProfile
from api.permissions import declarations_queryset_for_user, structures_queryset_for_user
from api.serializers import (
    AgentSanteSerializer,
    CampagneCollecteSerializer,
    DeclarationRHSCreateSerializer,
    DeclarationRHSSerializer,
    ImportFichierSerializer,
    StructureSerializer,
)
from api.services.excel_import import generate_agent_template, import_agents_excel
from api.services.export import export_agents_excel, export_declarations_excel
from api.services.stats import collection_progress, get_active_campagne


class ActiveCampagneView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        campagne = get_active_campagne()
        if not campagne:
            return Response({"detail": "Aucune campagne active."}, status=404)
        return Response(CampagneCollecteSerializer(campagne).data)


class DeclarationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = declarations_queryset_for_user(request.user).select_related(
            "structure",
            "structure__departement",
            "structure__zone_sanitaire",
            "campagne",
        )
        campagne_id = request.query_params.get("campagne")
        statut = request.query_params.get("statut")
        if campagne_id:
            qs = qs.filter(campagne_id=campagne_id)
        if statut:
            qs = qs.filter(statut=statut)
        
        # Export Excel si demandé
        export_format = request.query_params.get("export")
        if export_format == "excel":
            return export_declarations_excel(qs)
        
        serializer = DeclarationRHSSerializer(qs.order_by("-updated_at"), many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = getattr(request.user, "profile", None)
        if not profile or profile.role not in (
            UserProfile.Role.COLLECTEUR,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.ADMIN,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        serializer = DeclarationRHSCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        structure = serializer.validated_data["structure"]
        if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id != structure.id:
            return Response({"detail": "Structure hors périmètre."}, status=403)
        if (
            profile.scope == UserProfile.Scope.DEPARTEMENTAL
            and profile.departement_id != structure.departement_id
        ):
            return Response({"detail": "Structure hors périmètre."}, status=403)

        declaration, created = DeclarationRHS.objects.update_or_create(
            campagne=serializer.validated_data["campagne"],
            structure=structure,
            defaults={
                k: v
                for k, v in serializer.validated_data.items()
                if k not in ("campagne", "structure")
            },
        )
        if declaration.statut == DeclarationRHS.Statut.REJETE:
            declaration.statut = DeclarationRHS.Statut.BROUILLON
            declaration.save(update_fields=["statut"])

        return Response(
            DeclarationRHSSerializer(declaration).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeclarationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return declarations_queryset_for_user(request.user).filter(pk=pk).first()

    def patch(self, request, pk):
        declaration = self.get_object(request, pk)
        if not declaration:
            return Response({"detail": "Introuvable."}, status=404)
        if declaration.statut not in (
            DeclarationRHS.Statut.BROUILLON,
            DeclarationRHS.Statut.REJETE,
        ):
            return Response({"detail": "Déclaration non modifiable."}, status=400)

        serializer = DeclarationRHSCreateSerializer(
            declaration,
            data=request.data,
            partial=True,
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(DeclarationRHSSerializer(declaration).data)


class DeclarationSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        declaration = declarations_queryset_for_user(request.user).filter(pk=pk).first()
        if not declaration:
            return Response({"detail": "Introuvable."}, status=404)
        if declaration.statut not in (
            DeclarationRHS.Statut.BROUILLON,
            DeclarationRHS.Statut.REJETE,
        ):
            return Response({"detail": "Statut incompatible."}, status=400)

        declaration.statut = DeclarationRHS.Statut.SOUMIS
        declaration.soumis_par = request.user
        declaration.date_soumission = timezone.now()
        declaration.commentaire_rejet = ""
        declaration.save()
        return Response(DeclarationRHSSerializer(declaration).data)


class DeclarationValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        profile = getattr(request.user, "profile", None)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        declaration = declarations_queryset_for_user(request.user).filter(pk=pk).first()
        if not declaration:
            return Response({"detail": "Introuvable."}, status=404)

        action = request.data.get("action", "approve")
        level = request.data.get("level", "departement")

        if action == "reject":
            if profile.role not in (
                UserProfile.Role.VALIDATEUR,
                UserProfile.Role.COORDINATION,
                UserProfile.Role.ADMIN,
            ):
                return Response({"detail": "Non autorisé."}, status=403)
            declaration.statut = DeclarationRHS.Statut.REJETE
            declaration.commentaire_rejet = request.data.get("commentaire", "")
            declaration.save()
            return Response(DeclarationRHSSerializer(declaration).data)

        if level == "national":
            if profile.role not in (
                UserProfile.Role.COORDINATION,
                UserProfile.Role.ADMIN,
                UserProfile.Role.VALIDATEUR,
            ) or profile.scope != UserProfile.Scope.NATIONAL:
                return Response({"detail": "Validation nationale réservée."}, status=403)
            if declaration.statut != DeclarationRHS.Statut.VALIDE_DEPARTEMENT:
                return Response({"detail": "Validation départementale requise."}, status=400)
            declaration.statut = DeclarationRHS.Statut.VALIDE_NATIONAL
            declaration.valide_national_par = request.user
            declaration.date_valide_national = timezone.now()
        else:
            if profile.role not in (
                UserProfile.Role.VALIDATEUR,
                UserProfile.Role.COORDINATION,
                UserProfile.Role.ADMIN,
            ):
                return Response({"detail": "Non autorisé."}, status=403)
            if declaration.statut != DeclarationRHS.Statut.SOUMIS:
                return Response({"detail": "La déclaration doit être soumise."}, status=400)
            declaration.statut = DeclarationRHS.Statut.VALIDE_DEPARTEMENT
            declaration.valide_dept_par = request.user
            declaration.date_valide_dept = timezone.now()

        declaration.save()
        return Response(DeclarationRHSSerializer(declaration).data)


class CollectionProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        campagne = get_active_campagne()
        progress = collection_progress(campagne)
        data = [
            {
                "departement": {
                    "code": row["departement"].code,
                    "nom": row["departement"].nom,
                },
                "structures_total": row["structures_total"],
                "structures_soumises": row["structures_soumises"],
                "structures_validees": row["structures_validees"],
                "taux_reponse": row["taux_reponse"],
            }
            for row in progress
        ]
        return Response({"campagne": CampagneCollecteSerializer(campagne).data if campagne else None, "progress": data})


class CollecteFieldsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def pack(fields):
            return [{"key": k, "label": label, "required": req} for k, label, req in fields]

        return Response(
            {
                "effectifs": pack(DECLARATION_EFFECTIF_FIELDS),
                "professions": pack(DECLARATION_PROFESSION_FIELDS),
                "planification": pack(DECLARATION_PLANIFICATION_FIELDS),
                "professions_sante": PROFESSIONS_SANTE,
            }
        )


class StructureListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = structures_queryset_for_user(request.user).select_related(
            "departement",
            "zone_sanitaire",
        )
        return Response(StructureSerializer(qs.order_by("nom"), many=True).data)


class ExcelTemplateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        buffer = generate_agent_template()
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="modele-agents-orhs.xlsx"'
        return response


class ExcelImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile = getattr(request.user, "profile", None)
        if not profile or profile.role not in (
            UserProfile.Role.COLLECTEUR,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.ADMIN,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        fichier = request.FILES.get("file")
        if not fichier:
            return Response({"detail": "Fichier requis."}, status=400)

        campagne = get_active_campagne()
        if not campagne:
            return Response({"detail": "Aucune campagne active."}, status=400)

        structure = None
        if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
            structure = profile.structure

        log = import_agents_excel(fichier, campagne, request.user, structure)
        return Response(ImportFichierSerializer(log).data)


class AgentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q

        from api.models import AgentSante

        qs = AgentSante.objects.filter(actif=True).select_related(
            "structure",
            "structure__departement",
            "structure__zone_sanitaire",
            "campagne",
        )
        profile = getattr(request.user, "profile", None)
        if profile and profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
            qs = qs.filter(structure_id=profile.structure_id)
        elif profile and profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
            qs = qs.filter(structure__departement_id=profile.departement_id)

        departement = request.query_params.get("departement")
        zone = request.query_params.get("zone")
        structure_id = request.query_params.get("structure")
        profession = request.query_params.get("profession")
        secteur = request.query_params.get("secteur")
        statut = request.query_params.get("statut")
        q = request.query_params.get("q", "").strip()

        if departement:
            qs = qs.filter(structure__departement__code=departement)
        if zone:
            qs = qs.filter(structure__zone_sanitaire__code=zone)
        if structure_id:
            qs = qs.filter(structure_id=structure_id)
        if profession:
            qs = qs.filter(profession__icontains=profession)
        if secteur:
            qs = qs.filter(secteur=secteur)
        if statut:
            qs = qs.filter(statut_agent=statut)
        if q:
            qs = qs.filter(
                Q(nom__icontains=q)
                | Q(prenom__icontains=q)
                | Q(matricule__icontains=q)
                | Q(profession__icontains=q)
                | Q(structure__nom__icontains=q)
                | Q(poste_occupe__icontains=q)
            )

        qs = qs.order_by("nom", "prenom")
        total = qs.count()
        limit = min(int(request.query_params.get("limit", 500)), 1000)
        agents = qs[:limit]

        # Export Excel si demandé
        export_format = request.query_params.get("export")
        if export_format == "excel":
            return export_agents_excel(qs)

        return Response(
            {
                "count": total,
                "agents": AgentSanteSerializer(agents, many=True).data,
            }
        )
