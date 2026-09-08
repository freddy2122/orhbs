from rest_framework.exceptions import Throttled
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Limits /api/auth/login/ attempts per client IP.

    Scoped separately from DRF's built-in "anon" throttle so it never
    touches unrelated public endpoints (stats, CMS, newsletter…) — only
    repeated login attempts, whether the password is right or wrong, count
    against the limit. Rate is set via DEFAULT_THROTTLE_RATES["login"]
    (see DJANGO_LOGIN_THROTTLE_RATE in settings.py).
    """

    scope = "login"


class LoginThrottled(Throttled):
    """Same as DRF's Throttled, worded in French to match the rest of the API."""

    default_detail = "Trop de tentatives de connexion."
    extra_detail_singular = "Réessayez dans {wait} seconde."
    extra_detail_plural = "Réessayez dans {wait} secondes."
