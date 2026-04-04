from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import httpx
from minio import Minio
from app.config import settings
import json

logger = logging.getLogger(__name__)

router = APIRouter()

class GitHubRepoRequest(BaseModel):
    repo_url: HttpUrl

class SourceCodeRequest(BaseModel):
    minio_path: str = Field(..., description="Path to the source code file in MinIO")
    file_path: str = Field(..., description="Path of the specific file within the repository")
    line_start: int = Field(..., ge=1, description="Starting line number (1-indexed)")
    line_end: int = Field(..., ge=1, description="Ending line number (1-indexed)")
    
    def validate_lines(self):
        if self.line_start > self.line_end:
            raise ValueError("line_start must be less than or equal to line_end")
        if self.line_end - self.line_start > 1000:  # Limit to 1000 lines per request
            raise ValueError("Maximum 1000 lines can be retrieved at once")
        return True

class SourceCodeResponse(BaseModel):
    success: bool
    file_path: str
    line_start: int
    line_end: int
    total_lines: int
    content: List[str]
    error: Optional[str] = None

def get_minio_client():
    """Get MinIO client instance"""
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure
    )

@router.post("/fetch-repo-data")
async def fetch_repo_data(request: GitHubRepoRequest):
    """Fetch GitHub repository metadata"""
    try:
        # Parse URL
        url = str(request.repo_url)
        parts = url.rstrip('/').split('/')
        owner = parts[-2]
        repo_name = parts[-1]
        
        # Call GitHub API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo_name}",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "data": {
                        "id": data.get("id"),
                        "name": data.get("name"),
                        "full_name": data.get("full_name"),
                        "description": data.get("description"),
                        "html_url": data.get("html_url"),
                        "stargazers_count": data.get("stargazers_count", 0),
                        "forks_count": data.get("forks_count", 0),
                        "language": data.get("language"),
                        "default_branch": data.get("default_branch")
                    }
                }
            else:
                return {
                    "success": False,
                    "error": f"GitHub API error: {response.status_code}"
                }
                
    except Exception as e:
        logger.error(f"Error fetching repo data: {e}")
        return {"success": False, "error": str(e)}

@router.post("/fetch-repo-tree")
async def fetch_repo_tree(request: GitHubRepoRequest):
    """Fetch repository file tree"""
    try:
        url = str(request.repo_url)
        parts = url.rstrip('/').split('/')
        owner = parts[-2]
        repo_name = parts[-1]
        
        # First get default branch
        async with httpx.AsyncClient() as client:
            repo_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo_name}",
                timeout=30
            )
            
            if repo_response.status_code != 200:
                return {"success": False, "error": "Failed to fetch repo info"}
            
            repo_data = repo_response.json()
            default_branch = repo_data.get("default_branch", "main")
            
            # Get tree
            tree_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/{default_branch}?recursive=1",
                timeout=30
            )
            
            if tree_response.status_code == 200:
                tree_data = tree_response.json()
                return {
                    "success": True,
                    "data": tree_data.get("tree", []),
                    "default_branch": default_branch
                }
            else:
                return {"success": False, "error": "Failed to fetch tree"}
                
    except Exception as e:
        logger.error(f"Error fetching repo tree: {e}")
        return {"success": False, "error": str(e)}

