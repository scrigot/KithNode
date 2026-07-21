"""Internal service authentication for every non-health FastAPI route."""

import hmac
import os

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def require_internal_api(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> None:
    expected = os.environ.get("INTERNAL_API_SECRET", "")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal API authentication is not configured",
        )
    provided = credentials.credentials if credentials and credentials.scheme == "Bearer" else ""
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )
