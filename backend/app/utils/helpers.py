import re
from typing import Tuple

def validate_github_url(url: str) -> Tuple[str, str]:
    """Validate and parse GitHub URL"""
    pattern = r'github\.com/([^/]+)/([^/]+)'
    match = re.search(pattern, url)
    
    if not match:
        raise ValueError(f"Invalid GitHub URL: {url}")
    
    owner = match.group(1)
    repo = match.group(2).rstrip('/').replace('.git', '')
    
    return owner, repo

def format_size(size: int) -> str:
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"