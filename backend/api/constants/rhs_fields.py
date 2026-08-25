"""Champs et libellés standard ORHS Bénin — collecte RHS."""

# Colonnes modèle Excel import agents (ordre fixe)
EXCEL_AGENT_COLUMNS = [
    ("matricule", "Matricule"),
    ("nom", "Nom"),
    ("prenom", "Prénom"),
    ("sexe", "Sexe (M/F)"),
    ("date_naissance", "Date naissance (AAAA-MM-JJ)"),
    ("profession", "Profession"),
    ("grade", "Grade"),
    ("specialite", "Spécialité"),
    ("diplome_principal", "Diplôme principal"),
    ("ecole_formation", "École de formation"),
    ("annee_diplome", "Année diplôme"),
    ("secteur", "Secteur (public/prive/confessionnel)"),
    ("type_contrat", "Type contrat (permanent/contractuel/prestataire)"),
    ("statut_agent", "Statut (actif/detache/conge/retraite)"),
    ("structure_code", "Code structure"),
    ("poste_occupe", "Poste occupé"),
    ("date_prise_service", "Date prise de service (AAAA-MM-JJ)"),
    ("date_fin_contrat", "Date fin contrat (AAAA-MM-JJ)"),
    ("depart_retraite_prevu", "Départ retraite prévu (AAAA-MM-JJ)"),
    ("salaire", "Salaire mensuel (FCFA)"),
    ("date_debut_conge", "Début congé (AAAA-MM-JJ)"),
    ("date_fin_conge", "Fin congé (AAAA-MM-JJ)"),
    ("telephone", "Téléphone"),
    ("email", "E-mail"),
]

PROFESSIONS_SANTE = [
    "Médecin généraliste",
    "Médecin spécialiste",
    "Infirmier(ère) d'État",
    "Infirmier(ère) auxiliaire",
    "Sage-femme",
    "Sage-femme auxiliaire",
    "Pharmacien",
    "Technicien de laboratoire",
    "Technicien en imagerie médicale",
    "Agent de santé communautaire",
    "Chirurgien-dentiste",
    "Kinésithérapeute",
    "Autre professionnel de santé",
    "Personnel administratif",
    "Agent d'entretien / ouvrier",
    "Autre",
]

# Champs déclaration agrégée (structure) — clé API → libellé UI
DECLARATION_EFFECTIF_FIELDS = [
    ("effectif_total", "Effectif total", True),
    ("dont_femmes", "Dont femmes", True),
    ("dont_hommes", "Dont hommes", False),
]

DECLARATION_PROFESSION_FIELDS = [
    ("medecins", "Médecins (total)", True),
    ("medecins_generalistes", "Médecins généralistes", False),
    ("medecins_specialistes", "Médecins spécialistes", False),
    ("infirmiers", "Infirmiers(ères) d'État", True),
    ("infirmiers_auxiliaires", "Infirmiers(ères) auxiliaires", False),
    ("sages_femmes", "Sages-femmes", True),
    ("sages_femmes_auxiliaires", "Sages-femmes auxiliaires", False),
    ("pharmaciens", "Pharmaciens", False),
    ("techniciens_laboratoire", "Techniciens de laboratoire", False),
    ("techniciens_imagerie", "Techniciens imagerie médicale", False),
    ("agents_sante_communautaire", "Agents de santé communautaire", False),
    ("chirurgiens_dentistes", "Chirurgiens-dentistes", False),
    ("kinesitherapeutes", "Kinésithérapeutes", False),
    ("autres_paramedicaux", "Autres paramédicaux", False),
    ("administratifs", "Personnel administratif", False),
    ("agents_entretien", "Agents d'entretien / ouvriers", False),
    ("autre_personnel", "Autre personnel", False),
]

DECLARATION_PLANIFICATION_FIELDS = [
    ("postes_budgetes", "Postes budgétés", False),
    ("postes_pourvus", "Postes pourvus", False),
    ("postes_vacants", "Postes vacants", False),
    ("departs_retraite_6_mois", "Départs retraite ≤ 6 mois", False),
    ("departs_retraite_12_mois", "Départs retraite ≤ 12 mois", False),
]

ALL_DECLARATION_COUNT_FIELDS = [
    f[0]
    for f in DECLARATION_PROFESSION_FIELDS + DECLARATION_PLANIFICATION_FIELDS + DECLARATION_EFFECTIF_FIELDS
    if f[0] not in ("effectif_total", "dont_hommes")
]
