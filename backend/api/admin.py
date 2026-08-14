from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

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


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = ("username", "email", "first_name", "last_name", "is_staff")
    list_select_related = ("profile",)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(Departement)
admin.site.register(ZoneSanitaire)
admin.site.register(Structure)
admin.site.register(UserProfile)
admin.site.register(CampagneCollecte)
admin.site.register(DeclarationRHS)
admin.site.register(AgentSante)
admin.site.register(ImportFichier)
admin.site.register(CategoriePublication)
admin.site.register(Publication)
admin.site.register(AuditLog)
admin.site.register(MouvementAgent)
admin.site.register(AlerteEmail)
admin.site.register(ConfigAlerte)
