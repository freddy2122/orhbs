from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import AbonneNewsletter, CampagneNewsletter
from api.permissions import IsAdminOrCoordination
from api.serializers import AbonneNewsletterSerializer, CampagneNewsletterSerializer
from api.services.newsletter import dispatch_campaign, subscribe


class NewsletterSubscriberListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        qs = AbonneNewsletter.objects.all()
        actif = request.query_params.get("actif")
        if actif == "true":
            qs = qs.filter(actif=True)
        elif actif == "false":
            qs = qs.filter(actif=False)
        q = str(request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(email__icontains=q)
        return Response(
            {
                "stats": {
                    "total": AbonneNewsletter.objects.count(),
                    "actifs": AbonneNewsletter.objects.filter(actif=True).count(),
                    "inactifs": AbonneNewsletter.objects.filter(actif=False).count(),
                },
                "abonnes": AbonneNewsletterSerializer(qs[:500], many=True).data,
            }
        )

    def post(self, request):
        try:
            abonne, created = subscribe(
                request.data.get("email"),
                source=AbonneNewsletter.Source.ADMIN,
            )
        except ValidationError as exc:
            return Response(exc.message_dict, status=400)
        return Response(
            AbonneNewsletterSerializer(abonne).data,
            status=201 if created else 200,
        )


class NewsletterSubscriberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def patch(self, request, pk):
        abonne = AbonneNewsletter.objects.filter(pk=pk).first()
        if not abonne:
            return Response({"detail": "Abonné introuvable."}, status=404)
        if "actif" in request.data:
            abonne.actif = bool(request.data.get("actif"))
            abonne.date_desabonnement = None if abonne.actif else timezone.now()
            abonne.save(update_fields=["actif", "date_desabonnement", "updated_at"])
        return Response(AbonneNewsletterSerializer(abonne).data)


class NewsletterCampaignListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def get(self, request):
        qs = CampagneNewsletter.objects.all()
        return Response(CampagneNewsletterSerializer(qs[:100], many=True).data)

    def post(self, request):
        serializer = CampagneNewsletterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        item = serializer.save(created_by=request.user)
        return Response(CampagneNewsletterSerializer(item).data, status=201)


class NewsletterCampaignSendView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def post(self, request, pk):
        campagne = CampagneNewsletter.objects.filter(pk=pk).first()
        if not campagne:
            return Response({"detail": "Campagne introuvable."}, status=404)
        try:
            result = dispatch_campaign(campagne)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=400)
        campagne.refresh_from_db()
        return Response(
            {
                "campagne": CampagneNewsletterSerializer(campagne).data,
                "envoi": result,
            }
        )
