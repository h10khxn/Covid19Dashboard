# COVID-19 Dashboard

A real-time COVID-19 dashboard that displays global statistics, country-specific data, and interactive visualizations.

## Features

- Global COVID-19 statistics
- Interactive world map showing case distribution
- Country-specific data and trends
- Top countries by cases and deaths
- Timeline slider for historical data
- Responsive design

## Project Structure

```
covid_dashboard_project/
├── backend/
│   ├── routers/
│   │   ├── __init__.py
│   │   └── covid_router.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── data_service.py
│   └── __init__.py
├── main.py
├── index.html
├── requirements.txt
└── README.md
```

## Setup Instructions

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the backend server:
   ```bash
   python main.py
   ```
   The backend will be available at http://localhost:8000

3. Start the frontend server:
   ```bash
   python -m http.server 8080
   ```
   The dashboard will be available at http://localhost:8080

## API Endpoints

- `GET /api/test` - Test backend connection
- `GET /api/timeseries` - Get available dates for timeline
- `GET /api/global-stats` - Get global COVID-19 statistics
- `GET /api/country/{country_name}` - Get country-specific data
- `GET /api/top-countries` - Get top countries by cases and deaths
- `GET /api/map-data/{date}` - Get map data for a specific date

## Data Source

The dashboard uses data from the Our World in Data COVID-19 dataset, which is stored in the `owid-covid-data.csv` file.

## Technologies Used

- Backend:
  - FastAPI
  - Pandas
  - NumPy

- Frontend:
  - HTML5
  - CSS3
  - JavaScript
  - Chart.js
  - D3.js
  - Bootstrap 5 