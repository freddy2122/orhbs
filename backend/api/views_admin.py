from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model
from django.db.models import Q

from api.models import AlerteEmail, AuditLog, ConfigAlerte, MouvementAgent, UserProfile
from api.permissions import get_user_profile
from api.serializers import (
    AlerteEmailSerializer,
    AuditLogSerializer,
    ConfigAlerteSerializer,
    MouvementAgentSerializer,
    UserSerializer,
    UserProfileSerializer,
)

User = get_user_model()


class UserManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

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
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        from django.contrib.auth.hashers import make_password

        data = request.data.copy()
        password = data.pop("password", None)
        if password:
            data["password"] = make_password(password)

        profile_data = data.pop("profile", {})
        
        serializer = UserSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        user = serializer.save()
        
        # Créer ou mettre à jour le profil
        if hasattr(user, "profile"):
            profile_serializer = UserProfileSerializer(user.profile, data=profile_data, partial=True)
        else:
            profile_serializer = UserProfileSerializer(data={**profile_data, "user": user.id})
        
        if not profile_serializer.is_valid():
            user.delete()
            return Response(profile_serializer.errors, status=400)
        
        profile_serializer.save()
        
        # Log l'action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="User",
            object_id=str(user.id),
            object_repr=user.username,
            description=f"Création utilisateur {user.username}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        
        return Response(UserSerializer(user).data, status=201)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return User.objects.select_related("profile").get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=404)

        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=404)

        data = request.data.copy()
        password = data.pop("password", None)
        if password:
            from django.contrib.auth.hashers import make_password
            data["password"] = make_password(password)

        profile_data = data.pop("profile", None)
        
        serializer = UserSerializer(user, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save()
        
        if profile_data and hasattr(user, "profile"):
            profile_serializer = UserProfileSerializer(user.profile, data=profile_data, partial=True)
            if profile_serializer.is_valid():
                profile_serializer.save()
        
        # Log l'action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(user.id),
            object_repr=user.username,
            description=f"Modification utilisateur {user.username}",
            changes=profile_data or data,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

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


class AuditLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

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
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        from api.permissions import agents_queryset_for_user

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
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.VALIDATEUR,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        serializer = MouvementAgentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(created_by=request.user)
        
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


class AlerteEmailListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

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
        
        serializer = AlerteEmailSerializer(qs.order_by("-created_at"), many=True)
        return Response(serializer.data)


class ConfigAlerteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        configs = ConfigAlerte.objects.all()
        serializer = ConfigAlerteSerializer(configs, many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        serializer = ConfigAlerteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(modifie_par=request.user)
        return Response(serializer.data, status=201)


class ConfigAlerteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return ConfigAlerte.objects.get(pk=pk)
        except ConfigAlerte.DoesNotExist:
            return None

    def patch(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        config = self.get_object(pk)
        if not config:
            return Response({"detail": "Configuration introuvable."}, status=404)

        serializer = ConfigAlerteSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(modifie_par=request.user)
        return Response(serializer.data)
