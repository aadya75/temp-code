from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import uuid4
from pydantic import BaseModel, Field

class TraceSpan(BaseModel):
    """Single operation span in execution trace"""
    span_id: str = Field(default_factory=lambda: str(uuid4()))
    parent_span_id: Optional[str] = None
    trace_id: str
    operation_name: str
    service_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    status: str = "running"  # running, success, error
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

class Trace(BaseModel):
    """Complete execution trace"""
    trace_id: str = Field(default_factory=lambda: str(uuid4()))
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    spans: List[TraceSpan] = Field(default_factory=list)
    total_duration_ms: Optional[float] = None
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    
    def add_span(self, span: TraceSpan):
        self.spans.append(span)
    
    def complete_trace(self):
        self.end_time = datetime.now()
        if self.start_time and self.end_time:
            self.total_duration_ms = (self.end_time - self.start_time).total_seconds() * 1000