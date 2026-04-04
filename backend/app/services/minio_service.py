from minio import Minio
from minio.error import S3Error
from app.config import settings
import json
import io
from typing import Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class MinIOService:
    def __init__(self):
        try:
            self.client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure
            )
            self.bucket_name = settings.minio_bucket_name
            self._ensure_bucket()
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {e}")
            raise
    
    def _ensure_bucket(self):
        """Ensure bucket exists, create if not"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
            else:
                logger.info(f"Bucket already exists: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Error ensuring bucket: {e}")
            raise
    
    def upload_source_code(self, repo_name: str, files_content: Dict[str, str]) -> str:
        """Upload all source code files to MinIO as JSON"""
        try:
            # Create object name with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_name = f"{repo_name}/source_code_{timestamp}.json"
            
            # Prepare data structure
            upload_data = {
                "repo_name": repo_name,
                "uploaded_at": datetime.now().isoformat(),
                "files": files_content
            }
            
            # Convert to JSON
            json_str = json.dumps(upload_data, indent=2, default=str)
            json_bytes = json_str.encode('utf-8')
            json_io = io.BytesIO(json_bytes)
            
            # Upload to MinIO
            self.client.put_object(
                self.bucket_name,
                object_name,
                json_io,
                length=len(json_bytes),
                content_type="application/json"
            )
            
            # Return the object path
            object_path = f"{self.bucket_name}/{object_name}"
            logger.info(f"Successfully uploaded source code to {object_path}")
            
            return object_path
            
        except Exception as e:
            logger.error(f"Failed to upload to MinIO: {e}")
            raise
    
    def upload_directory_tree(self, repo_name: str, tree_data: Dict[str, Any]) -> str:
        """Upload directory tree to MinIO"""
        try:
            # Create object name with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_name = f"{repo_name}/directory_tree_{timestamp}.json"
            
            # Convert to JSON
            json_str = json.dumps(tree_data, indent=2, default=str)
            json_bytes = json_str.encode('utf-8')
            json_io = io.BytesIO(json_bytes)
            
            # Upload to MinIO
            self.client.put_object(
                self.bucket_name,
                object_name,
                json_io,
                length=len(json_bytes),
                content_type="application/json"
            )
            
            # Return the object path
            object_path = f"{self.bucket_name}/{object_name}"
            logger.info(f"Successfully uploaded directory tree to {object_path}")
            
            return object_path
            
        except Exception as e:
            logger.error(f"Failed to upload directory tree to MinIO: {e}")
            raise