import functools
import asyncio
from contextvars import ContextVar
from datetime import datetime
from typing import Optional, Callable, List, Dict, Any
from contextlib import asynccontextmanager

from app.models.trace import Trace, TraceSpan

# Context variables to maintain trace across async calls
current_trace: ContextVar[Optional[Trace]] = ContextVar('current_trace', default=None)
current_span: ContextVar[Optional[TraceSpan]] = ContextVar('current_span', default=None)

class TraceManager:
    """Manages trace collection and propagation across your GitHub service"""
    
    def __init__(self):
        self.traces_storage: List[Trace] = []  # In-memory storage (last 100 traces)
    
    def start_trace(self, endpoint: str = None, method: str = None, user_id: str = None) -> Trace:
        """Start a new trace for a request"""
        trace = Trace(
            endpoint=endpoint,
            method=method,
            user_id=user_id
        )
        current_trace.set(trace)
        return trace
    
    def end_trace(self) -> Optional[Trace]:
        """End current trace and store it"""
        trace = current_trace.get()
        if trace:
            trace.complete_trace()
            self.traces_storage.append(trace)
            # Keep only last 100 traces
            if len(self.traces_storage) > 100:
                self.traces_storage.pop(0)
            current_trace.set(None)
            current_span.set(None)
            return trace
        return None
    
    @asynccontextmanager
    async def span(self, operation_name: str, service_name: str, tags: List[str] = None):
        """Context manager for tracing a block of code"""
        trace = current_trace.get()
        parent_span = current_span.get()
        
        if not trace:
            trace = self.start_trace()
        
        span = TraceSpan(
            trace_id=trace.trace_id,
            operation_name=operation_name,
            service_name=service_name,
            start_time=datetime.now(),
            parent_span_id=parent_span.span_id if parent_span else None,
            tags=tags or []
        )
        
        trace.add_span(span)
        current_span.set(span)
        
        try:
            yield span
            span.status = "success"
            span.end_time = datetime.now()
            if span.start_time:
                span.duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
        except Exception as e:
            span.status = "error"
            span.error_message = str(e)
            span.end_time = datetime.now()
            if span.start_time:
                span.duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
            raise
        finally:
            current_span.set(parent_span)
    
    def trace_function(self, service_name: str, tags: List[str] = None):
        """Decorator for automatically tracing functions"""
        def decorator(func: Callable):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                async with self.span(
                    operation_name=f"{func.__module__}.{func.__name__}",
                    service_name=service_name,
                    tags=tags
                ):
                    return await func(*args, **kwargs)
            return async_wrapper
        return decorator
    
    def get_recent_traces(self, limit: int = 50) -> List[Trace]:
        """Get recent traces"""
        return self.traces_storage[-limit:]
    
    def get_trace(self, trace_id: str) -> Optional[Trace]:
        """Get a specific trace by ID"""
        for trace in self.traces_storage:
            if trace.trace_id == trace_id:
                return trace
        return None
    
    def get_call_graph(self) -> Dict[str, Any]:
        """Build function call graph from traces (for visualization)"""
        nodes = {}
        edges = {}
        
        for trace in self.traces_storage:
            for span in trace.spans:
                # Add node
                node_key = f"{span.service_name}:{span.operation_name}"
                if node_key not in nodes:
                    nodes[node_key] = {
                        "id": node_key,
                        "name": span.operation_name.split('.')[-1],
                        "service": span.service_name,
                        "type": "function",
                        "call_count": 1
                    }
                else:
                    nodes[node_key]["call_count"] += 1
                
                # Add edge if has parent
                if span.parent_span_id:
                    parent_span = next((s for s in trace.spans if s.span_id == span.parent_span_id), None)
                    if parent_span:
                        parent_key = f"{parent_span.service_name}:{parent_span.operation_name}"
                        edge_key = f"{parent_key}->{node_key}"
                        
                        if edge_key not in edges:
                            edges[edge_key] = {
                                "from": parent_key,
                                "to": node_key,
                                "call_count": 0,
                                "total_duration": 0
                            }
                        
                        edges[edge_key]["call_count"] += 1
                        if span.duration_ms:
                            edges[edge_key]["total_duration"] += span.duration_ms
        
        # Calculate averages
        for edge in edges.values():
            if edge["call_count"] > 0:
                edge["avg_duration_ms"] = edge["total_duration"] / edge["call_count"]
        
        return {
            "nodes": list(nodes.values()),
            "edges": list(edges.values())
        }

# Global instance
trace_manager = TraceManager()