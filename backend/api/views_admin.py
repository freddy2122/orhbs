from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model
from django.db.models import Q

from api.models import (
    AgentQualification,
    AgentSante,
    AlerteEmail,
    AuditLog,
    ConfigAlerte,
    Departement,
    MouvementAgent,
    Structure,
    UserProfile,
    ZoneSanitaire,
)
from api.permissions import (
    CanViewAgents,
    IsAdmin,
    IsAdminOrCoordination,
    IsCollectorOrCoordinatorOrAdmin,
    agents_queryset_for_user,
    get_user_profile,
    user_has_any_role,
)
from api.serializers import (
    AgentQualificationSerializer,
    AlerteEmailSerializer,
    AuditLogSerializer,
    ConfigAlerteSerializer,
    DepartementSerializer,
    MouvementAgentSerializer,
    StructureSerializer,
    UserSerializer,
    UserProfileSerializer,
    ZoneSanitaireSerializer,
)

User = get_user_model()


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0]
    return request.META.get("REMOTE_ADDR")


def _apply_user_profile(user, profile_data):
    if not profile_data:
        return
    defaults = {
        "role": profile_data.get("role") or UserProfile.Role.COLLECTEUR,
        "scope": profile_data.get("scope") or UserProfile.Scope.NATIONAL,
        "poste": profile_data.get("poste") or "",
        "organisation": profile_data.get("organisation") or "",
    }
    departement = None
    if profile_data.get("departement_id"):
        departement = Departement.objects.filter(pk=profile_data.get("departement_id")).first()
    structure = None
    if profile_data.get("structure_id"):
        structure = Structure.objects.filter(pk=profile_data.get("structure_id")).first()
        if structure and not departement:
            departement = structure.departement
    defaults["departement"] = departement
    defaults["structure"] = structure
    UserProfile.objects.update_or_create(user=user, defaults=defaults)


class OrganizationManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        departements = Departement.objects.order_by("nom")
        zones = ZoneSanitaire.objects.select_related("departement").order_by("nom")
        structures = Structure.objects.select_related("departement", "zone_sanitaire").order_by("nom")
        return Response(
            {
                "departements": DepartementSerializer(departements, many=True).data,
                "zones": ZoneSanitaireSerializer(zones, many=True).data,
                "structures": StructureSerializer(structures, many=True).data,
            }
        )

    def post(self, request):
        kind = (request.data.get("kind") or request.data.get("type") or "").strip().lower()

        if kind == "departement":
            code = (request.data.get("code") or "").strip()
            nom = (request.data.get("nom") or "").strip()
            if not code or not nom:
                return Response({"detail": "Code et nom du département sont requis."}, status=400)
            departement, created = Departement.objects.update_or_create(
                code=code,
                defaults={
                    "nom": nom,
                    "population": int(request.data.get("population") or 0),
                    "actif": request.data.get("actif", True),
                },
            )
            self._log_org(request, "CREATE" if created else "UPDATE", "departement", departement)
            return Response({"kind": "departement", "created": created, "item": DepartementSerializer(departement).data}, status=201 if created else 200)

        if kind == "zone":
            code = (request.data.get("code") or "").strip()
            nom = (request.data.get("nom") or "").strip()
            departement_id = request.data.get("departement_id")
            if not code or not nom or not departement_id:
                return Response({"detail": "Code, nom et département sont requis pour une zone."}, status=400)
            departement = Departement.objects.filter(pk=departement_id).first()
            if not departement:
                return Response({"detail": "Département introuvable."}, status=404)
            zone, created = ZoneSanitaire.objects.update_or_create(
                code=code,
                defaults={
                    "nom": nom,
                    "departement": departement,
                    "actif": request.data.get("actif", True),
                },
            )
            self._log_org(request, "CREATE" if created else "UPDATE", "zone", zone)
            return Response({"kind": "zone", "created": created, "item": ZoneSanitaireSerializer(zone).data}, status=201 if created else 200)

        if kind == "structure":
            code = (request.data.get("code") or "").strip()
            nom = (request.data.get("nom") or "").strip()
            departement_id = request.data.get("departement_id")
            type_structure = request.data.get("type_structure") or Structure.TypeStructure.CS
            if not code or not nom or not departement_id:
                return Response({"detail": "Code, nom et département sont requis pour une structure."}, status=400)
            departement = Departement.objects.filter(pk=departement_id).first()
            if not departement:
                return Response({"detail": "Département introuvable."}, status=404)
            zone_id = request.data.get("zone_sanitaire_id") or None
            zone = ZoneSanitaire.objects.filter(pk=zone_id).first() if zone_id else None
            structure, created = Structure.objects.update_or_create(
                code=code,
                defaults={
                    "nom": nom,
                    "type_structure": type_structure,
                    "departement": departement,
                    "zone_sanitaire": zone,
                    "actif": request.data.get("actif", True),
                },
            )
            self._log_org(request, "CREATE" if created else "UPDATE", "structure", structure)
            return Response({"kind": "structure", "created": created, "item": StructureSerializer(structure).data}, status=201 if created else 200)

        return Response({"detail": "Type d'entité invalide : département, zone ou structure."}, status=400)

    def _log_org(self, request, action, kind, obj):
        AuditLog.objects.create(
            user=request.user,
            action=getattr(AuditLog.Action, action, AuditLog.Action.UPDATE),
            model_name=kind.capitalize(),
            object_id=str(obj.id),
            object_repr=str(obj),
            description=f"{'Création' if action == 'CREATE' else 'Modification'} {kind} {getattr(obj, 'nom', obj)}",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )


class UserManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        search = request.query_params.get("q", "").strip()
        role_filter = request.query_params.get("role")
        scope_filter = request.query_params.get("scope")

        qs = User.objects.select_related("profile").all()
        
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        
        if role_filter:
            qs = qs.filter(profile__role=role_filter)
        
        if scope_filter:
            qs = qs.filter(profile__scope=scope_filter)

        serializer = UserSerializer(qs.order_by("username"), many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        username = (data.get("username") or "").strip()
        password = data.get("password")
        if not username or not password:
            return Response({"detail": "Identifiant et mot de passe sont requis."}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Cet identifiant existe déjà."}, status=400)

        user = User.objects.create_user(
            username=username,
            email=(data.get("email") or "").strip(),
            password=password,
            first_name=(data.get("first_name") or "").strip(),
            last_name=(data.get("last_name") or "").strip(),
        )
        _apply_user_profile(user, data.get("profile") or {})

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="User",
            object_id=str(user.id),
            object_repr=user.username,
            description=f"Création utilisateur {user.username}",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        user.refresh_from_db()
        return Response(UserSerializer(user).data, status=201)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.select_related("profile").get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=404)

        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=404)

        data = request.data
        user.email = (data.get("email") if "email" in data else user.email) or ""
        if "first_name" in data:
            user.first_name = data.get("first_name") or ""
        if "last_name" in data:
            user.last_name = data.get("last_name") or ""
        if data.get("password"):
            user.set_password(data["password"])
        user.save()

        if data.get("profile"):
            _apply_user_profile(user, data.get("profile"))

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(user.id),
            object_repr=user.username,
            description=f"Modification utilisateur {user.username}",
            changes=data.get("profile") or {},
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        user.refresh_from_db()
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=404)

        username = user.username
        user.delete()
        
        # Log l'action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DELETE,
            model_name="User",
            object_id=str(pk),
            object_repr=username,
            description=f"Suppression utilisateur {username}",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        
        return Response(status=204)


class AuditLogView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        qs = AuditLog.objects.select_related("user").all()
        
        # Filtres
        user_id = request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        
        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)
        
        model_name = request.query_params.get("model")
        if model_name:
            qs = qs.filter(model_name=model_name)
        
        limit = min(int(request.query_params.get("limit", 100)), 500)
        
        serializer = AuditLogSerializer(qs.order_by("-created_at")[:limit], many=True)
        return Response(serializer.data)


class MouvementAgentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from api.permissions import agents_queryset_for_user

        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        qs = MouvementAgent.objects.select_related(
            "agent",
            "agent__structure",
            "structure_origine",
            "structure_destination",
            "valide_par",
        ).all()
        
        # Filtrer par périmètre
        if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
            qs = qs.filter(
                Q(agent__structure_id=profile.structure_id)
                | Q(structure_origine_id=profile.structure_id)
                | Q(structure_destination_id=profile.structure_id)
            )
        elif profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
            qs = qs.filter(
                Q(agent__structure__departement_id=profile.departement_id)
                | Q(structure_origine__departement_id=profile.departement_id)
                | Q(structure_destination__departement_id=profile.departement_id)
            )
        
        # Filtres additionnels
        agent_id = request.query_params.get("agent")
        if agent_id:
            qs = qs.filter(agent_id=agent_id)
        
        type_mvt = request.query_params.get("type")
        if type_mvt:
            qs = qs.filter(type_mouvement=type_mvt)
        
        serializer = MouvementAgentSerializer(qs.order_by("-date_effet"), many=True)
        return Response(serializer.data)

    def post(self, request):
        if not user_has_any_role(
            request.user,
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.VALIDATEUR,
            UserProfile.Role.COLLECTEUR,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if not data.get("structure_origine") and data.get("agent"):
            agent = AgentSante.objects.filter(pk=data.get("agent")).first()
            if agent:
                data["structure_origine"] = agent.structure_id
        serializer = MouvementAgentSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(created_by=request.user)
        from api.services.rh import apply_mouvement_to_agent

        apply_mouvement_to_agent(serializer.instance)
        
        # Log l'action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="MouvementAgent",
            object_id=str(serializer.instance.id),
            object_repr=str(serializer.instance),
            description=f"Création mouvement {serializer.instance.get_type_mouvement_display()}",
            changes=request.data,
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


class AgentQualificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsCollectorOrCoordinatorOrAdmin()]
        return [IsAuthenticated(), CanViewAgents()]

    def get(self, request):
        qs = AgentQualification.objects.select_related("agent", "ajoute_par")
        allowed = agents_queryset_for_user(request.user, AgentSante.objects.all())
        agent_id = request.query_params.get("agent")
        if agent_id:
            if not allowed.filter(pk=agent_id).exists():
                return Response({"detail": "Non autorisé."}, status=403)
            qs = qs.filter(agent_id=agent_id)
        else:
            qs = qs.filter(agent__in=allowed)
        serializer = AgentQualificationSerializer(qs.order_by("-date_obtention"), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AgentQualificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save(ajoute_par=request.user)
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="AgentQualification",
            object_id=str(serializer.instance.id),
            object_repr=str(serializer.instance),
            description=f"Ajout qualification {serializer.instance.intitule} pour {serializer.instance.agent}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(serializer.data, status=201)

    def get_client_ip(self, request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0]
        return request.META.get("REMOTE_ADDR")


class AgentQualificationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsCollectorOrCoordinatorOrAdmin]

    def get_object(self, pk):
        return AgentQualification.objects.filter(pk=pk).first()

    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"detail": "Introuvable."}, status=404)
        obj.delete()
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DELETE,
            model_name="AgentQualification",
            object_id=str(pk),
            object_repr=str(obj),
            description=f"Suppression qualification {obj.intitule}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(status=204)

    def get_client_ip(self, request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0]
        return request.META.get("REMOTE_ADDR")


class AlerteEmailListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        qs = AlerteEmail.objects.select_related(
            "structure_concernee",
            "departement_concerne",
        ).all()
        
        statut = request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        
        type_alerte = request.query_params.get("type")
        if type_alerte:
            qs = qs.filter(type_alerte=type_alerte)
        
        serializer = AlerteEmailSerializer(qs.order_by("-created_at")[:200], many=True)
        return Response(serializer.data)


class AlerteEmailDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def patch(self, request, pk):
        alerte = AlerteEmail.objects.filter(pk=pk).first()
        if not alerte:
            return Response({"detail": "Alerte introuvable."}, status=404)

        action = (request.data.get("action") or "").strip().lower()
        if action == "ignore":
            alerte.statut = AlerteEmail.StatutAlerte.IGNORE
            alerte.save(update_fields=["statut", "updated_at"])
            return Response(AlerteEmailSerializer(alerte).data)

        if action == "retry":
            from api.services.email import send_alerte

            alerte.statut = AlerteEmail.StatutAlerte.EN_ATTENTE
            alerte.save(update_fields=["statut", "updated_at"])
            send_alerte(alerte)
            alerte.refresh_from_db()
            return Response(AlerteEmailSerializer(alerte).data)

        if action == "traiter":
            from django.utils import timezone

            alerte.statut = AlerteEmail.StatutAlerte.TRAITE
            alerte.action_prise = request.data.get("action_prise") or request.data.get("commentaire") or "Traité"
            alerte.date_traitement = timezone.now()
            alerte.traite_par = request.user
            alerte.save(update_fields=["statut", "action_prise", "date_traitement", "traite_par", "updated_at"])
            return Response(AlerteEmailSerializer(alerte).data)

        return Response({"detail": "Action invalide (ignore, retry ou traiter)."}, status=400)


class ConfigAlerteListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        configs = ConfigAlerte.objects.all()
        serializer = ConfigAlerteSerializer(configs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ConfigAlerteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(modifie_par=request.user)
        return Response(serializer.data, status=201)


class ConfigAlerteDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get_object(self, pk):
        try:
            return ConfigAlerte.objects.get(pk=pk)
        except ConfigAlerte.DoesNotExist:
            return None

    def patch(self, request, pk):
        config = self.get_object(pk)
        if not config:
            return Response({"detail": "Configuration introuvable."}, status=404)

        serializer = ConfigAlerteSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(modifie_par=request.user)
        return Response(serializer.data)


class OrganizationDetailView(APIView):
    """Update or delete a department/zone/structure.

    URL: /api/admin/organization/<kind>/<pk>/ where kind is 'departement', 'zone' or 'structure'
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, kind, pk):
        kind = (kind or "").strip().lower()
        try:
            if kind == "departement":
                return Departement.objects.get(pk=pk)
            if kind == "zone":
                return ZoneSanitaire.objects.get(pk=pk)
            if kind == "structure":
                return Structure.objects.get(pk=pk)
        except (Departement.DoesNotExist, ZoneSanitaire.DoesNotExist, Structure.DoesNotExist):
            return None

    def get_serializer_and_instance(self, kind, instance, data=None, partial=True):
        kind = (kind or "").strip().lower()
        if kind == "departement":
            return DepartementSerializer(instance, data=data, partial=partial)
        if kind == "zone":
            return ZoneSanitaireSerializer(instance, data=data, partial=partial)
        if kind == "structure":
            return StructureSerializer(instance, data=data, partial=partial)
        return None

    def get(self, request, kind, pk):
        obj = self.get_object(kind, pk)
        if not obj:
            return Response({"detail": "Entité introuvable."}, status=404)

        if kind == "departement":
            return Response({"kind": "departement", "item": DepartementSerializer(obj).data})
        if kind == "zone":
            return Response({"kind": "zone", "item": ZoneSanitaireSerializer(obj).data})
        if kind == "structure":
            return Response({"kind": "structure", "item": StructureSerializer(obj).data})

        return Response({"detail": "Type d'entité invalide."}, status=400)

    def patch(self, request, kind, pk):
        obj = self.get_object(kind, pk)
        if not obj:
            return Response({"detail": "Entité introuvable."}, status=404)

        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)

        serializer = self.get_serializer_and_instance(kind, obj, data=data, partial=True)
        if serializer is None:
            return Response({"detail": "Type d'entité invalide."}, status=400)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        serializer.save()

        # Log modification
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name=kind.capitalize(),
            object_id=str(pk),
            object_repr=str(obj),
            description=f"Modification {kind} {getattr(obj, 'nom', str(obj))}",
            changes=request.data,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        if kind == "departement":
            return Response({"kind": "departement", "item": DepartementSerializer(obj).data})
        if kind == "zone":
            return Response({"kind": "zone", "item": ZoneSanitaireSerializer(obj).data})
        if kind == "structure":
            return Response({"kind": "structure", "item": StructureSerializer(obj).data})

        return Response(status=200)

    def delete(self, request, kind, pk):
        obj = self.get_object(kind, pk)
        if not obj:
            return Response({"detail": "Entité introuvable."}, status=404)

        # Prevent destructive deletions when dependent objects exist
        if kind == "departement":
            if ZoneSanitaire.objects.filter(departement_id=obj.id).exists() or Structure.objects.filter(departement_id=obj.id).exists():
                return Response({"detail": "Impossible de supprimer : des zones ou structures sont rattachées à ce département."}, status=400)
        if kind == "zone":
            if Structure.objects.filter(zone_sanitaire_id=obj.id).exists():
                return Response({"detail": "Impossible de supprimer : des structures sont rattachées à cette zone sanitaire."}, status=400)

        # For structure, perform a hard delete; for others, delete if allowed
        obj_repr = getattr(obj, "nom", str(obj))
        obj_id = obj.id
        obj.delete()

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DELETE,
            model_name=kind.capitalize(),
            object_id=str(obj_id),
            object_repr=obj_repr,
            description=f"Suppression {kind} {obj_repr}",
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
