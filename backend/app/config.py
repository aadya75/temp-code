from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    app_name: str = "GitHub Repo Fetcher"
    app_version: str = "1.0.0"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 8000
    
    # MinIO Settings
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_name: str = "github-repos"
    minio_secure: bool = False
    
    # GitHub Settings
    github_api_timeout: int = 30
    github_token: str
    supabase_url: str
    supabase_anon_key: str
  
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()