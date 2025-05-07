from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from ..services.data_service import DataService
import logging

router = APIRouter()
data_service = DataService()
logger = logging.getLogger(__name__)

@router.get("/test")
async def test_endpoint() -> Dict:
    """Test endpoint to verify backend functionality"""
    try:
        dates = data_service.get_dates()
        return {
            "status": "success",
            "message": "Backend is working",
            "data_loaded": True,
            "date_range": {
                "start": dates[0],
                "end": dates[-1]
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "data_loaded": False
        }

@router.get("/timeseries")
async def get_timeseries() -> Dict:
    """Get available dates for the timeline"""
    try:
        dates = data_service.get_dates()
        return {"dates": dates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/global-stats")
async def get_global_stats(date: Optional[str] = None):
    """Get global COVID-19 statistics"""
    try:
        stats = data_service.get_global_stats(date)
        return stats
    except Exception as e:
        logger.error(f"Error getting global stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/country/{country_name}")
async def get_country_data(country_name: str) -> Dict:
    """Get COVID-19 data for a specific country"""
    try:
        return data_service.get_country_data(country_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-countries")
async def get_top_countries() -> Dict:
    """Get top countries by cases and deaths"""
    try:
        return data_service.get_top_countries()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/map-data/{date}")
async def get_map_data(date: str) -> Dict:
    """Get map data for a specific date"""
    try:
        return data_service.get_map_data(date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 