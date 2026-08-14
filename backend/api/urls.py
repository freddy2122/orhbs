from django.urls import path

from . import views, views_acteurs, views_admin, views_alerts, views_cms, views_collecte, views_monitoring, views_offline, views_reports, views_stats

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    # Statistiques RHS (données validées)
    path("stats/national/", views_stats.NationalStatsView.as_view(), name="stats-national"),
    path("stats/departements/", views_stats.DepartementStatsView.as_view(), name="stats-departements"),
    path("stats/zones/", views_stats.ZoneStatsView.as_view(), name="stats-zones"),
    path("stats/structures/", views_stats.StructureStatsView.as_view(), name="stats-structures"),
    # Espace acteurs
    path("acteurs/planification/", views_acteurs.PlanificationView.as_view(), name="acteurs-planification"),
    path("acteurs/cartographie/", views_acteurs.CartographyView.as_view(), name="acteurs-cartographie"),
    path("acteurs/competences/", views_acteurs.CompetencesView.as_view(), name="acteurs-competences"),
    path("acteurs/interoperabilite/", views_acteurs.InteroperabiliteView.as_view(), name="acteurs-interoperabilite"),
    # Collecte
    path("collecte/campagne/", views_collecte.ActiveCampagneView.as_view(), name="collecte-campagne"),
    path("collecte/fields/", views_collecte.CollecteFieldsView.as_view(), name="collecte-fields"),
    path("collecte/structures/", views_collecte.StructureListView.as_view(), name="collecte-structures"),
    path("collecte/progress/", views_collecte.CollectionProgressView.as_view(), name="collecte-progress"),
    path("collecte/template-excel/", views_collecte.ExcelTemplateView.as_view(), name="collecte-template-excel"),
    path("collecte/import-excel/", views_collecte.ExcelImportView.as_view(), name="collecte-import-excel"),
    path("collecte/agents/", views_collecte.AgentListView.as_view(), name="collecte-agents"),
    path("collecte/declarations/", views_collecte.DeclarationListCreateView.as_view(), name="declarations-list"),
    path("collecte/declarations/<int:pk>/", views_collecte.DeclarationDetailView.as_view(), name="declarations-detail"),
    path("collecte/declarations/<int:pk>/submit/", views_collecte.DeclarationSubmitView.as_view(), name="declarations-submit"),
    path("collecte/declarations/<int:pk>/validate/", views_collecte.DeclarationValidateView.as_view(), name="declarations-validate"),
    # CMS - Publications
    path("cms/categories/", views_cms.CategoriePublicationListView.as_view(), name="cms-categories"),
    path("cms/publications/", views_cms.PublicationListView.as_view(), name="cms-publications"),
    path("cms/publications/<int:pk>/", views_cms.PublicationDetailView.as_view(), name="cms-publication-detail"),
    path("cms/publications/<int:pk>/download/", views_cms.PublicationDownloadView.as_view(), name="cms-publication-download"),
    # Administration
    path("admin/users/", views_admin.UserManagementView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/", views_admin.UserDetailView.as_view(), name="admin-user-detail"),
    path("admin/audit/", views_admin.AuditLogView.as_view(), name="admin-audit"),
    path("admin/mouvements/", views_admin.MouvementAgentListView.as_view(), name="admin-mouvements"),
    path("admin/alertes/", views_admin.AlerteEmailListView.as_view(), name="admin-alertes"),
    path("admin/config-alertes/", views_admin.ConfigAlerteListView.as_view(), name="admin-config-alertes"),
    path("admin/config-alertes/<int:pk>/", views_admin.ConfigAlerteDetailView.as_view(), name="admin-config-alerte-detail"),
    # Rapports personnalisés
    path("reports/modeles/", views_reports.ReportModelsView.as_view(), name="reports-models"),
    path("reports/generate/", views_reports.ReportGenerateView.as_view(), name="reports-generate"),
    # Alertes avancées
    path("alerts/advanced/", views_alerts.AdvancedAlertsView.as_view(), name="alerts-advanced"),
    path("alerts/trigger/", views_alerts.TriggerAlertsView.as_view(), name="alerts-trigger"),
    # Mode hors ligne
    path("offline/export/", views_offline.OfflineDataExportView.as_view(), name="offline-export"),
    path("offline/sync/", views_offline.OfflineSyncView.as_view(), name="offline-sync"),
    path("offline/conflicts/", views_offline.OfflineConflictDetectionView.as_view(), name="offline-conflicts"),
    # Monitoring et sauvegardes
    path("monitoring/health/", views_monitoring.SystemHealthView.as_view(), name="monitoring-health"),
    path("monitoring/backup/trigger/", views_monitoring.BackupTriggerView.as_view(), name="monitoring-backup-trigger"),
    path("monitoring/backup/history/", views_monitoring.BackupHistoryView.as_view(), name="monitoring-backup-history"),
    path("monitoring/metrics/", views_monitoring.MonitoringMetricsView.as_view(), name="monitoring-metrics"),
]
