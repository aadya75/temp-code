# Canonical auth models — used across the app.
# routes/auth.py imports from here to avoid duplication.
from pydantic import BaseModel, EmailStr
from typing import Optional


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    success: bool
    user: Optional[dict] = None
    error: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class SessionResponse(BaseModel):
    success: bool
    user: Optional[dict] = None


class RefreshResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[dict] = None
    error: Optional[str] = None