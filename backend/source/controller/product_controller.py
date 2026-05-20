from fastapi import APIRouter

from model.product_model import Product, ProductUpdate
from service.product_service import ProductService

class ProductController:
    def __init__(self):
        self.service = ProductService()
        self.router = APIRouter(
            prefix="/api/v1/product",
            tags=["product"]
        )
        self.router.get("")(self.get_products)
        self.router.get("/barcode/{barcode}")(self.get_product_by_barcode)
        self.router.get("/{product_id}")(self.get_product_by_id)
        self.router.post("")(self.add_product)
        self.router.put("/{product_id}")(self.update_product)
        self.router.patch("/{product_id}")(self.update_product)
        self.router.delete("/{product_id}")(self.delete_product)

    def get_products(self):
        return self.service.get_products()

    def get_product_by_id(self, product_id: str):
        return self.service.get_product_by_id(product_id=product_id)

    def get_product_by_barcode(self, barcode: str):
        return self.service.get_product_by_barcode(barcode=barcode)

    def add_product(self, param: Product):
        return self.service.add_product(param=param)

    def update_product(self, product_id: str, param: ProductUpdate):
        return self.service.update_product(product_id=product_id, param=param)

    def delete_product(self, product_id: str):
        return self.service.delete_product(product_id=product_id)
