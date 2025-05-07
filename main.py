# main.py (minimal backend to support COVID-19 map)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.routers import covid_router
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="COVID-19 Dashboard API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Root route to serve the dashboard
@app.get("/")
async def read_root():
    return FileResponse("index.html")

# Include routers
app.include_router(covid_router.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting COVID-19 Dashboard API server...")
    uvicorn.run(app, host="0.0.0.0", port=3000)
