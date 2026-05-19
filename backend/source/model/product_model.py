from pydantic import BaseModel
from typing import Optional

class Product(BaseModel):
    _id: Optional[str] 
    name: Optional[str]
    brand: Optional[str]
    description: Optional[str]
    price: int = 0
    category : Optional[str]