@router.post("/get-source-code-lines", response_model=SourceCodeResponse)
async def get_source_code_lines(request: SourceCodeRequest = Body(...)):
    """
    Retrieve specific lines of source code from a file stored in MinIO.
    
    Args:
        minio_path: Path to the source code JSON file in MinIO (e.g., "repo-name/source_code_20240101_120000.json")
        file_path: Path of the specific file within the repository (e.g., "src/index.js")
        line_start: Starting line number (1-indexed)
        line_end: Ending line number (1-indexed)
    
    Returns:
        Source code lines between line_start and line_end
    """
    try:
        # Validate line numbers
        request.validate_lines()
        
        # Initialize MinIO client
        minio_client = get_minio_client()
        bucket_name = settings.minio_bucket_name
        
        # Parse minio_path to get object name
        # minio_path format: "bucket_name/object_name" or just "object_name"
        if '/' in request.minio_path:
            parts = request.minio_path.split('/', 1)
            if len(parts) == 2 and parts[0] == bucket_name:
                object_name = parts[1]
            else:
                object_name = request.minio_path
        else:
            object_name = request.minio_path
        
        logger.info(f"Fetching object: {object_name} from bucket: {bucket_name}")
        
        # Get the object from MinIO
        try:
            response = minio_client.get_object(bucket_name, object_name)
            data = json.loads(response.read())
            response.close()
            response.release_conn()
        except Exception as e:
            logger.error(f"MinIO get error: {e}")
            raise HTTPException(status_code=404, detail=f"Source code file not found in MinIO: {str(e)}")
        
        # Extract files content
        files_content = data.get("files", {})
        
        # Find the requested file
        if request.file_path not in files_content:
            available_files = list(files_content.keys())[:10]  # Show first 10 files
            raise HTTPException(
                status_code=404, 
                detail=f"File '{request.file_path}' not found. Available files (first 10): {available_files}"
            )
        
        # Get file content
        file_content = files_content[request.file_path]
        
        # Split into lines
        lines = file_content.split('\n')
        total_lines = len(lines)
        
        # Validate line range
        if request.line_start > total_lines:
            raise HTTPException(
                status_code=400,
                detail=f"line_start ({request.line_start}) exceeds total lines ({total_lines})"
            )
        
        if request.line_end > total_lines:
            request.line_end = total_lines
            logger.warning(f"line_end adjusted to {total_lines} (total lines)")
        
        # Extract requested lines (convert to 0-indexed)
        start_idx = request.line_start - 1
        end_idx = request.line_end  # slice end is exclusive
        
        requested_lines = lines[start_idx:end_idx]
        
        return SourceCodeResponse(
            success=True,
            file_path=request.file_path,
            line_start=request.line_start,
            line_end=request.line_end,
            total_lines=total_lines,
            content=requested_lines,
            error=None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving source code: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/get-file-info")
async def get_file_info(
    minio_path: str = Body(..., embed=True),
    file_path: str = Body(..., embed=True)
):
    """
    Get information about a specific file in the repository.
    
    Args:
        minio_path: Path to the source code JSON file in MinIO
        file_path: Path of the specific file within the repository
    
    Returns:
        File information including total lines, size, etc.
    """
    try:
        # Initialize MinIO client
        minio_client = get_minio_client()
        bucket_name = settings.minio_bucket_name
        
        # Parse minio_path
        if '/' in minio_path:
            parts = minio_path.split('/', 1)
            object_name = parts[1] if len(parts) == 2 and parts[0] == bucket_name else minio_path
        else:
            object_name = minio_path
        
        # Get the object from MinIO
        response = minio_client.get_object(bucket_name, object_name)
        data = json.loads(response.read())
        response.close()
        response.release_conn()
        
        # Extract files content
        files_content = data.get("files", {})
        
        # Find the requested file
        if file_path not in files_content:
            return {
                "success": False,
                "error": f"File '{file_path}' not found"
            }
        
        # Get file content
        file_content = files_content[file_path]
        lines = file_content.split('\n')
        
        return {
            "success": True,
            "file_path": file_path,
            "total_lines": len(lines),
            "file_size_bytes": len(file_content),
            "file_size_kb": round(len(file_content) / 1024, 2),
            "language": file_path.split('.')[-1] if '.' in file_path else 'unknown'
        }
        
    except Exception as e:
        logger.error(f"Error getting file info: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/search-in-file")
async def search_in_file(
    minio_path: str = Body(..., embed=True),
    file_path: str = Body(..., embed=True),
    search_term: str = Body(..., embed=True),
    case_sensitive: bool = Body(False, embed=True)
):
    """
    Search for a term in a specific file and return line numbers.
    
    Args:
        minio_path: Path to the source code JSON file in MinIO
        file_path: Path of the specific file within the repository
        search_term: Term to search for
        case_sensitive: Whether the search should be case sensitive
    
    Returns:
        Line numbers and context where the search term appears
    """
    try:
        # Initialize MinIO client
        minio_client = get_minio_client()
        bucket_name = settings.minio_bucket_name
        
        # Parse minio_path
        if '/' in minio_path:
            parts = minio_path.split('/', 1)
            object_name = parts[1] if len(parts) == 2 and parts[0] == bucket_name else minio_path
        else:
            object_name = minio_path
        
        # Get the object from MinIO
        response = minio_client.get_object(bucket_name, object_name)
        data = json.loads(response.read())
        response.close()
        response.release_conn()
        
        # Extract files content
        files_content = data.get("files", {})
        
        # Find the requested file
        if file_path not in files_content:
            return {
                "success": False,
                "error": f"File '{file_path}' not found"
            }
        
        # Get file content
        file_content = files_content[file_path]
        lines = file_content.split('\n')
        
        # Search for term
        results = []
        for i, line in enumerate(lines, start=1):
            if case_sensitive:
                if search_term in line:
                    results.append({
                        "line_number": i,
                        "content": line.strip(),
                        "context": {
                            "before": lines[i-2] if i > 1 else None,
                            "after": lines[i] if i < len(lines) else None
                        }
                    })
            else:
                if search_term.lower() in line.lower():
                    results.append({
                        "line_number": i,
                        "content": line.strip(),
                        "context": {
                            "before": lines[i-2] if i > 1 else None,
                            "after": lines[i] if i < len(lines) else None
                        }
                    })
        
        return {
            "success": True,
            "file_path": file_path,
            "search_term": search_term,
            "matches_found": len(results),
            "results": results[:50]  # Limit to 50 results
        }
        
    except Exception as e:
        logger.error(f"Error searching file: {e}")
        return {
            "success": False,
            "error": str(e)
        }