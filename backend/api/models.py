from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Departement(models.Model):
    code = models.SlugField(max_length=30, unique=True)
    nom = models.CharField(max_length=100)
    population = models.PositiveIntegerField(
        default=0,
        help_text="Population estimée pour le calcul des ratios RH.",
    )

    class Meta:
        ordering = ["nom"]
        verbose_name = "Département"
        verbose_name_plural = "Départements"

    def __str__(self) -> str:
        return self.nom


class ZoneSanitaire(models.Model):
    code = models.SlugField(max_length=50, unique=True)
    nom = models.CharField(max_length=150)
    departement = models.ForeignKey(
        Departement,
        on_delete=models.PROTECT,
        related_name="zones_sanitaires",
    )

    class Meta:
        ordering = ["departement__nom", "nom"]
        verbose_name = "Zone sanitaire"
        verbose_name_plural = "Zones sanitaires"

    def __str__(self) -> str:
        return f"{self.nom} ({self.departement.nom})"


class Structure(models.Model):
    class TypeStructure(models.TextChoices):
        CHU = "CHU", "Centre hospitalier universitaire"
        HZ = "HZ", "Hôpital de zone"
        CS = "CS", "Centre de santé"
        CSCOM = "CSCOM", "Centre de santé de commune"
        CNHU = "CNHU", "Centre national hospitalier universitaire"
        PRIVE = "PRIVE", "Établissement privé"
        DIRECTION = "DIRECTION", "Direction départementale"

    code = models.SlugField(max_length=50, unique=True)
    nom = models.CharField(max_length=200)
    type_structure = models.CharField(
        max_length=20,
        choices=TypeStructure.choices,
        default=TypeStructure.CS,
    )
    departement = models.ForeignKey(
        Departement,
        on_delete=models.PROTECT,
        related_name="structures",
    )
    zone_sanitaire = models.ForeignKey(
        ZoneSanitaire,
        on_delete=models.PROTECT,
        related_name="structures",
        null=True,
        blank=True,
    )
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ["nom"]
        verbose_name = "Structure sanitaire"
        verbose_name_plural = "Structures sanitaires"

    def __str__(self) -> str:
        return self.nom

    def clean(self):
        if self.zone_sanitaire and self.zone_sanitaire.departement_id != self.departement_id:
            raise ValidationError(
                "La zone sanitaire doit appartenir au même département que la structure."
            )


class UserProfile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrateur système"
        COORDINATION = "coordination", "Coordination ORHS"
        ANALYSTE = "analyste", "Analyste / Statisticien"
        VALIDATEUR = "validateur", "Validateur"
        COLLECTEUR = "collecteur", "Collecteur"
        DECIDEUR = "decideur", "Décideur"
        PARTENAIRE = "partenaire", "Partenaire accrédité"

    class Scope(models.TextChoices):
        NATIONAL = "national", "National"
        DEPARTEMENTAL = "departemental", "Départemental"
        STRUCTURE = "structure", "Structure"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    scope = models.CharField(
        max_length=20,
        choices=Scope.choices,
        default=Scope.NATIONAL,
    )
    departement = models.ForeignKey(
        Departement,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="profiles",
    )
    structure = models.ForeignKey(
        Structure,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="profiles",
    )
    organisation = models.CharField(max_length=200, blank=True)
    poste = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Profil utilisateur"
        verbose_name_plural = "Profils utilisateurs"

    def __str__(self) -> str:
        return f"{self.user.username} ({self.get_role_display()})"


class CampagneCollecte(models.Model):
    code = models.SlugField(max_length=40, unique=True)
    libelle = models.CharField(max_length=200)
    annee = models.PositiveSmallIntegerField()
    periode = models.CharField(max_length=40, blank=True)
    date_debut = models.DateField()
    date_fin = models.DateField()
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-annee", "-date_debut"]
        verbose_name = "Campagne de collecte"
        verbose_name_plural = "Campagnes de collecte"

    def __str__(self) -> str:
        return self.libelle


class DeclarationRHS(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "brouillon", "Brouillon"
        SOUMIS = "soumis", "Soumis"
        VALIDE_DEPARTEMENT = "valide_departement", "Validé département"
        VALIDE_NATIONAL = "valide_national", "Validé national"
        REJETE = "rejete", "Rejeté"

    campagne = models.ForeignKey(
        CampagneCollecte,
        on_delete=models.PROTECT,
        related_name="declarations",
    )
    structure = models.ForeignKey(
        Structure,
        on_delete=models.PROTECT,
        related_name="declarations",
    )
    statut = models.CharField(
        max_length=25,
        choices=Statut.choices,
        default=Statut.BROUILLON,
    )
    effectif_total = models.PositiveIntegerField(default=0)
    dont_femmes = models.PositiveIntegerField(default=0)
    dont_hommes = models.PositiveIntegerField(default=0)
    # Professionnels de santé
    medecins = models.PositiveIntegerField(default=0)
    medecins_generalistes = models.PositiveIntegerField(default=0)
    medecins_specialistes = models.PositiveIntegerField(default=0)
    infirmiers = models.PositiveIntegerField(default=0)
    infirmiers_auxiliaires = models.PositiveIntegerField(default=0)
    sages_femmes = models.PositiveIntegerField(default=0)
    sages_femmes_auxiliaires = models.PositiveIntegerField(default=0)
    pharmaciens = models.PositiveIntegerField(default=0)
    techniciens_laboratoire = models.PositiveIntegerField(default=0)
    techniciens_imagerie = models.PositiveIntegerField(default=0)
    agents_sante_communautaire = models.PositiveIntegerField(default=0)
    chirurgiens_dentistes = models.PositiveIntegerField(default=0)
    kinesitherapeutes = models.PositiveIntegerField(default=0)
    autres_paramedicaux = models.PositiveIntegerField(default=0)
    administratifs = models.PositiveIntegerField(default=0)
    agents_entretien = models.PositiveIntegerField(default=0)
    autre_personnel = models.PositiveIntegerField(default=0)
    # Planification RH
    postes_budgetes = models.PositiveIntegerField(default=0)
    postes_pourvus = models.PositiveIntegerField(default=0)
    postes_vacants = models.PositiveIntegerField(default=0)
    departs_retraite_6_mois = models.PositiveIntegerField(default=0)
    departs_retraite_12_mois = models.PositiveIntegerField(default=0)
    observations = models.TextField(blank=True)
    soumis_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="declarations_soumises",
    )
    date_soumission = models.DateTimeField(null=True, blank=True)
    valide_dept_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="declarations_validees_dept",
    )
    date_valide_dept = models.DateTimeField(null=True, blank=True)
    valide_national_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="declarations_validees_national",
    )
    date_valide_national = models.DateTimeField(null=True, blank=True)
    commentaire_rejet = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Déclaration RHS"
        verbose_name_plural = "Déclarations RHS"
        constraints = [
            models.UniqueConstraint(
                fields=["campagne", "structure"],
                name="unique_declaration_campagne_structure",
            )
        ]

    def __str__(self) -> str:
        return f"{self.structure.nom} — {self.campagne.libelle}"

    def clean(self):
        errors = []
        if self.dont_femmes + self.dont_hommes > self.effectif_total and self.effectif_total > 0:
            errors.append("Femmes + hommes ne peut pas dépasser l'effectif total.")
        if self.medecins_generalistes + self.medecins_specialistes > self.medecins:
            errors.append("La somme médecins généralistes + spécialistes dépasse le total médecins.")
        if self.postes_pourvus + self.postes_vacants > self.postes_budgetes and self.postes_budgetes > 0:
            errors.append("Postes pourvus + vacants dépasse les postes budgétés.")
        if errors:
            raise ValidationError(errors)

    @classmethod
    def official_filter(cls) -> Q:
        return Q(statut=cls.Statut.VALIDE_NATIONAL)

    def recalc_effectif_from_categories(self):
        """Recalcule effectif_total à partir des catégories professionnelles."""
        from api.constants.rhs_fields import ALL_DECLARATION_COUNT_FIELDS

        total = sum(getattr(self, field, 0) or 0 for field in ALL_DECLARATION_COUNT_FIELDS)
        if total > 0:
            self.effectif_total = total


