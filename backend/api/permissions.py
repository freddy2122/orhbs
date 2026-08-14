from api.models import DeclarationRHS, Structure, UserProfile


def get_user_profile(user):
    return getattr(user, "profile", None)


def declarations_queryset_for_user(user, queryset=None):
    qs = queryset or DeclarationRHS.objects.all()
    profile = get_user_profile(user)
    if not profile:
        return qs.none()
    if profile.role == UserProfile.Role.ADMIN or profile.scope == UserProfile.Scope.NATIONAL:
        if profile.role in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.ANALYSTE,
            UserProfile.Role.DECIDEUR,
            UserProfile.Role.PARTENAIRE,
        ):
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
    if profile.scope == UserProfile.Scope.NATIONAL:
        return qs
    if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
        return qs.filter(departement_id=profile.departement_id)
    if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
        return qs.filter(id=profile.structure_id)
    return qs.none()
