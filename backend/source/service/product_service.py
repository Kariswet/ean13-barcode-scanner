from model.product_model import Product
from model.metadata_model import Metadata, MetadataResponse
import json, uuid

class ProductService:
    def __init__(self):
        pass

    def add_product(self, param: Product):
        data_dict = param.model_dump()
        if data_dict.get('_id') == None:
            data_dict['_id'] = str(uuid.uuid4()).replace("-","")

        with open('data/product-dummy.json', 'r') as file:
            data = json.load(file)
        
        data.append(data_dict)

        with open('data/product-dummy.json', 'w') as file:
            json.dump(data,file, indent=2)
        
        return MetadataResponse(
            data=data_dict,
            metadata=Metadata(
                message="success",
                status=True
            )
        )