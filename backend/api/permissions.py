from rest_framework.permissions import BasePermission

from api.models import AgentSante, DeclarationRHS, Structure, UserProfile


ORHS_ROLES = (
    UserProfile.Role.ADMIN,
    UserProfile.Role.COORDINATION,
    UserProfile.Role.ANALYSTE,
    UserProfile.Role.VALIDATEUR,
    UserProfile.Role.COLLECTEUR,
    UserProfile.Role.DECIDEUR,
    UserProfile.Role.PARTENAIRE,
)

MANAGEMENT_ROLES = (
    UserProfile.Role.ADMIN,
    UserProfile.Role.COORDINATION,
    UserProfile.Role.ANALYSTE,
)

READ_ONLY_ROLES = (
    UserProfile.Role.DECIDEUR,
    UserProfile.Role.PARTENAIRE,
)


def get_user_profile(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    return getattr(user, "profile", None)


def user_has_any_role(user, *roles):
    profile = get_user_profile(user)
    if not profile:
        return False
    return profile.role in roles


def user_has_scope(user, *scopes):
    profile = get_user_profile(user)
    if not profile:
        return False
    return profile.scope in scopes


def user_can_access_national_data(user):
    profile = get_user_profile(user)
    if not profile:
        return False
    return profile.scope == UserProfile.Scope.NATIONAL or profile.role in MANAGEMENT_ROLES


class IsNationalOrManagement(BasePermission):
    """Allows access if the user has national scope or is in a management role (admin/coordination/analyste)."""

    def has_permission(self, request, view):
        return user_can_access_national_data(request.user)


class UserRolePermission(BasePermission):
    allowed_roles = ()
    allowed_scopes = ()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = get_user_profile(request.user)
        if not profile:
            return False
        if self.allowed_roles and profile.role not in self.allowed_roles:
            return False
        if self.allowed_scopes and profile.scope not in self.allowed_scopes:
            return False
        return True


class IsAdmin(UserRolePermission):
    allowed_roles = (UserProfile.Role.ADMIN,)


class IsCoordination(UserRolePermission):
    allowed_roles = (UserProfile.Role.COORDINATION,)


class IsAdminOrCoordination(UserRolePermission):
    allowed_roles = (UserProfile.Role.ADMIN, UserProfile.Role.COORDINATION)


class IsValidator(UserRolePermission):
    allowed_roles = (UserProfile.Role.VALIDATEUR,)


class IsCollector(UserRolePermission):
    allowed_roles = (UserProfile.Role.COLLECTEUR,)


class IsDecideur(UserRolePermission):
    allowed_roles = (UserProfile.Role.DECIDEUR,)


class IsPartenaire(UserRolePermission):
    allowed_roles = (UserProfile.Role.PARTENAIRE,)


class IsCollectorOrCoordinatorOrAdmin(UserRolePermission):
    """Saisie, import et mise à jour des déclarations / fiches (périmètre utilisateur)."""

    allowed_roles = (
        UserProfile.Role.COLLECTEUR,
        UserProfile.Role.VALIDATEUR,
        UserProfile.Role.COORDINATION,
        UserProfile.Role.ADMIN,
    )


class CanViewDeclarations(UserRolePermission):
    allowed_roles = (
        UserProfile.Role.COLLECTEUR,
        UserProfile.Role.VALIDATEUR,
        UserProfile.Role.COORDINATION,
        UserProfile.Role.ADMIN,
        UserProfile.Role.ANALYSTE,
        UserProfile.Role.DECIDEUR,
    )


class CanViewAgents(UserRolePermission):
    """Lecture des fiches agents dans le périmètre utilisateur."""

    allowed_roles = (
        UserProfile.Role.COLLECTEUR,
        UserProfile.Role.VALIDATEUR,
        UserProfile.Role.COORDINATION,
        UserProfile.Role.ADMIN,
        UserProfile.Role.ANALYSTE,
        UserProfile.Role.DECIDEUR,
    )


class IsAnalyst(UserRolePermission):
    allowed_roles = (UserProfile.Role.ANALYSTE,)


class IsAdminOrCoordinationOrAnalyst(UserRolePermission):
    allowed_roles = (
        UserProfile.Role.ADMIN,
        UserProfile.Role.COORDINATION,
        UserProfile.Role.ANALYSTE,
    )


class IsValidatorOrCoordinationOrAdmin(UserRolePermission):
    allowed_roles = (
        UserProfile.Role.VALIDATEUR,
        UserProfile.Role.COORDINATION,
        UserProfile.Role.ADMIN,
    )


class IsBusinessUser(UserRolePermission):
    allowed_roles = ORHS_ROLES


class IsReadOnlyDecisionMaker(UserRolePermission):
    allowed_roles = READ_ONLY_ROLES


def declarations_queryset_for_user(user, queryset=None):
    qs = queryset or DeclarationRHS.objects.all()
    profile = get_user_profile(user)
    if not profile:
        return qs.none()

    if profile.role in MANAGEMENT_ROLES or profile.scope == UserProfile.Scope.NATIONAL:
        return qs

    if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
        return qs.filter(structure__departement_id=profile.departement_id)

    if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
        return qs.filter(structure_id=profile.structure_id)

    if profile.role == UserProfile.Role.VALIDATEUR and profile.departement_id:
        return qs.filter(structure__departement_id=profile.departement_id)

    return qs.none()


def structures_queryset_for_user(user, queryset=None):
    qs = queryset or Structure.objects.filter(actif=True)
    profile = get_user_profile(user)
    if not profile:
        return qs.none()

    if profile.role in MANAGEMENT_ROLES or profile.scope == UserProfile.Scope.NATIONAL:
        return qs

    if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
        return qs.filter(departement_id=profile.departement_id)

    if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
        return qs.filter(id=profile.structure_id)

    return qs.none()


def agents_queryset_for_user(user, queryset=None):
    qs = queryset if queryset is not None else AgentSante.objects.filter(actif=True)
    profile = get_user_profile(user)
    if not profile:
        return qs.none()

    if profile.role in MANAGEMENT_ROLES or profile.scope == UserProfile.Scope.NATIONAL:
        return qs

    if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
        return qs.filter(structure__departement_id=profile.departement_id)

    if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
        return qs.filter(structure_id=profile.structure_id)

    if profile.role == UserProfile.Role.VALIDATEUR and profile.departement_id:
        return qs.filter(structure__departement_id=profile.departement_id)

    return qs.none()
