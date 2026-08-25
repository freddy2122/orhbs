from django.utils import timezone
from django.utils.text import slugify
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import (
    CategoriePublication,
    ContenuEditorial,
    InscriptionOrdre,
    Publication,
    UserProfile,
)
from api.permissions import IsAdminOrCoordination, user_has_any_role
from api.serializers import (
    CategoriePublicationSerializer,
    ContenuEditorialSerializer,
    InscriptionOrdreSerializer,
    PublicationCreateSerializer,
    PublicationSerializer,
)


class CategoriePublicationListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        categories = CategoriePublication.objects.all()
        serializer = CategoriePublicationSerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CategoriePublicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(serializer.data, status=201)


class PublicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
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
        if user_has_any_role(request.user, UserProfile.Role.PARTENAIRE, UserProfile.Role.DECIDEUR):
            qs = qs.filter(publie=True)

        serializer = PublicationSerializer(qs.order_by("-date_publication", "-created_at"), many=True)
        return Response(serializer.data)

    def post(self, request):
        if not user_has_any_role(
            request.user,
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        data = request.data.copy()
        if not data.get("slug"):
            data["slug"] = slugify(data.get("titre", ""))
        
        serializer = PublicationCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        publication = serializer.save(cree_par=request.user)
        if publication.publie and not publication.date_publication:
            publication.date_publication = timezone.now()
            publication.save(update_fields=["date_publication"])
        return Response(PublicationSerializer(publication).data, status=201)


class PublicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Publication.objects.get(pk=pk)
        except Publication.DoesNotExist:
            return None

    def get(self, request, pk):
        if not getattr(request.user, "profile", None):
            return Response({"detail": "Non autorisé."}, status=403)

        publication = self.get_object(pk)
        if not publication:
            return Response({"detail": "Publication introuvable."}, status=404)

        # Incrémenter le compteur de vues
        publication.increment_vues()

        serializer = PublicationSerializer(publication)
        return Response(serializer.data)

    def patch(self, request, pk):
        if not user_has_any_role(
            request.user,
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
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
        
        publication = serializer.save(modifie_par=request.user)
        if publication.publie and not publication.date_publication:
            publication.date_publication = timezone.now()
            publication.save(update_fields=["date_publication"])
        return Response(PublicationSerializer(publication).data)

    def delete(self, request, pk):
        if not user_has_any_role(
            request.user,
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
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

        if not getattr(request.user, "profile", None):
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


class PublicationUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        publication = Publication.objects.filter(pk=pk).first()
        if not publication:
            return Response({"detail": "Publication introuvable."}, status=404)
        fichier = request.FILES.get("fichier_pdf") or request.FILES.get("file")
        if not fichier:
            return Response({"detail": "Fichier PDF requis."}, status=400)
        publication.fichier_pdf = fichier
        publication.fichier_taille = fichier.size
        publication.save(update_fields=["fichier_pdf", "fichier_taille", "updated_at"])
        return Response(PublicationSerializer(publication, context={"request": request}).data)


def _unique_slug(base: str) -> str:
    slug = slugify(base) or "contenu"
    candidate = slug
    index = 2
    while ContenuEditorial.objects.filter(slug=candidate).exists():
        candidate = f"{slug}-{index}"
        index += 1
    return candidate


class ContenuEditorialListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        qs = ContenuEditorial.objects.all()
        type_contenu = request.query_params.get("type")
        if type_contenu:
            qs = qs.filter(type_contenu=type_contenu)
        return Response(
            ContenuEditorialSerializer(qs.order_by("-date_publication", "-created_at"), many=True).data
        )

    def post(self, request):
        data = request.data.copy()
        if not data.get("slug"):
            data["slug"] = _unique_slug(data.get("titre", ""))
        serializer = ContenuEditorialSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save(cree_par=request.user)
        if item.publie and not item.date_publication:
            item.date_publication = timezone.now()
            item.save(update_fields=["date_publication"])
        return Response(ContenuEditorialSerializer(item).data, status=201)


class ContenuEditorialDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def patch(self, request, pk):
        item = ContenuEditorial.objects.filter(pk=pk).first()
        if not item:
            return Response({"detail": "Contenu introuvable."}, status=404)
        data = request.data.copy()
        if "titre" in data and not data.get("slug"):
            data["slug"] = _unique_slug(data["titre"])
        serializer = ContenuEditorialSerializer(item, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save()
        if item.publie and not item.date_publication:
            item.date_publication = timezone.now()
            item.save(update_fields=["date_publication"])
        return Response(ContenuEditorialSerializer(item).data)

    def delete(self, request, pk):
        item = ContenuEditorial.objects.filter(pk=pk).first()
        if not item:
            return Response({"detail": "Contenu introuvable."}, status=404)
        item.delete()
        return Response(status=204)


class InscriptionOrdreListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        qs = InscriptionOrdre.objects.all()
        type_entree = request.query_params.get("type")
        if type_entree:
            qs = qs.filter(type_entree=type_entree)
        return Response(InscriptionOrdreSerializer(qs, many=True).data)

    def post(self, request):
        serializer = InscriptionOrdreSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save()
        return Response(InscriptionOrdreSerializer(item).data, status=201)


class InscriptionOrdreDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def patch(self, request, pk):
        item = InscriptionOrdre.objects.filter(pk=pk).first()
        if not item:
            return Response({"detail": "Inscription introuvable."}, status=404)
        serializer = InscriptionOrdreSerializer(item, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save()
        return Response(InscriptionOrdreSerializer(item).data)

    def delete(self, request, pk):
        item = InscriptionOrdre.objects.filter(pk=pk).first()
        if not item:
            return Response({"detail": "Inscription introuvable."}, status=404)
        item.delete()
        return Response(status=204)
