from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from app.models.github import GitHubRepoRequest, SourceCodeUploadResponse
from app.services.github_service import GitHubService
from app.services.minio_service import MinIOService
from app.core.traceability import trace_manager  # ADD THIS
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
github_service = GitHubService()
minio_service = MinIOService()

@router.post("/fetch-and-upload", response_model=SourceCodeUploadResponse)
async def fetch_github_repo(
    request: GitHubRepoRequest,
    background_tasks: BackgroundTasks,
    req: Request  # ADD THIS to get request info
):
    """
    Fetch GitHub repository, generate directory tree, and upload to MinIO
    """
    # Start trace for this request
    trace = trace_manager.start_trace(
        endpoint="/fetch-and-upload",
        method="POST",
        user_id=req.headers.get("x-user-id", "anonymous")
    )
    
    try:
        async with trace_manager.span("api_handler.fetch_and_upload", "api"):
            # Fetch repository contents and directory tree
            repo_data = await github_service.get_repo_contents(str(request.repo_url))
            
            async with trace_manager.span("minio_upload_source_code", "minio_service"):
                minio_path = minio_service.upload_source_code(
                    repo_data["repo_name"],
                    repo_data["files_content"]
                )
            
            async with trace_manager.span("minio_upload_directory_tree", "minio_service"):
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
                    "fetched_at": repo_data["fetched_at"],
                    "trace_id": trace.trace_id  # ADD trace_id to response
                }
            )
    
    except ValueError as e:
        async with trace_manager.span("error_handling", "api"):
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        async with trace_manager.span("error_handling", "api"):
            logger.error(f"Error processing request: {e}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        trace_manager.end_trace()

@router.post("/tree-only", response_model=SourceCodeUploadResponse)
async def get_directory_tree_only(
    request: GitHubRepoRequest,
    req: Request
):
    """Fetch only the directory tree (without file contents) and upload to MinIO"""
    trace = trace_manager.start_trace(
        endpoint="/tree-only",
        method="POST",
        user_id=req.headers.get("x-user-id", "anonymous")
    )
    
    try:
        async with trace_manager.span("api_handler.tree_only", "api"):
            repo_data = await github_service.get_repo_contents(str(request.repo_url))
            
            async with trace_manager.span("minio_upload_directory_tree", "minio_service"):
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
                    "fetched_at": repo_data["fetched_at"],
                    "trace_id": trace.trace_id
                }
            )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        trace_manager.end_trace()

# ADD NEW ROUTES FOR TRACEABILITY
@router.get("/traces/recent")
async def get_recent_traces(limit: int = 20):
    """Get recent execution traces"""
    traces = trace_manager.get_recent_traces(limit)
    return [
        {
            "trace_id": t.trace_id,
            "endpoint": t.endpoint,
            "method": t.method,
            "duration_ms": t.total_duration_ms,
            "start_time": t.start_time.isoformat(),
            "spans_count": len(t.spans)
        }
        for t in traces
    ]

@router.get("/traces/{trace_id}")
async def get_trace_detail(trace_id: str):
    """Get detailed trace information"""
    trace = trace_manager.get_trace(trace_id)
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")
    
    return {
        "trace_id": trace.trace_id,
        "endpoint": trace.endpoint,
        "method": trace.method,
        "start_time": trace.start_time.isoformat(),
        "duration_ms": trace.total_duration_ms,
        "spans": [
            {
                "operation": s.operation_name,
                "service": s.service_name,
                "duration_ms": s.duration_ms,
                "status": s.status,
                "error": s.error_message,
                "tags": s.tags
            }
            for s in trace.spans
        ]
    }

@router.get("/call-graph")
async def get_call_graph():
    """Get the cross-functional call graph"""
    return trace_manager.get_call_graph()