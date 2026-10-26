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
)
from api.permissions import IsCoordination, IsEditorialAuthor
from api.serializers import (
    CategoriePublicationSerializer,
    ContenuEditorialCmsSerializer,
    InscriptionOrdreSerializer,
    PublicationCmsSerializer,
)
from api.services.editorial_workflow import (
    WorkflowError,
    apply_transition,
    can_edit,
    can_view,
    is_reviewer,
)


class CategoriePublicationListView(APIView):
    permission_classes = [IsAuthenticated, IsEditorialAuthor]

    def get(self, request):
        categories = CategoriePublication.objects.all()
        serializer = CategoriePublicationSerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not is_reviewer(request.user):
            return Response({"detail": "Non autorisé."}, status=403)
        serializer = CategoriePublicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(serializer.data, status=201)


def _unique_slug_for(model, base: str, exclude_pk=None) -> str:
    slug = slugify(base) or "contenu"
    candidate = slug
    index = 2
    while model.objects.filter(slug=candidate).exclude(pk=exclude_pk).exists():
        candidate = f"{slug}-{index}"
        index += 1
    return candidate


def _strip_protected(data):
    for key in ("slug", "statut", "publie", "date_publication"):
        data.pop(key, None)
    return data


class EditorialListView(APIView):
    """Liste/création d'un type de contenu éditorial avec circuit de relecture."""

    permission_classes = [IsAuthenticated, IsEditorialAuthor]
    model = None
    serializer_class = None

    def filter_queryset(self, request, qs):
        return qs

    def get(self, request):
        qs = self.filter_queryset(
            request, self.model.objects.select_related("cree_par", "soumis_par", "valide_par")
        )
        if not is_reviewer(request.user):
            qs = qs.filter(cree_par=request.user)
        statut = request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        data = self.serializer_class(
            qs.order_by("-date_publication", "-created_at"), many=True, context={"request": request}
        ).data
        return Response(data)

    def post(self, request):
        data = _strip_protected(request.data.copy())
        data["slug"] = _unique_slug_for(self.model, data.get("titre", ""))
        serializer = self.serializer_class(data=data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save(cree_par=request.user)
        return Response(self.serializer_class(item, context={"request": request}).data, status=201)


class EditorialDetailView(APIView):
    permission_classes = [IsAuthenticated, IsEditorialAuthor]
    model = None
    serializer_class = None
    not_found = "Contenu introuvable."

    def get_item(self, request, pk):
        item = self.model.objects.filter(pk=pk).first()
        if not item or not can_view(request.user, item):
            return None
        return item

    def get(self, request, pk):
        item = self.get_item(request, pk)
        if not item:
            return Response({"detail": self.not_found}, status=404)
        return Response(self.serializer_class(item, context={"request": request}).data)

    def patch(self, request, pk):
        item = self.get_item(request, pk)
        if not item:
            return Response({"detail": self.not_found}, status=404)
        if not can_edit(request.user, item):
            return Response(
                {"detail": "Ce contenu est verrouillé (en relecture ou publié)."}, status=409
            )
        data = _strip_protected(request.data.copy())
        if "titre" in data and data["titre"] != item.titre:
            data["slug"] = _unique_slug_for(self.model, data["titre"], exclude_pk=item.pk)
        serializer = self.serializer_class(item, data=data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save(modifie_par=request.user)
        return Response(self.serializer_class(item, context={"request": request}).data)

    def delete(self, request, pk):
        item = self.get_item(request, pk)
        if not item:
            return Response({"detail": self.not_found}, status=404)
        if not can_edit(request.user, item):
            return Response(
                {"detail": "Seul un brouillon ou un contenu rejeté peut être supprimé."}, status=409
            )
        item.delete()
        return Response(status=204)


class EditorialWorkflowView(APIView):
    """POST {"action": "submit|publish|reject|unpublish", "motif": "..."}."""

    permission_classes = [IsAuthenticated, IsEditorialAuthor]
    model = None
    serializer_class = None
    not_found = "Contenu introuvable."

    def post(self, request, pk):
        item = self.model.objects.filter(pk=pk).first()
        if not item or not can_view(request.user, item):
            return Response({"detail": self.not_found}, status=404)
        try:
            item = apply_transition(
                request, item, request.data.get("action"), request.data.get("motif", "")
            )
        except WorkflowError as exc:
            return Response({"detail": exc.detail}, status=exc.status)
        return Response(self.serializer_class(item, context={"request": request}).data)


class EditorialMediaUploadView(APIView):
    permission_classes = [IsAuthenticated, IsEditorialAuthor]
    parser_classes = [MultiPartParser, FormParser]
    model = None
    serializer_class = None
    not_found = "Contenu introuvable."
    update_fields = ("image",)

    def get_file(self, request):
        return request.FILES.get("image")

    def store(self, item, uploaded):
        item.image = uploaded

    def post(self, request, pk):
        item = self.model.objects.filter(pk=pk).first()
        if not item or not can_view(request.user, item):
            return Response({"detail": self.not_found}, status=404)
        if not can_edit(request.user, item):
            return Response({"detail": "Ce contenu est verrouillé."}, status=409)
        uploaded = self.get_file(request)
        if not uploaded:
            return Response({"detail": "Fichier requis."}, status=400)
        self.store(item, uploaded)
        item.modifie_par = request.user
        item.save(update_fields=[*self.update_fields, "modifie_par", "updated_at"])
        return Response(self.serializer_class(item, context={"request": request}).data)


class PublicationListView(EditorialListView):
    model = Publication
    serializer_class = PublicationCmsSerializer

    def filter_queryset(self, request, qs):
        params = request.query_params
        if params.get("type"):
            qs = qs.filter(type_publication=params["type"])
        if params.get("categorie"):
            qs = qs.filter(categorie_id=params["categorie"])
        if params.get("annee"):
            qs = qs.filter(annee=params["annee"])
        search = params.get("q", "").strip()
        if search:
            qs = (
                qs.filter(titre__icontains=search)
                | qs.filter(resume__icontains=search)
                | qs.filter(mot_cles__icontains=search)
            )
        return qs


class PublicationDetailView(EditorialDetailView):
    model = Publication
    serializer_class = PublicationCmsSerializer
    not_found = "Publication introuvable."


class PublicationWorkflowView(EditorialWorkflowView):
    model = Publication
    serializer_class = PublicationCmsSerializer
    not_found = "Publication introuvable."


class PublicationDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsEditorialAuthor]

    def get(self, request, pk):
        from django.http import FileResponse, Http404

        publication = Publication.objects.filter(pk=pk).first()
        if not publication or not can_view(request.user, publication) or not publication.fichier_pdf:
            raise Http404("Fichier non disponible")

        return FileResponse(
            publication.fichier_pdf,
            as_attachment=True,
            filename=f"{publication.slug}.pdf",
        )


class PublicationUploadView(EditorialMediaUploadView):
    model = Publication
    serializer_class = PublicationCmsSerializer
    not_found = "Publication introuvable."
    update_fields = ("fichier_pdf", "fichier_taille")

    def get_file(self, request):
        return request.FILES.get("fichier_pdf") or request.FILES.get("file")

    def store(self, item, uploaded):
        item.fichier_pdf = uploaded
        item.fichier_taille = uploaded.size


class PublicationImageUploadView(EditorialMediaUploadView):
    model = Publication
    serializer_class = PublicationCmsSerializer
    not_found = "Publication introuvable."


class ContenuEditorialListView(EditorialListView):
    model = ContenuEditorial
    serializer_class = ContenuEditorialCmsSerializer

    def filter_queryset(self, request, qs):
        if request.query_params.get("type"):
            qs = qs.filter(type_contenu=request.query_params["type"])
        return qs


class ContenuEditorialDetailView(EditorialDetailView):
    model = ContenuEditorial
    serializer_class = ContenuEditorialCmsSerializer


class ContenuEditorialWorkflowView(EditorialWorkflowView):
    model = ContenuEditorial
    serializer_class = ContenuEditorialCmsSerializer


class ContenuEditorialImageUploadView(EditorialMediaUploadView):
    model = ContenuEditorial
    serializer_class = ContenuEditorialCmsSerializer


class InscriptionOrdreListView(APIView):
    permission_classes = [IsAuthenticated, IsCoordination]

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
    permission_classes = [IsAuthenticated, IsCoordination]

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
