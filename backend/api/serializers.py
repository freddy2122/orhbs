from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    AgentSante,
    AlerteEmail,
    AuditLog,
    CategoriePublication,
    ConfigAlerte,
    MouvementAgent,
    Publication,
    CampagneCollecte,
    DeclarationRHS,
    Departement,
    ImportFichier,
    Structure,
    UserProfile,
    ZoneSanitaire,
)

User = get_user_model()


class DepartementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departement
        fields = ("id", "code", "nom", "population")


class ZoneSanitaireSerializer(serializers.ModelSerializer):
    departement = DepartementSerializer(read_only=True)

    class Meta:
        model = ZoneSanitaire
        fields = ("id", "code", "nom", "departement")


class StructureSerializer(serializers.ModelSerializer):
    departement = DepartementSerializer(read_only=True)
    zone_sanitaire = ZoneSanitaireSerializer(read_only=True)
    type_structure_label = serializers.CharField(
        source="get_type_structure_display",
        read_only=True,
    )

    class Meta:
        model = Structure
        fields = (
            "id",
            "code",
            "nom",
            "type_structure",
            "type_structure_label",
            "departement",
            "zone_sanitaire",
        )


class UserProfileSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    scope_label = serializers.CharField(source="get_scope_display", read_only=True)
    departement = DepartementSerializer(read_only=True)
    structure = StructureSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            "role",
            "role_label",
            "scope",
            "scope_label",
            "departement",
            "structure",
            "organisation",
            "poste",
        )


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "profile",
        )

    def get_full_name(self, obj: User) -> str:
        name = obj.get_full_name().strip()
        return name or obj.username


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        if hasattr(user, "profile"):
            token["role"] = user.profile.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CampagneCollecteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampagneCollecte
        fields = (
            "id",
            "code",
            "libelle",
            "annee",
            "periode",
            "date_debut",
            "date_fin",
            "active",
        )


