import json
import uuid
from pathlib import Path

from model.metadata_model import Metadata, MetadataResponse
from model.product_model import Product, ProductUpdate
from fastapi.responses import JSONResponse

class ProductService:
    def __init__(self):
        self.data_path = Path(__file__).resolve().parent.parent / "data" / "product-dummy.json"

    def _normalize_barcode(self, value):
        if value is None:
            return None

        barcode = str(value).strip()
        return barcode or None

    def _read_products(self):
        with self.data_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        needs_repair = False
        for item in data:
            if item.get("_id"):
                continue

            item["_id"] = uuid.uuid4().hex
            needs_repair = True

        if needs_repair:
            self._write_products(data)

        return data

    def _write_products(self, data):
        with self.data_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

    def _success_response(self, data, message="success"):
        return MetadataResponse(
            data=data,
            metadata=Metadata(
                message=message,
                status=True
            )
        )

    def _error_response(self, message):
        return MetadataResponse(
            data=None,
            metadata=Metadata(
                message=message,
                status=False
            )
        )

    def get_products(self):
        data = self._read_products()
        return self._success_response(data=data)

    def get_product_by_id(self, product_id: str):
        data = self._read_products()
        product = next((item for item in data if item.get("_id") == product_id), None)
        if not product:
            return self._error_response(message="product not found")

        return self._success_response(data=product)

    def get_product_by_barcode(self, barcode: str):
        normalized_barcode = self._normalize_barcode(barcode)
        data = self._read_products()
        product = next((item for item in data if item.get("barcode") == normalized_barcode), None)
        if not product:
            return self._error_response(message="product not found")

        return self._success_response(data=product)

    def add_product(self, param: Product):
        data_dict = param.model_dump(by_alias=True)
        if data_dict.get("_id") is None:
            data_dict["_id"] = uuid.uuid4().hex
        data_dict["barcode"] = self._normalize_barcode(data_dict.get("barcode"))

        data = self._read_products()
        if any(item.get("_id") == data_dict["_id"] for item in data):
            return self._error_response(message="product id already exists")
        if data_dict.get("barcode") and any(item.get("barcode") == data_dict["barcode"] for item in data):
            return self._error_response(message="product barcode already exists")

        data.append(data_dict)
        self._write_products(data)

        return self._success_response(data=data_dict)

    def update_product(self, product_id: str, param: ProductUpdate):
        updated_fields = param.model_dump(exclude_unset=True)
        if not updated_fields:
            return self._error_response(message="no fields provided for update")
        if "barcode" in updated_fields:
            updated_fields["barcode"] = self._normalize_barcode(updated_fields.get("barcode"))

        data = self._read_products()
        for index, product in enumerate(data):
            if product.get("_id") != product_id:
                continue
            if updated_fields.get("barcode") and any(
                item.get("_id") != product_id and item.get("barcode") == updated_fields["barcode"]
                for item in data
            ):
                return self._error_response(message="product barcode already exists")

            data[index] = {
                **product,
                **updated_fields,
                "_id": product_id
            }
            self._write_products(data)
            return self._success_response(data=data[index], message="updated")

        return self._error_response(message="product not found")

    def delete_product(self, product_id: str):
        data = self._read_products()
        for index, product in enumerate(data):
            if product.get("_id") != product_id:
                continue

            deleted_product = data.pop(index)
            self._write_products(data)
            return self._success_response(data=deleted_product, message="deleted")

        return self._error_response(message="product not found")
