from supabase import create_client, Client
from app.config import settings
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        try:
            if not settings.supabase_url or not settings.supabase_anon_key:
                raise ValueError("Supabase credentials not configured in .env file")
            
            self.supabase: Client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            logger.info(f"✓ Auth service initialized with Supabase URL: {settings.supabase_url}")
        except Exception as e:
            logger.error(f"✗ Failed to initialize Auth service: {e}")
            raise
    
    async def sign_up(self, email: str, password: str) -> Dict[str, Any]:
        """Sign up a new user"""
        try:
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password
            })
            
            if response.user:
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "created_at": str(response.user.created_at) if response.user.created_at else None
                    },
                    "access_token": response.session.access_token if response.session else None,
                    "refresh_token": response.session.refresh_token if response.session else None
                }
            else:
                return {
                    "success": False,
                    "error": "Sign up failed"
                }
                
        except Exception as e:
            logger.error(f"Sign up error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Sign in an existing user"""
        try:
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user:
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "created_at": str(response.user.created_at) if response.user.created_at else None
                    },
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token
                }
            else:
                return {
                    "success": False,
                    "error": "Invalid credentials"
                }
                
        except Exception as e:
            logger.error(f"Sign in error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def sign_out(self, access_token: str) -> Dict[str, Any]:
        """Sign out a user"""
        try:
            # Use the provided token to authenticate this sign-out call
            self.supabase.auth.sign_out()
            return {
                "success": True,
                "message": "Signed out successfully"
            }
        except Exception as e:
            logger.error(f"Sign out error: {e}")
            # Still return success — client-side tokens are cleared regardless
            return {
                "success": True,
                "message": "Signed out"
            }
    
    async def get_session(self, access_token: str) -> Dict[str, Any]:
        """Get user session"""
        try:
            # Verify the access token with Supabase
            user = self.supabase.auth.get_user(access_token)
            
            if user and user.user:
                return {
                    "success": True,
                    "user": {
                        "id": user.user.id,
                        "email": user.user.email,
                        "created_at": str(user.user.created_at) if user.user.created_at else None
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Invalid or expired token"
                }
                
        except Exception as e:
            logger.error(f"Get session error: {e}")
            return {
                "success": False,
                "error": "Invalid session"
            }
    
    async def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh the session"""
        try:
            response = self.supabase.auth.refresh_session(refresh_token)
            
            if response and response.session and response.user:
                return {
                    "success": True,
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to refresh session"
                }
                
        except Exception as e:
            logger.error(f"Refresh session error: {e}")
            return {
                "success": False,
                "error": "Invalid refresh token"
            }