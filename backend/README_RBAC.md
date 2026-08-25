ORHS RBAC matrix and documentation

Summary
=======
This document describes the role-based access control (RBAC) model used by ORHS, mapping roles to permissions and typical scopes.

Roles and scopes
----------------
- Roles:
  - ADMIN: system administrators and ORHS central team
  - COORDINATION: departmental/regional coordinators
  - ANALYSTE: analytical staff
  - VALIDATEUR: validators (quality control)
  - COLLECTEUR: data collectors (structure-level)
  - DECIDEUR: decision makers (read-only)
  - PARTENAIRE: partners (read-only aggregated)

- Scopes:
  - NATIONAL
  - DEPARTEMENTAL
  - STRUCTURE

Permission classes (DRF)
------------------------
The backend exposes a set of reusable DRF BasePermission classes in backend/api/permissions.py. Key ones:
- IsAdmin: ADMIN only
- IsAdminOrCoordination: ADMIN or COORDINATION
- IsCollectorOrCoordinatorOrAdmin: collector/coordination/admin for create operations
- IsValidatorOrCoordinationOrAdmin: for validation flows
- IsNationalOrManagement: requires national scope or management role

Principles
----------
- Permissions are role-based first, then scoped by user's `scope` and linked IDs (departement_id, structure_id).
- Do not duplicate role checks in views: prefer permission classes and helper queryset filters (declarations_queryset_for_user, structures_queryset_for_user).
- Soft-delete policy: master-data entities include `actif` boolean. By default, endpoints must filter actif=True unless explicitly requested.

Example mappings
----------------
- Admin endpoints (master-data CRUD, user management): IsAdmin
- Audit logs: IsAdminOrCoordination
- Collecte endpoints (create declarations, create agents): IsCollectorOrCoordinatorOrAdmin
- Validation endpoints: IsValidatorOrCoordinationOrAdmin
- National statistics: IsNationalOrManagement

Operational notes
-----------------
- Use get_user_profile(user) helper for robust profile access in views instead of getattr(user, "profile", None).
- Use declarations_queryset_for_user(user) and structures_queryset_for_user(user) to limit queryset per-perimeter.
- Always add tests for permission behavior (403 for unauthorized, 401 for unauthenticated).

Contact
-------
For changes to the RBAC matrix, update this file and the permission classes in backend/api/permissions.py.
