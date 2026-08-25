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
from api.models import CampagneCollecte, DeclarationRHS, UserProfile, AgentSante, AuditLog, Structure, MouvementAgent
from api.permissions import (
    CanViewAgents,
    CanViewDeclarations,
    IsCollectorOrCoordinatorOrAdmin,
    IsValidatorOrCoordinationOrAdmin,
    agents_queryset_for_user,
    declarations_queryset_for_user,
    structures_queryset_for_user,
    get_user_profile,
    user_has_any_role,
)
from rest_framework.authentication import SessionAuthentication
from api.authentication import CookieJWTAuthentication
from api.serializers import (
    AgentSanteSerializer,
    CampagneCollecteSerializer,
    DeclarationRHSCreateSerializer,
    DeclarationRHSSerializer,
    ImportFichierSerializer,
    StructureSerializer,
)
from api.services.excel_import import generate_agent_template, import_agents_excel
from api.services.export import export_agents_excel, export_agents_pdf, export_declarations_excel
from api.services.rh import birthdate_cutoff, find_duplicate_agents
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

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsCollectorOrCoordinatorOrAdmin()]
        return [IsAuthenticated(), CanViewDeclarations()]

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
    permission_classes = [IsAuthenticated, IsValidatorOrCoordinationOrAdmin]

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
        profile = get_user_profile(request.user)
        campagne = get_active_campagne()
        progress = collection_progress(campagne)
        data = []
        for row in progress:
            if (
                profile
                and profile.scope == UserProfile.Scope.DEPARTEMENTAL
                and profile.departement_id
                and row["departement"].id != profile.departement_id
            ):
                continue
            data.append(
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
            )
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
    permission_classes = [IsAuthenticated, IsCollectorOrCoordinatorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile = getattr(request.user, "profile", None)

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
    authentication_classes = [SessionAuthentication, CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsCollectorOrCoordinatorOrAdmin()]
        return [IsAuthenticated(), CanViewAgents()]

    def get(self, request):
        from django.db.models import Q

        qs = agents_queryset_for_user(
            request.user,
            AgentSante.objects.select_related(
                "structure",
                "structure__departement",
                "structure__zone_sanitaire",
                "campagne",
            ),
        )
        statut = request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut_agent=statut)
        else:
            qs = qs.filter(actif=True)

        departement = request.query_params.get("departement")
        zone = request.query_params.get("zone")
        structure_id = request.query_params.get("structure")
        profession = request.query_params.get("profession")
        secteur = request.query_params.get("secteur")
        sexe = request.query_params.get("sexe")
        specialite = request.query_params.get("specialite")
        q = request.query_params.get("q", "").strip()
        age_min = request.query_params.get("age_min")
        age_max = request.query_params.get("age_max")
        type_contrat = request.query_params.get("type_contrat")

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
        if sexe:
            qs = qs.filter(sexe=sexe)
        if specialite:
            qs = qs.filter(specialite__icontains=specialite)
        if type_contrat:
            qs = qs.filter(type_contrat=type_contrat)
        if age_min:
            qs = qs.filter(date_naissance__lte=birthdate_cutoff(int(age_min)))
        if age_max:
            qs = qs.filter(date_naissance__gte=birthdate_cutoff(int(age_max) + 1))
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
        if export_format == "pdf":
            return export_agents_pdf(qs)

        return Response(
            {
                "count": total,
                "agents": AgentSanteSerializer(agents, many=True).data,
            }
        )

    def post(self, request):
        profile = get_user_profile(request.user)
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if not data.get("structure_id") and profile and profile.structure_id:
            data["structure_id"] = profile.structure_id
        if not data.get("campagne_id"):
            campagne = get_active_campagne()
            if campagne:
                data["campagne_id"] = campagne.id

        serializer = AgentSanteSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        structure = serializer.validated_data.get("structure")
        if profile and profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id and profile.structure_id != structure.id:
            return Response({"detail": "Structure hors périmètre."}, status=403)
        if profile and profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id and profile.departement_id != structure.departement_id:
            return Response({"detail": "Structure hors périmètre."}, status=403)

        serializer.save()
        # audit log
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="AgentSante",
            object_id=str(serializer.instance.id),
            object_repr=str(serializer.instance),
            description=f"Création agent {serializer.instance}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(serializer.data, status=201)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class AgentDetailView(APIView):
    authentication_classes = [SessionAuthentication, CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAgents()]
        return [IsAuthenticated(), IsCollectorOrCoordinatorOrAdmin()]

    def get_object(self, pk, user=None):
        qs = AgentSante.objects.all()
        if user is not None:
            qs = agents_queryset_for_user(user, qs)
        return qs.filter(pk=pk).first()

    def get(self, request, pk):
        agent = self.get_object(pk, request.user)
        if not agent:
            return Response({"detail": "Introuvable."}, status=404)
        return Response(AgentSanteSerializer(agent).data)

    def patch(self, request, pk):
        agent = self.get_object(pk, request.user)
        if not agent:
            return Response({"detail": "Introuvable."}, status=404)

        profile = get_user_profile(request.user)

        serializer = AgentSanteSerializer(agent, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        # scope checks for structure change if provided
        structure = serializer.validated_data.get("structure")
        if structure:
            if profile and profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id and profile.structure_id != structure.id:
                return Response({"detail": "Structure hors périmètre."}, status=403)
            if profile and profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id and profile.departement_id != structure.departement_id:
                return Response({"detail": "Structure hors périmètre."}, status=403)

        # capture old structure for movement record
        old_structure = agent.structure

        serializer.save()

        # if structure changed, create a MouvementAgent record
        new_structure = agent.structure
        try:
            if old_structure and new_structure and old_structure.id != new_structure.id:
                MouvementAgent.objects.create(
                    agent=agent,
                    type_mouvement=MouvementAgent.TypeMouvement.MUTATION,
                    structure_origine=old_structure,
                    structure_destination=new_structure,
                    poste_precedent=serializer.validated_data.get('poste_occupe', '') or agent.poste_occupe,
                    poste_nouveau=serializer.validated_data.get('poste_occupe', '') or agent.poste_occupe,
                    date_effet=serializer.validated_data.get('date_prise_service') or agent.date_prise_service or timezone.now().date(),
                    created_by=request.user,
                )
        except Exception:
            # non-blocking: log audit with error
            AuditLog.objects.create(
                user=request.user,
                action=AuditLog.Action.UPDATE,
                model_name="MouvementAgent",
                object_id=str(agent.id),
                object_repr=str(agent),
                description=f"Erreur création mouvement pour {agent}",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="AgentSante",
            object_id=str(agent.id),
            object_repr=str(agent),
            description=f"Modification agent {agent}",
            changes=request.data,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(AgentSanteSerializer(agent).data)

    def delete(self, request, pk):
        agent = self.get_object(pk, request.user)
        if not agent:
            return Response({"detail": "Introuvable."}, status=404)

        profile = get_user_profile(request.user)
        if not user_has_any_role(request.user, UserProfile.Role.COORDINATION, UserProfile.Role.ADMIN):
            return Response({"detail": "Non autorisé."}, status=403)

        # Soft-delete: mark inactive to preserve history
        agent.actif = False
        agent.save(update_fields=["actif"])
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DELETE,
            model_name="AgentSante",
            object_id=str(pk),
            object_repr=str(agent),
            description=f"Désactivation agent {agent}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(status=204)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class AgentDuplicatesView(APIView):
    permission_classes = [IsAuthenticated, CanViewAgents]

    def get(self, request):
        qs = agents_queryset_for_user(
            request.user,
            AgentSante.objects.select_related("structure"),
        )
        return Response({"groupes": find_duplicate_agents(qs)})
