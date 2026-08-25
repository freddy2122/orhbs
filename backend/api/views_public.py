from django.db.models import Q
from django.http import HttpResponse
from django.utils.xmlutils import SimplerXMLGenerator
from io import StringIO

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.exceptions import ValidationError

from api.models import (
    AbonneNewsletter,
    CampagneCollecte,
    ContenuEditorial,
    InscriptionOrdre,
    Publication,
)
from api.serializers import (
    ContenuEditorialSerializer,
    InscriptionOrdreSerializer,
    PublicationSerializer,
)
from api.services.stats import (
    departement_stats,
    get_active_campagne,
    national_stats,
    structure_stats,
    zone_stats,
)
from api.views_stats import serialize_campagne, serialize_national_payload, serialize_totals


class PublicAPIView(APIView):
    """Endpoints publics : pas d’auth JWT, pour rester accessibles même avec un cookie expiré."""

    authentication_classes = []
    permission_classes = [AllowAny]


class PublicNationalStatsView(PublicAPIView):

    def get(self, request):
        campagne_code = request.query_params.get("campagne")
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else get_active_campagne()
        )
        stats = national_stats(campagne)
        return Response(serialize_national_payload(stats))


class PublicDepartementStatsView(PublicAPIView):

    def get(self, request):
        campagne = get_active_campagne()
        rows = departement_stats(campagne)
        data = []
        for row in rows:
            dept = row["departement"]
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


class PublicZoneStatsView(PublicAPIView):

    def get(self, request):
        campagne = get_active_campagne()
        departement_code = request.query_params.get("departement")
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


class PublicStructureStatsView(PublicAPIView):

    def get(self, request):
        campagne = get_active_campagne()
        departement_code = request.query_params.get("departement")
        zone_code = request.query_params.get("zone")
        type_structure = request.query_params.get("type")
        rows = structure_stats(campagne, departement_code, zone_code, type_structure)
        data = []
        for row in rows:
            structure = row["structure"]
            zone = row["zone"]
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


class PublicPublicationListView(PublicAPIView):

    def get(self, request):
        qs = Publication.objects.filter(publie=True)
        type_pub = request.query_params.get("type")
        if type_pub:
            qs = qs.filter(type_publication=type_pub)
        annee = request.query_params.get("annee")
        if annee:
            qs = qs.filter(annee=annee)
        search = request.query_params.get("q", "").strip()
        if search:
            qs = qs.filter(titre__icontains=search) | qs.filter(
                resume__icontains=search
            ) | qs.filter(mot_cles__icontains=search)
        return Response(
            PublicationSerializer(qs.order_by("-date_publication", "-created_at"), many=True).data
        )


class PublicPublicationDetailView(PublicAPIView):

    def get(self, request, slug):
        publication = Publication.objects.filter(publie=True, slug=slug).first()
        if not publication:
            try:
                publication = Publication.objects.filter(publie=True, pk=int(slug)).first()
            except (TypeError, ValueError):
                publication = None
        if not publication:
            return Response({"detail": "Publication introuvable."}, status=404)
        publication.increment_vues()
        return Response(PublicationSerializer(publication).data)


class PublicPublicationDownloadView(PublicAPIView):

    def get(self, request, pk):
        from django.http import FileResponse, Http404

        publication = Publication.objects.filter(pk=pk, publie=True).first()
        if not publication or not publication.fichier_pdf:
            raise Http404("Fichier non disponible")
        publication.increment_telechargements()
        return FileResponse(
            publication.fichier_pdf.open("rb"),
            as_attachment=True,
            filename=f"{publication.slug}.pdf",
        )


class PublicContenuListView(PublicAPIView):

    def get(self, request):
        qs = ContenuEditorial.objects.filter(publie=True)
        type_contenu = request.query_params.get("type")
        if type_contenu:
            qs = qs.filter(type_contenu=type_contenu)
        categorie = request.query_params.get("categorie")
        if categorie:
            qs = qs.filter(categorie=categorie)
        return Response(
            ContenuEditorialSerializer(qs.order_by("-date_publication", "-created_at"), many=True).data
        )


class PublicContenuDetailView(PublicAPIView):

    def get(self, request, slug):
        item = ContenuEditorial.objects.filter(publie=True, slug=slug).first()
        if not item:
            return Response({"detail": "Contenu introuvable."}, status=404)
        return Response(ContenuEditorialSerializer(item).data)


