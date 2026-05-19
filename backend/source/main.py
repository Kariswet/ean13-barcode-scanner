from controller import product_controller
from fastapi import FastAPI
import uvicorn

if __name__ == "__main__":
    app = FastAPI()

    app.include_router(product_controller.ProductController().router)

    uvicorn.run(app=app, host="0.0.0.0", port=1200)