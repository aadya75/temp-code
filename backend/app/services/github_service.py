from github import Github, GithubException
from app.config import settings
from app.models.github import FileNode
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        try:
            # Check if github_token exists in settings
            token = getattr(settings, 'github_token', None)
            
            if token:
                self.g = Github(token, timeout=settings.github_api_timeout)
                logger.info("Using authenticated GitHub API (higher rate limit)")
            else:
                self.g = Github(timeout=settings.github_api_timeout)
                logger.warning("Using unauthenticated GitHub API (60 requests/hour)")
        except Exception as e:
            logger.error(f"Error initializing GitHub client: {e}")
            self.g = Github(timeout=30)
    
    def parse_github_url(self, url: str):
        """Parse GitHub URL to extract owner and repo name"""
        import re
        url = url.rstrip('/')
        pattern = r'github\.com/([^/]+)/([^/]+)'
        match = re.search(pattern, url)
        
        if not match:
            raise ValueError(f"Invalid GitHub URL: {url}")
        
        owner = match.group(1)
        repo_name = match.group(2)
        
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
        
        return owner, repo_name
    
    async def fetch_repo_data(self, repo_url: str) -> Dict[str, Any]:
        """Fetch GitHub repository metadata"""
        try:
            owner, repo_name = self.parse_github_url(repo_url)
            repo = self.g.get_repo(f"{owner}/{repo_name}")
            
            return {
                "success": True,
                "data": {
                    "id": repo.id,
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "html_url": repo.html_url,
                    "stargazers_count": repo.stargazers_count,
                    "forks_count": repo.forks_count,
                    "language": repo.language,
                    "default_branch": repo.default_branch,
                    "created_at": repo.created_at.isoformat() if repo.created_at else None,
                    "updated_at": repo.updated_at.isoformat() if repo.updated_at else None
                }
            }
        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
            return {
                "success": False,
                "error": e.data.get("message", str(e)) if hasattr(e, 'data') else str(e)
            }
        except Exception as e:
            logger.error(f"Error fetching repo data: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def fetch_repo_tree(self, repo_url: str, recursive: bool = True) -> Dict[str, Any]:
        """Fetch repository file tree"""
        try:
            owner, repo_name = self.parse_github_url(repo_url)
            repo = self.g.get_repo(f"{owner}/{repo_name}")
            
            default_branch = repo.default_branch
            branch = repo.get_branch(default_branch)
            tree = repo.get_git_tree(sha=branch.commit.sha, recursive=recursive)
            
            tree_items = []
            for item in tree.tree:
                tree_items.append({
                    "path": item.path,
                    "type": "blob" if item.type == "blob" else "tree",
                    "size": item.size if item.type == "blob" else None,
                    "sha": item.sha
                })
            
            return {
                "success": True,
                "data": tree_items,
                "default_branch": default_branch
            }
            
        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
            return {
                "success": False,
                "error": e.data.get("message", str(e)) if hasattr(e, 'data') else str(e)
            }
        except Exception as e:
            logger.error(f"Error fetching repo tree: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_repo_contents(self, repo_url: str) -> Dict[str, Any]:
        """Get full repository contents with file content"""
        try:
            owner, repo_name = self.parse_github_url(repo_url)
            repo = self.g.get_repo(f"{owner}/{repo_name}")
            
            default_branch = repo.default_branch
            branch = repo.get_branch(default_branch)
            tree = repo.get_git_tree(sha=branch.commit.sha, recursive=True)
            
            file_tree = {}
            files_content = {}
            
            for item in tree.tree:
                if item.type == "blob":
                    parts = item.path.split('/')
                    current = file_tree
                    for i, part in enumerate(parts):
                        if i == len(parts) - 1:
                            current[part] = {
                                "name": part,
                                "type": "file",
                                "path": item.path,
                                "size": item.size
                            }
                        else:
                            if part not in current:
                                current[part] = {
                                    "name": part,
                                    "type": "directory",
                                    "children": {}
                                }
                            current = current[part]["children"]
                    
                    if item.size and item.size < 1000000:
                        try:
                            file_content = repo.get_contents(item.path, ref=default_branch)
                            files_content[item.path] = file_content.decoded_content.decode('utf-8', errors='ignore')
                        except:
                            files_content[item.path] = "Unable to decode file content"
            
            tree_structure = self._dict_to_filenode(file_tree, repo_name)
            
            return {
                "repo_name": repo_name,
                "branch": default_branch,
                "tree": tree_structure,
                "files_content": files_content,
                "fetched_at": datetime.now()
            }
            
        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
            raise Exception(f"Failed to fetch repository: {str(e)}")
    
    def _dict_to_filenode(self, data: dict, name: str) -> FileNode:
        """Convert nested dictionary to FileNode structure"""
        children = []
        
        for key, value in data.items():
            if value.get("type") == "file":
                children.append(FileNode(
                    name=key,
                    path=value.get("path", key),
                    type="file",
                    size=value.get("size")
                ))
            elif value.get("type") == "directory":
                child_node = self._dict_to_filenode(
                    value.get("children", {}), 
                    key
                )
                children.append(child_node)
        
        return FileNode(
            name=name,
            path="",
            type="directory",
            children=children if children else None
        )