class DeclarationRHSSerializer(serializers.ModelSerializer):
    structure = StructureSerializer(read_only=True)
    campagne = CampagneCollecteSerializer(read_only=True)
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    structure_id = serializers.PrimaryKeyRelatedField(
        queryset=Structure.objects.filter(actif=True),
        source="structure",
        write_only=True,
        required=False,
    )
    campagne_id = serializers.PrimaryKeyRelatedField(
        queryset=CampagneCollecte.objects.all(),
        source="campagne",
        write_only=True,
        required=False,
    )

    class Meta:
        model = DeclarationRHS
        fields = (
            "id",
            "campagne",
            "campagne_id",
            "structure",
            "structure_id",
            "statut",
            "statut_label",
            "effectif_total",
            "dont_femmes",
            "dont_hommes",
            "medecins",
            "medecins_generalistes",
            "medecins_specialistes",
            "infirmiers",
            "infirmiers_auxiliaires",
            "sages_femmes",
            "sages_femmes_auxiliaires",
            "pharmaciens",
            "techniciens_laboratoire",
            "techniciens_imagerie",
            "agents_sante_communautaire",
            "chirurgiens_dentistes",
            "kinesitherapeutes",
            "autres_paramedicaux",
            "administratifs",
            "agents_entretien",
            "autre_personnel",
            "postes_budgetes",
            "postes_pourvus",
            "postes_vacants",
            "departs_retraite_6_mois",
            "departs_retraite_12_mois",
            "observations",
            "commentaire_rejet",
            "date_soumission",
            "date_valide_dept",
            "date_valide_national",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "statut",
            "commentaire_rejet",
            "date_soumission",
            "date_valide_dept",
            "date_valide_national",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        instance = self.instance
        effectif = attrs.get("effectif_total", getattr(instance, "effectif_total", 0) if instance else 0)
        femmes = attrs.get("dont_femmes", getattr(instance, "dont_femmes", 0) if instance else 0)
        hommes = attrs.get("dont_hommes", getattr(instance, "dont_hommes", 0) if instance else 0)
        if effectif and femmes + hommes > effectif:
            raise serializers.ValidationError("Femmes + hommes dépasse l'effectif total.")
        return attrs


class DeclarationRHSCreateSerializer(DeclarationRHSSerializer):
    class Meta(DeclarationRHSSerializer.Meta):
        read_only_fields = DeclarationRHSSerializer.Meta.read_only_fields


class AgentSanteSerializer(serializers.ModelSerializer):
    structure = StructureSerializer(read_only=True)
    campagne = CampagneCollecteSerializer(read_only=True)
    structure_id = serializers.PrimaryKeyRelatedField(
        queryset=Structure.objects.filter(actif=True),
        source="structure",
        write_only=True,
        required=False,
    )
    campagne_id = serializers.PrimaryKeyRelatedField(
        queryset=CampagneCollecte.objects.all(),
        source="campagne",
        write_only=True,
        required=False,
    )
    sexe_label = serializers.CharField(source="get_sexe_display", read_only=True)
    statut_label = serializers.CharField(source="get_statut_agent_display", read_only=True)
    secteur_label = serializers.CharField(source="get_secteur_display", read_only=True)
    type_contrat_label = serializers.CharField(source="get_type_contrat_display", read_only=True)

    class Meta:
        model = AgentSante
        fields = (
            "id",
            "campagne",
            "campagne_id",
            "structure",
            "structure_id",
            "matricule",
            "nom",
            "prenom",
            "sexe",
            "sexe_label",
            "date_naissance",
            "profession",
            "grade",
            "specialite",
            "diplome_principal",
            "ecole_formation",
            "annee_diplome",
            "secteur",
            "secteur_label",
            "statut_agent",
            "statut_label",
            "type_contrat",
            "type_contrat_label",
            "poste_occupe",
            "date_prise_service",
            "date_fin_contrat",
            "depart_retraite_prevu",
            "telephone",
            "email",
            "nationalite",
            "actif",
        )


class ImportFichierSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportFichier
        fields = (
            "id",
            "nom_fichier",
            "statut",
            "lignes_total",
            "lignes_ok",
            "lignes_erreur",
            "rapport_erreurs",
            "created_at",
        )


class CategoriePublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriePublication
        fields = ("id", "nom", "code", "description", "ordre_affichage")


class PublicationSerializer(serializers.ModelSerializer):
    categorie = CategoriePublicationSerializer(read_only=True)
    categorie_id = serializers.PrimaryKeyRelatedField(
        queryset=CategoriePublication.objects.all(),
        source="categorie",
        write_only=True,
        required=False,
        allow_null=True,
    )
    type_publication_label = serializers.CharField(
        source="get_type_publication_display",
        read_only=True,
    )
    auteur_full = serializers.SerializerMethodField()
    fichier_url = serializers.SerializerMethodField()

    class Meta:
        model = Publication
        fields = (
            "id",
            "titre",
            "slug",
            "type_publication",
            "type_publication_label",
            "categorie",
            "categorie_id",
            "resume",
            "contenu",
            "fichier_pdf",
            "fichier_url",
            "fichier_taille",
            "annee",
            "mois",
            "auteur",
            "auteur_full",
            "mot_cles",
            "langue",
            "publie",
            "date_publication",
            "telechargements",
            "vues",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("slug", "telechargements", "vues", "created_at", "updated_at")

    def get_auteur_full(self, obj):
        if obj.cree_par:
            return obj.cree_par.get_full_name() or obj.cree_par.username
        return obj.auteur

    def get_fichier_url(self, obj):
        if obj.fichier_pdf:
            return obj.fichier_pdf.url
        return None


class PublicationCreateSerializer(PublicationSerializer):
    class Meta(PublicationSerializer.Meta):
        read_only_fields = PublicationSerializer.Meta.read_only_fields


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    action_label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "action",
            "action_label",
            "model_name",
            "object_id",
            "object_repr",
            "description",
            "ip_address",
            "user_agent",
            "changes",
            "created_at",
        )


class MouvementAgentSerializer(serializers.ModelSerializer):
    agent = AgentSanteSerializer(read_only=True)
    agent_id = serializers.PrimaryKeyRelatedField(
        queryset=AgentSante.objects.all(),
        source="agent",
        write_only=True,
    )
    structure_origine = StructureSerializer(read_only=True)
    structure_origine_id = serializers.PrimaryKeyRelatedField(
        queryset=Structure.objects.all(),
        source="structure_origine",
        write_only=True,
        required=False,
        allow_null=True,
    )
    structure_destination = StructureSerializer(read_only=True)
    structure_destination_id = serializers.PrimaryKeyRelatedField(
        queryset=Structure.objects.all(),
        source="structure_destination",
        write_only=True,
        required=False,
        allow_null=True,
    )
    type_mouvement_label = serializers.CharField(
        source="get_type_mouvement_display",
        read_only=True,
    )
    valide_par_user = serializers.SerializerMethodField()

    class Meta:
        model = MouvementAgent
        fields = (
            "id",
            "agent",
            "agent_id",
            "type_mouvement",
            "type_mouvement_label",
            "structure_origine",
            "structure_origine_id",
            "structure_destination",
            "structure_destination_id",
            "grade_precedent",
            "grade_nouveau",
            "poste_precedent",
            "poste_nouveau",
            "date_effet",
            "date_fin",
            "motif",
            "reference_arrete",
            "valide_par",
            "valide_par_user",
            "date_validation",
            "observations",
            "created_at",
        )

    def get_valide_par_user(self, obj):
        if obj.valide_par:
            return obj.valide_par.get_full_name() or obj.valide_par.username
        return None


class AlerteEmailSerializer(serializers.ModelSerializer):
    type_alerte_label = serializers.CharField(
        source="get_type_alerte_display",
        read_only=True,
    )
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    structure_concernee = StructureSerializer(read_only=True)
    departement_concerne = DepartementSerializer(read_only=True)

    class Meta:
        model = AlerteEmail
        fields = (
            "id",
            "type_alerte",
            "type_alerte_label",
            "statut",
            "statut_label",
            "destinataires",
            "sujet",
            "corps",
            "donnees_contexte",
            "structure_concernee",
            "departement_concerne",
            "seuil_declencheur",
            "valeur_actuelle",
            "valeur_seuil",
            "date_prevue_envoi",
            "date_envoi",
            "erreur_message",
            "nombre_tentatives",
            "created_at",
            "updated_at",
        )


class ConfigAlerteSerializer(serializers.ModelSerializer):
    type_alerte_label = serializers.CharField(
        source="get_type_alerte_display",
        read_only=True,
    )

    class Meta:
        model = ConfigAlerte
        fields = (
            "id",
            "type_alerte",
            "type_alerte_label",
            "actif",
            "seuil_min",
            "seuil_max",
            "destinataires_defaut",
            "frequence_rappel_heures",
            "template_sujet",
            "template_corps",
            "dernier_envoi",
            "created_at",
            "updated_at",
        )

