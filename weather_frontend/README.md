# Weather Frontend (React)

Modern, responsive weather application with city autocomplete, current weather, and 5‑day forecast.

## Features
- Search weather by city name with autocomplete
- Display current weather information
- Display 5‑day forecast (daily highlights)
- Responsive layout (header/search, main content, footer)
- Modern design using colors:
  - Primary: `#1e90ff`
  - Secondary: `#f5f6fa`
  - Accent: `#ffb347`
- Theme: auto-detects dark/light, toggle button provided
- Uses environment variables for API configuration
- Consumes REST APIs (OpenWeather compatible)

## Environment Variables
Create a `.env` file in the project root based on `.env.example`:
```
cp .env.example .env
```
Then set:
- `REACT_APP_WEATHER_API_BASE` (e.g., https://api.openweathermap.org/data/2.5)
- `REACT_APP_GEOCODING_API_BASE` (e.g., https://api.openweathermap.org/geo/1.0)
- `REACT_APP_WEATHER_API_KEY` (your OpenWeather API key)

Note: React only exposes env vars prefixed with `REACT_APP_`.

## Scripts
- `npm start` – Run dev server
- `npm run build` – Production build
- `npm test` – Tests

## Architecture
- `src/App.js` – Main UI: Header with SearchBar, CurrentWeather, Forecast, Footer
- `src/App.css` – Theme, layout, components styling

## Data Sources
- Current weather: `GET /weather?lat={lat}&lon={lon}&appid={KEY}`
- 5‑day forecast: `GET /forecast?lat={lat}&lon={lon}&appid={KEY}`
- Geocoding (autocomplete): `GET /direct?q={q}&limit=5&appid={KEY}`

## Credits
Weather data by OpenWeather.
