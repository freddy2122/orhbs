from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CategoriePublication, Publication, UserProfile
from api.permissions import get_user_profile
from api.serializers import (
    CategoriePublicationSerializer,
    PublicationCreateSerializer,
    PublicationSerializer,
)


class CategoriePublicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.ANALYSTE,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        categories = CategoriePublication.objects.all()
        serializer = CategoriePublicationSerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (UserProfile.Role.ADMIN, UserProfile.Role.COORDINATION):
            return Response({"detail": "Non autorisé."}, status=403)

        serializer = CategoriePublicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(serializer.data, status=201)


class PublicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        qs = Publication.objects.all()
        
        # Filtres
        publie_only = request.query_params.get("publie")
        if publie_only == "true":
            qs = qs.filter(publie=True)
        
        type_pub = request.query_params.get("type")
        if type_pub:
            qs = qs.filter(type_publication=type_pub)
        
        categorie_id = request.query_params.get("categorie")
        if categorie_id:
            qs = qs.filter(categorie_id=categorie_id)
        
        annee = request.query_params.get("annee")
        if annee:
            qs = qs.filter(annee=annee)
        
        search = request.query_params.get("q", "").strip()
        if search:
            qs = qs.filter(
                titre__icontains=search
            ) | qs.filter(
                resume__icontains=search
            ) | qs.filter(
                mot_cles__icontains=search
            )

        # Pour les partenaires et décideurs, ne montrer que les publications publiées
        if profile.role in (UserProfile.Role.PARTENAIRE, UserProfile.Role.DECIDEUR):
            qs = qs.filter(publie=True)

        serializer = PublicationSerializer(qs.order_by("-date_publication", "-created_at"), many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (UserProfile.Role.ADMIN, UserProfile.Role.COORDINATION):
            return Response({"detail": "Non autorisé."}, status=403)

        data = request.data.copy()
        if not data.get("slug"):
            data["slug"] = slugify(data.get("titre", ""))
        
        serializer = PublicationCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(cree_par=request.user)
        return Response(PublicationSerializer(serializer.instance).data, status=201)


class PublicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Publication.objects.get(pk=pk)
        except Publication.DoesNotExist:
            return None

    def get(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        publication = self.get_object(pk)
        if not publication:
            return Response({"detail": "Publication introuvable."}, status=404)

        # Incrémenter le compteur de vues
        publication.increment_vues()

        serializer = PublicationSerializer(publication)
        return Response(serializer.data)

    def patch(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (UserProfile.Role.ADMIN, UserProfile.Role.COORDINATION):
            return Response({"detail": "Non autorisé."}, status=403)

        publication = self.get_object(pk)
        if not publication:
            return Response({"detail": "Publication introuvable."}, status=404)

        data = request.data.copy()
        if "titre" in data and not data.get("slug"):
            data["slug"] = slugify(data["titre"])

        serializer = PublicationCreateSerializer(publication, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        serializer.save(modifie_par=request.user)
        return Response(PublicationSerializer(serializer.instance).data)

    def delete(self, request, pk):
        profile = get_user_profile(request.user)
        if not profile or profile.role != UserProfile.Role.ADMIN:
            return Response({"detail": "Non autorisé."}, status=403)

        publication = self.get_object(pk)
        if not publication:
            return Response({"detail": "Publication introuvable."}, status=404)

        publication.delete()
        return Response(status=204)


class PublicationDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import FileResponse, Http404

        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        publication = Publication.objects.filter(pk=pk).first()
        if not publication or not publication.fichier_pdf:
            raise Http404("Fichier non disponible")

        # Incrémenter le compteur de téléchargements
        publication.increment_telechargements()

        return FileResponse(
            publication.fichier_pdf,
            as_attachment=True,
            filename=f"{publication.slug}.pdf"
        )