class AgentSante(models.Model):
    class Sexe(models.TextChoices):
        M = "M", "Masculin"
        F = "F", "Féminin"

    class Secteur(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVE = "prive", "Privé"
        CONFESSIONNEL = "confessionnel", "Confessionnel"

    class StatutAgent(models.TextChoices):
        ACTIF = "actif", "En activité"
        DETACHE = "detache", "Détaché"
        CONGE = "conge", "Congé longue durée"
        RETRAITE = "retraite", "Retraité"
        SUSPENDU = "suspendu", "Suspendu"

    class TypeContrat(models.TextChoices):
        PERMANENT = "permanent", "Permanent"
        CONTRACTUEL = "contractuel", "Contractuel"
        PRESTATAIRE = "prestataire", "Prestataire"
        STAGIAIRE = "stagiaire", "Stagiaire"

    campagne = models.ForeignKey(
        CampagneCollecte,
        on_delete=models.PROTECT,
        related_name="agents",
    )
    structure = models.ForeignKey(
        Structure,
        on_delete=models.PROTECT,
        related_name="agents",
    )
    matricule = models.CharField(max_length=50)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    sexe = models.CharField(max_length=1, choices=Sexe.choices)
    date_naissance = models.DateField(null=True, blank=True)
    profession = models.CharField(max_length=120)
    grade = models.CharField(max_length=120, blank=True)
    specialite = models.CharField(max_length=120, blank=True)
    diplome_principal = models.CharField(max_length=200, blank=True)
    ecole_formation = models.CharField(max_length=200, blank=True)
    annee_diplome = models.PositiveSmallIntegerField(null=True, blank=True)
    secteur = models.CharField(
        max_length=20,
        choices=Secteur.choices,
        default=Secteur.PUBLIC,
    )
    statut_agent = models.CharField(
        max_length=20,
        choices=StatutAgent.choices,
        default=StatutAgent.ACTIF,
    )
    type_contrat = models.CharField(
        max_length=20,
        choices=TypeContrat.choices,
        default=TypeContrat.PERMANENT,
    )
    poste_occupe = models.CharField(max_length=200, blank=True)
    date_prise_service = models.DateField(null=True, blank=True)
    date_fin_contrat = models.DateField(null=True, blank=True)
    depart_retraite_prevu = models.DateField(null=True, blank=True)
    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    nationalite = models.CharField(max_length=80, default="Béninoise")
    actif = models.BooleanField(default=True)
    source_fichier = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nom", "prenom"]
        verbose_name = "Agent de santé"
        verbose_name_plural = "Agents de santé"
        constraints = [
            models.UniqueConstraint(
                fields=["campagne", "matricule"],
                name="unique_agent_campagne_matricule",
            )
        ]

    def __str__(self) -> str:
        return f"{self.prenom} {self.nom} ({self.matricule})"


class ImportFichier(models.Model):
    class StatutImport(models.TextChoices):
        EN_COURS = "en_cours", "En cours"
        TERMINE = "termine", "Terminé"
        ERREUR = "erreur", "Erreur"

    campagne = models.ForeignKey(
        CampagneCollecte,
        on_delete=models.PROTECT,
        related_name="imports",
    )
    structure = models.ForeignKey(
        Structure,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="imports",
    )
    nom_fichier = models.CharField(max_length=255)
    importe_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="imports_fichiers",
    )
    statut = models.CharField(
        max_length=20,
        choices=StatutImport.choices,
        default=StatutImport.EN_COURS,
    )
    lignes_total = models.PositiveIntegerField(default=0)
    lignes_ok = models.PositiveIntegerField(default=0)
    lignes_erreur = models.PositiveIntegerField(default=0)
    rapport_erreurs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Import fichier"
        verbose_name_plural = "Imports fichiers"


