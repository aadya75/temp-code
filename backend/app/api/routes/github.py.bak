from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.github import GitHubRepoRequest, SourceCodeUploadResponse
from app.services.github_service import GitHubService
from app.services.minio_service import MinIOService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
github_service = GitHubService()
minio_service = MinIOService()

@router.post("/fetch-and-upload", response_model=SourceCodeUploadResponse)
async def fetch_github_repo(
    request: GitHubRepoRequest,
    background_tasks: BackgroundTasks
):
    """
    Fetch GitHub repository, generate directory tree, and upload to MinIO
    
    Args:
        request: Contains the GitHub repository URL
        
    Returns:
        SourceCodeUploadResponse with directory tree and MinIO path
    """
    try:
        # Fetch repository contents and directory tree
        repo_data = await github_service.get_repo_contents(str(request.repo_url))
        
        # Upload source code to MinIO
        minio_path = minio_service.upload_source_code(
            repo_data["repo_name"],
            repo_data["files_content"]
        )
        
        # Also upload directory tree separately
        tree_path = minio_service.upload_directory_tree(
            repo_data["repo_name"],
            {
                "repo_name": repo_data["repo_name"],
                "branch": repo_data["branch"],
                "tree": repo_data["tree"].dict(),
                "fetched_at": repo_data["fetched_at"]
            }
        )
        
        return SourceCodeUploadResponse(
            success=True,
            message=f"Successfully fetched and uploaded repository {repo_data['repo_name']}",
            minio_path=minio_path,
            directory_tree={
                "repo_name": repo_data["repo_name"],
                "branch": repo_data["branch"],
                "tree": repo_data["tree"].dict(),
                "minio_tree_path": tree_path,
                "fetched_at": repo_data["fetched_at"]
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/tree-only", response_model=SourceCodeUploadResponse)
async def get_directory_tree_only(
    request: GitHubRepoRequest
):
    """
    Fetch only the directory tree (without file contents) and upload to MinIO
    """
    try:
        # Fetch repository contents
        repo_data = await github_service.get_repo_contents(str(request.repo_url))
        
        # Upload only directory tree to MinIO
        tree_path = minio_service.upload_directory_tree(
            repo_data["repo_name"],
            {
                "repo_name": repo_data["repo_name"],
                "branch": repo_data["branch"],
                "tree": repo_data["tree"].dict(),
                "fetched_at": repo_data["fetched_at"]
            }
        )
        
        return SourceCodeUploadResponse(
            success=True,
            message=f"Successfully uploaded directory tree for {repo_data['repo_name']}",
            minio_path=tree_path,
            directory_tree={
                "repo_name": repo_data["repo_name"],
                "branch": repo_data["branch"],
                "tree": repo_data["tree"].dict(),
                "fetched_at": repo_data["fetched_at"]
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")