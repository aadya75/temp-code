from supabase import create_client, Client
from app.config import settings
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        try:
            if not settings.supabase_url or not settings.supabase_anon_key:
                logger.warning("Supabase credentials not configured. Some features will be disabled.")
                self.supabase = None
            else:
                self.supabase: Client = create_client(
                    settings.supabase_url,
                    settings.supabase_anon_key
                )
                logger.info("Supabase client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self.supabase = None
    
    def save_analysis(self, user_id: str, repo_data: Dict[str, Any], file_tree: Dict[str, Any]) -> Dict[str, Any]:
        """Save analyzed repository to database"""
        if not self.supabase:
            raise Exception("Supabase client not initialized")
        
        try:
            data = {
                "user_id": user_id,
                "repo_url": repo_data.get("html_url"),
                "repo_name": repo_data.get("name"),
                "full_name": repo_data.get("full_name"),
                "description": repo_data.get("description"),
                "stars": repo_data.get("stargazers_count", 0),
                "forks": repo_data.get("forks_count", 0),
                "language": repo_data.get("language"),
                "file_tree": file_tree,
                "analyzed_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("analyzed_repos").insert(data).execute()
            
            if result.data:
                logger.info(f"Saved analysis for repo {repo_data.get('name')}")
                return result.data[0]
            else:
                raise Exception("No data returned from insert")
                
        except Exception as e:
            logger.error(f"Failed to save analysis: {e}")
            raise
    
    def get_analysis_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's analysis history"""
        if not self.supabase:
            return []
        
        try:
            result = self.supabase.table("analyzed_repos")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("analyzed_at", desc=True)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get analysis history: {e}")
            return []
    
    def get_analysis_by_id(self, analysis_id: int) -> Optional[Dict[str, Any]]:
        """Get single analysis by ID"""
        if not self.supabase:
            return None
        
        try:
            result = self.supabase.table("analyzed_repos")\
                .select("*")\
                .eq("id", analysis_id)\
                .single()\
                .execute()
            
            return result.data if result.data else None
            
        except Exception as e:
            logger.error(f"Failed to get analysis by ID: {e}")
            return None
    
    def delete_analysis(self, analysis_id: int) -> bool:
        """Delete analysis by ID"""
        if not self.supabase:
            return False
        
        try:
            result = self.supabase.table("analyzed_repos")\
                .delete()\
                .eq("id", analysis_id)\
                .execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to delete analysis: {e}")
            return False
    
    def save_knowledge_graph(self, repo_id: int, graph_data: Dict[str, Any], 
                              nodes_count: int, edges_count: int) -> Dict[str, Any]:
        """Save knowledge graph to database"""
        if not self.supabase:
            raise Exception("Supabase client not initialized")
        
        try:
            data = {
                "repo_id": repo_id,
                "graph_data": graph_data,
                "nodes_count": nodes_count,
                "edges_count": edges_count
            }
            
            result = self.supabase.table("knowledge_graphs").insert(data).execute()
            
            if result.data:
                logger.info(f"Saved knowledge graph for repo {repo_id}")
                return result.data[0]
            else:
                raise Exception("No data returned from insert")
                
        except Exception as e:
            logger.error(f"Failed to save knowledge graph: {e}")
            raise
    
    def get_knowledge_graph(self, repo_id: int) -> Optional[Dict[str, Any]]:
        """Get latest knowledge graph for repository"""
        if not self.supabase:
            return None
        
        try:
            result = self.supabase.table("knowledge_graphs")\
                .select("*")\
                .eq("repo_id", repo_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Failed to get knowledge graph: {e}")
            return None