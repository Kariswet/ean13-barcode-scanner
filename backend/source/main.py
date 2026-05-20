from controller import product_controller
from fastapi import FastAPI
import uvicorn

app = FastAPI()
app.include_router(product_controller.ProductController().router)

if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=1200)
