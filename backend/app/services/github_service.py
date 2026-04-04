from github import Github, GithubException
from typing import Dict, Any, List, Optional
import base64
import logging
import os
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class FileNode(BaseModel):
    name: str          # Name of file/folder (e.g., "src", "index.js")
    path: str          # Full path (e.g., "frontend/src/index.js")
    type: str          # Either 'file' or 'directory'
    size: Optional[int] = None  # File size in bytes (None for directories)
    children: Optional[List['FileNode']] = None  # Nested items (only for directories)

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        # Add your token to .env!
        github_token = os.getenv("GITHUB_TOKEN", None)
        self.g = Github(github_token, timeout=30) if github_token else Github(timeout=30)
    
    async def get_repo_contents(self, repo_url: str) -> Dict[str, Any]:
        """Fetch repository using Git Trees API (3-4 calls total)"""
        try:
            # Parse URL
            owner, repo_name = self.parse_github_url(repo_url)
            
            # API Call #1: Get repository
            repo = self.g.get_repo(f"{owner}/{repo_name}")
            
            # API Call #2: Get default branch reference
            default_branch = repo.default_branch
            branch_ref = repo.get_git_ref(f"heads/{default_branch}")
            
            # API Call #3: Get the entire tree recursively (THIS IS THE MAGIC!)
            # This returns ALL files and directories in ONE API call
            tree = repo.get_git_tree(branch_ref.object.sha, recursive=True)
            
            # Build directory tree and collect file contents
            file_tree = {}
            files_content = {}
            
            # Process all items from the single tree response
            for item in tree.tree:
                if item.type == "blob":  # This is a file
                    # Store file metadata
                    path_parts = item.path.split('/')
                    current_level = file_tree
                    
                    # Build nested dictionary structure
                    for i, part in enumerate(path_parts):
                        if i == len(path_parts) - 1:
                            current_level[part] = {
                                "type": "file",
                                "size": item.size,
                                "path": item.path
                            }
                        else:
                            if part not in current_level:
                                current_level[part] = {"type": "directory", "children": {}}
                            current_level = current_level[part]["children"]
                    
                    # Optionally fetch file content (if needed)
                    # This is an EXTRA call per file - only do if you really need content
                    if item.size < 1000000:  # Only fetch files < 1MB
                        try:
                            file_content = repo.get_contents(item.path, ref=default_branch)
                            files_content[item.path] = base64.b64decode(file_content.content).decode('utf-8', errors='ignore')
                        except:
                            files_content[item.path] = "Unable to decode"
                    else:
                        files_content[item.path] = f"File too large ({item.size} bytes)"
            
            # Convert nested dict to FileNode structure
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
    
    def _dict_to_filenode(self, data: Dict, name: str) -> FileNode:
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
            else:
                # Directory
                child_node = self._dict_to_filenode(
                    value.get("children", {}), 
                    key
                )
                children.append(child_node)
        
        return FileNode(
            name=name,
            path="",
            type="directory",
            children=children
        )
    
    def parse_github_url(self, url: str) -> tuple[str, str]:
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