class PublicNewsletterView(PublicAPIView):

    def post(self, request):
        from api.services.newsletter import subscribe

        try:
            abonne, created = subscribe(request.data.get("email"))
        except ValidationError as exc:
            return Response(exc.message_dict, status=400)
        return Response(
            {
                "detail": "Inscription enregistrée." if created else "Inscription déjà enregistrée.",
                "email": abonne.email,
            },
            status=201 if created else 200,
        )


class PublicNewsletterUnsubscribeView(PublicAPIView):

    def get(self, request):
        from api.services.newsletter import mask_email

        token = str(request.query_params.get("token") or "").strip()
        abonne = AbonneNewsletter.objects.filter(token_desabonnement=token).first()
        if not abonne:
            return Response({"detail": "Lien de désabonnement invalide."}, status=404)
        return Response({"email": mask_email(abonne.email), "actif": abonne.actif})

    def post(self, request):
        from api.services.newsletter import mask_email, unsubscribe

        token = str(request.data.get("token") or request.query_params.get("token") or "").strip()
        abonne = unsubscribe(token)
        if not abonne:
            return Response({"detail": "Lien de désabonnement invalide."}, status=404)
        return Response({"detail": "Désabonnement enregistré.", "email": mask_email(abonne.email)})


class PublicAnnuaireListView(PublicAPIView):

    def get(self, request):
        qs = InscriptionOrdre.objects.filter(publie=True)
        type_entree = request.query_params.get("type")
        if type_entree in ("medecin", "clinique"):
            qs = qs.filter(type_entree=type_entree)
        statut = request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        departement = request.query_params.get("departement")
        if departement and departement != "Tous":
            qs = qs.filter(departement__iexact=departement)
        specialite = request.query_params.get("specialite")
        if specialite and specialite != "Toutes":
            qs = qs.filter(specialite__iexact=specialite)
        search = request.query_params.get("q", "").strip()
        if search:
            qs = qs.filter(
                Q(nom__icontains=search)
                | Q(numero_inscription__icontains=search)
                | Q(specialite__icontains=search)
                | Q(commune__icontains=search)
                | Q(directeur__icontains=search)
                | Q(lieu_exercice__icontains=search)
            )
        stats = {
            "medecins": InscriptionOrdre.objects.filter(
                publie=True, type_entree=InscriptionOrdre.TypeEntree.MEDECIN, statut=InscriptionOrdre.Statut.INSCRIT
            ).count(),
            "cliniques": InscriptionOrdre.objects.filter(
                publie=True, type_entree=InscriptionOrdre.TypeEntree.CLINIQUE, statut=InscriptionOrdre.Statut.INSCRIT
            ).count(),
            "suspendus": InscriptionOrdre.objects.filter(
                publie=True, statut=InscriptionOrdre.Statut.SUSPENDU
            ).count(),
            "total": InscriptionOrdre.objects.filter(publie=True).count(),
        }
        return Response(
            {
                "stats": stats,
                "resultats": InscriptionOrdreSerializer(qs.order_by("nom")[:200], many=True).data,
            }
        )


class PublicPublicationsRssView(PublicAPIView):

    def get(self, request):
        items = Publication.objects.filter(publie=True).order_by("-date_publication", "-created_at")[:30]
        stream = StringIO()
        xml = SimplerXMLGenerator(stream, "utf-8")
        xml.startDocument()
        xml.startElement("rss", {"version": "2.0"})
        xml.startElement("channel", {})
        xml.startElement("title", {})
        xml.characters("ORHS Bénin — Publications")
        xml.endElement("title")
        xml.startElement("description", {})
        xml.characters("Publications officielles de l'Observatoire des ressources humaines en santé.")
        xml.endElement("description")
        for pub in items:
            xml.startElement("item", {})
            xml.startElement("title", {})
            xml.characters(pub.titre)
            xml.endElement("title")
            xml.startElement("description", {})
            xml.characters(pub.resume or "")
            xml.endElement("description")
            if pub.date_publication:
                xml.startElement("pubDate", {})
                xml.characters(pub.date_publication.strftime("%a, %d %b %Y %H:%M:%S %z"))
                xml.endElement("pubDate")
            xml.startElement("guid", {})
            xml.characters(pub.slug)
            xml.endElement("guid")
            xml.endElement("item")
        xml.endElement("channel")
        xml.endElement("rss")
        xml.endDocument()
        return HttpResponse(stream.getvalue(), content_type="application/rss+xml; charset=utf-8")