class CategoriePublication(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    code = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    ordre_affichage = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["ordre_affichage", "nom"]
        verbose_name = "Catégorie de publication"
        verbose_name_plural = "Catégories de publications"

    def __str__(self) -> str:
        return self.nom


class Publication(models.Model):
    class TypePublication(models.TextChoices):
        RAPPORT_ANNUEL = "rapport_annuel", "Rapport annuel"
        ANNUAIRE_STATISTIQUE = "annuaire", "Annuaire statistique"
        PLAN_STRATEGIQUE = "pdrhs", "Plan stratégique (PDRHS)"
        NOTE_POLITIQUE = "note", "Note de politique"
        BULLETIN_TRIMESTRIEL = "bulletin", "Bulletin trimestriel"
        ETUDE_THEMATIQUE = "etude", "Étude thématique"
        COMMUNIQUE = "communique", "Communiqué"
        AUTRE = "autre", "Autre"

    titre = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True)
    type_publication = models.CharField(
        max_length=30,
        choices=TypePublication.choices,
        default=TypePublication.AUTRE,
    )
    categorie = models.ForeignKey(
        CategoriePublication,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="publications",
    )
    resume = models.TextField(blank=True)
    contenu = models.TextField(blank=True)
    fichier_pdf = models.FileField(upload_to="publications/%Y/%m/", blank=True, null=True)
    fichier_taille = models.PositiveIntegerField(null=True, blank=True)
    annee = models.PositiveSmallIntegerField(null=True, blank=True)
    mois = models.PositiveSmallIntegerField(null=True, blank=True)
    auteur = models.CharField(max_length=200, blank=True)
    mot_cles = models.CharField(max_length=500, blank=True, help_text="Mots-clés séparés par des virgules")
    langue = models.CharField(max_length=10, default="fr")
    publie = models.BooleanField(default=False)
    date_publication = models.DateTimeField(null=True, blank=True)
    telechargements = models.PositiveIntegerField(default=0)
    vues = models.PositiveIntegerField(default=0)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="publications_creees",
    )
    modifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="publications_modifiees",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_publication", "-created_at"]
        verbose_name = "Publication"
        verbose_name_plural = "Publications"

    def __str__(self) -> str:
        return self.titre

    def increment_telechargements(self):
        self.telechargements += 1
        self.save(update_fields=["telechargements"])

    def increment_vues(self):
        self.vues += 1
        self.save(update_fields=["vues"])


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Création"
        UPDATE = "update", "Modification"
        DELETE = "delete", "Suppression"
        LOGIN = "login", "Connexion"
        LOGOUT = "logout", "Déconnexion"
        VALIDATE = "validate", "Validation"
        REJECT = "reject", "Rejet"
        SUBMIT = "submit", "Soumission"
        IMPORT = "import", "Import"
        EXPORT = "export", "Export"
        VIEW = "view", "Consultation"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journaux d'audit"
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["model_name", "-created_at"]),
        ]

    def __str__(self) -> str:
        user_str = self.user.username if self.user else "Anonyme"
        return f"{user_str} - {self.get_action_display()} - {self.created_at}"


class MouvementAgent(models.Model):
    class TypeMouvement(models.TextChoices):
        AFFECTATION = "affectation", "Affectation"
        MUTATION = "mutation", "Mutation inter-structures"
        PROMOTION = "promotion", "Promotion/Avancement"
        DETACHEMENT = "detachment", "Détachement"
        MISE_DISPOSITION = "mise_disposition", "Mise à disposition"
        CONGE_LONGUE_DUREE = "conge_ld", "Congé longue durée"
        RETRAITE = "retraite", "Départ à la retraite"
        DEMISSION = "demission", "Démission"
        REVOCATION = "revocation", "Révocation"
        DECES = "deces", "Décès"
        RENTREE = "rentree", "Retour de congé/détachement"

    agent = models.ForeignKey(
        AgentSante,
        on_delete=models.CASCADE,
        related_name="mouvements",
    )
    type_mouvement = models.CharField(
        max_length=30,
        choices=TypeMouvement.choices,
    )
    structure_origine = models.ForeignKey(
        Structure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mouvements_sortants",
    )
    structure_destination = models.ForeignKey(
        Structure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mouvements_entrants",
    )
    grade_precedent = models.CharField(max_length=120, blank=True)
    grade_nouveau = models.CharField(max_length=120, blank=True)
    poste_precedent = models.CharField(max_length=200, blank=True)
    poste_nouveau = models.CharField(max_length=200, blank=True)
    date_effet = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    motif = models.TextField(blank=True)
    reference_arrete = models.CharField(max_length=200, blank=True)
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mouvements_valides",
    )
    date_validation = models.DateTimeField(null=True, blank=True)
    observations = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mouvements_crees",
    )

    class Meta:
        ordering = ["-date_effet"]
        verbose_name = "Mouvement d'agent"
        verbose_name_plural = "Mouvements d'agents"
        indexes = [
            models.Index(fields=["agent", "-date_effet"]),
            models.Index(fields=["type_mouvement", "-date_effet"]),
        ]

    def __str__(self) -> str:
        return f"{self.agent} - {self.get_type_mouvement_display()} - {self.date_effet}"


