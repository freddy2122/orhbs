from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


def _enforce_csrf(request):
    """Reject unsafe requests without a valid CSRF token.

    A JWT sent via an ``Authorization`` header is immune to CSRF (browsers
    never attach custom headers cross-site), but here the token also rides
    along as a cookie so the SPA works across the Vercel/Render origins —
    and a cookie *is* attached automatically by the browser on cross-site
    requests. Without this check, any site could ride an authenticated
    user's cookie into state-changing calls. This reuses DRF's own
    CsrfViewMiddleware-based check, the same one SessionAuthentication runs.
    """

    def dummy_get_response(request):
        return None

    check = CSRFCheck(dummy_get_response)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        _enforce_csrf(request)
        return self.get_user(validated_token), validated_token
