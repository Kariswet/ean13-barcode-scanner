from service.product_service import ProductService
from model.product_model import Product
from fastapi import APIRouter

class ProductController:
    def __init__(self):
        self.service = ProductService()
        self.router = APIRouter(
            prefix="/api/v1/product",
            tags=["product"]
        )
        self.router.post("/add")(self.add_product)
    
    def add_product(self, param: Product):
        pc = self.service.add_product(param=param)
        if not pc:
            return
        
        return pc