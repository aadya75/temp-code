from github import Github, GithubException, ContentFile
from typing import Dict, Any, List, Optional
from app.models.github import FileNode
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        self.g = Github(timeout=30)
    
    def parse_github_url(self, url: str) -> tuple[str, str]:
        """Parse GitHub URL to extract owner and repo name"""
        # Remove trailing slash if present
        url = url.rstrip('/')
        
        # Pattern to match GitHub repo URLs
        pattern = r'github\.com/([^/]+)/([^/]+)'
        match = re.search(pattern, url)
        
        if not match:
            raise ValueError(f"Invalid GitHub URL: {url}")
        
        owner = match.group(1)
        repo_name = match.group(2)
        
        # Remove .git suffix if present
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
        
        return owner, repo_name
    
    async def get_repo_contents(self, repo_url: str) -> Dict[str, Any]:
        """Fetch repository contents and build directory tree"""
        try:
            # Parse URL
            owner, repo_name = self.parse_github_url(repo_url)
            
            # Get repository
            repo = self.g.get_repo(f"{owner}/{repo_name}")
            
            # Get default branch
            default_branch = repo.default_branch
            
            # Build directory tree from root
            contents = repo.get_contents("", ref=default_branch)
            tree = await self._build_tree(contents, repo, default_branch)
            
            # Get all files content
            files_content = await self._fetch_all_files(repo, default_branch)
            
            return {
                "repo_name": repo_name,
                "branch": default_branch,
                "tree": tree,
                "files_content": files_content,
                "fetched_at": datetime.now()
            }
            
        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
            raise Exception(f"Failed to fetch repository: {str(e)}")
        except Exception as e:
            logger.error(f"Error fetching repo contents: {e}")
            raise
    
    async def _build_tree(self, contents, repo, branch, path_prefix="") -> FileNode:
        """Recursively build directory tree"""
        if not contents:
            return None
        
        # For a single ContentFile, handle appropriately
        if not hasattr(contents, '__iter__'):
            # This is a single file
            node = FileNode(
                name=contents.name,
                path=contents.path,
                type="file",
                size=contents.size
            )
            return node
        
        # For directory listing
        children = []
        for content in contents:
            if content.type == "dir":
                # Get subdirectory contents
                sub_contents = repo.get_contents(content.path, ref=branch)
                child_node = await self._build_tree(sub_contents, repo, branch, content.path)
                children.append(child_node)
            else:
                # File
                node = FileNode(
                    name=content.name,
                    path=content.path,
                    type="file",
                    size=content.size
                )
                children.append(node)
        
        # Get directory name from path or use root
        dir_name = path_prefix.split('/')[-1] if path_prefix else repo.name
        
        return FileNode(
            name=dir_name,
            path=path_prefix,
            type="directory",
            children=children
        )
    
    async def _fetch_all_files(self, repo, branch) -> Dict[str, str]:
        """Fetch content of all files in repository"""
        files_content = {}
        
        def get_contents_recursively(path=""):
            try:
                contents = repo.get_contents(path, ref=branch)
                for content in contents:
                    if content.type == "file":
                        try:
                            # Decode file content
                            file_content = content.decoded_content.decode('utf-8', errors='ignore')
                            files_content[content.path] = file_content
                        except Exception as e:
                            logger.warning(f"Could not decode file {content.path}: {e}")
                            files_content[content.path] = f"Binary or unreadable content: {str(e)}"
                    elif content.type == "dir":
                        get_contents_recursively(content.path)
            except GithubException as e:
                logger.error(f"Error fetching contents for {path}: {e}")
        
        get_contents_recursively()
        return files_content