from pydantic import BaseModel, Field
from typing import Optional, Any
import time

class Metadata(BaseModel):
    status: bool
    message: str
    timeExecution: str = Field(default_factory=lambda: str(time.time() * 1000))
    # pagination: Pagination = Field(default_factory=Pagination)

class MetadataResponse(BaseModel):
    metadata : Metadata
    data: Optional[Any] = None