from pydantic import BaseModel, HttpUrl, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class GitHubRepoRequest(BaseModel):
    repo_url: HttpUrl = Field(..., description="GitHub repository URL")
    
    class Config:
        json_schema_extra = {
            "example": {
                "repo_url": "https://github.com/octocat/Hello-World"
            }
        }

class FileNode(BaseModel):
    name: str
    path: str
    type: str  # 'file' or 'directory'
    size: Optional[int] = None
    children: Optional[List['FileNode']] = None

class DirectoryTreeResponse(BaseModel):
    repo_name: str
    branch: str
    tree: FileNode
    minio_object_path: Optional[str] = None
    fetched_at: datetime

class SourceCodeUploadResponse(BaseModel):
    success: bool
    message: str
    minio_path: str
    directory_tree: Dict[str, Any]

# Supabase DB Models
class SaveAnalysisRequest(BaseModel):
    user_id: str
    repo_url: str
    repo_name: str
    full_name: str
    description: Optional[str]
    stars: int
    forks: int
    language: Optional[str]
    file_tree: Dict[str, Any]

class SaveKnowledgeGraphRequest(BaseModel):
    repo_id: int
    graph_data: Dict[str, Any]
    nodes_count: int
    edges_count: int

# Update forward reference
FileNode.model_rebuild()