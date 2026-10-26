from django.core.exceptions import ValidationError

FORBIDDEN_TERMS = ("orhs", "orhsb", "benin", "bénin", "motdepasse", "password", "azerty", "qwerty")


class ProjectTermsValidator:
    """Refuse les mots de passe construits sur le nom du projet ou des motifs triviaux."""

    def validate(self, password, user=None):
        lowered = password.lower()
        for term in FORBIDDEN_TERMS:
            if term in lowered:
                raise ValidationError(
                    "Le mot de passe ne doit pas contenir le nom du projet ni de motif trivial.",
                    code="password_project_terms",
                )

    def get_help_text(self):
        return "Le mot de passe ne doit pas contenir « ORHS », « Bénin » ni de motif trivial."