class AlerteEmail(models.Model):
    class TypeAlerte(models.TextChoices):
        SEUIL_COUVERTURE = "seuil_couverture", "Seuil critique de couverture"
        RAPPEL_COLLECTE = "rappel_collecte", "Rappel collecte données"
        RETRAITE_PROCHE = "retraite_proche", "Départ retraite imminent"
        STRUCTURE_SANS_MEDECIN = "structure_sans_medecin", "Structure sans médecin"
        DESEQUILIBRE_GENRE = "desequilibre_genre", "Déséquilibre genre"
        VALIDATION_EN_ATTENTE = "validation_attente", "Validation en attente"

    class StatutAlerte(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente d'envoi"
        ENVOYE = "envoye", "Envoyé"
        ERREUR = "erreur", "Erreur d'envoi"
        IGNORE = "ignore", "Ignoré"

    type_alerte = models.CharField(max_length=30, choices=TypeAlerte.choices)
    statut = models.CharField(
        max_length=20,
        choices=StatutAlerte.choices,
        default=StatutAlerte.EN_ATTENTE,
    )
    destinataires = models.JSONField(default=list, help_text="Liste des emails destinataires")
    sujet = models.CharField(max_length=300)
    corps = models.TextField()
    donnees_contexte = models.JSONField(default=dict, blank=True)
    structure_concernee = models.ForeignKey(
        Structure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertes",
    )
    departement_concerne = models.ForeignKey(
        Departement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertes",
    )
    seuil_declencheur = models.CharField(max_length=100, blank=True)
    valeur_actuelle = models.FloatField(null=True, blank=True)
    valeur_seuil = models.FloatField(null=True, blank=True)
    date_prevue_envoi = models.DateTimeField(null=True, blank=True)
    date_envoi = models.DateTimeField(null=True, blank=True)
    erreur_message = models.TextField(blank=True)
    nombre_tentatives = models.PositiveSmallIntegerField(default=0)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertes_creees",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Alerte email"
        verbose_name_plural = "Alertes emails"
        indexes = [
            models.Index(fields=["statut", "date_prevue_envoi"]),
            models.Index(fields=["type_alerte", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_type_alerte_display()} - {self.statut}"


class ConfigAlerte(models.Model):
    type_alerte = models.CharField(
        max_length=30,
        choices=AlerteEmail.TypeAlerte.choices,
        unique=True,
    )
    actif = models.BooleanField(default=True)
    seuil_min = models.FloatField(null=True, blank=True)
    seuil_max = models.FloatField(null=True, blank=True)
    destinataires_defaut = models.JSONField(default=list, help_text="Liste des emails par défaut")
    frequence_rappel_heures = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Fréquence de rappel en heures (pour alertes récurrentes)",
    )
    template_sujet = models.CharField(max_length=300, blank=True)
    template_corps = models.TextField(blank=True)
    dernier_envoi = models.DateTimeField(null=True, blank=True)
    modifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="config_alertes_modifiees",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration d'alerte"
        verbose_name_plural = "Configurations d'alertes"

    def __str__(self) -> str:
        return f"Config {self.get_type_alerte_display()}"
