import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

// Utility: read env values safely
const WEATHER_API_BASE = process.env.REACT_APP_WEATHER_API_BASE;
const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const GEOCODING_API_BASE = process.env.REACT_APP_GEOCODING_API_BASE;

// Basic helpers for formatting
const kelvinToC = (k) => Math.round(k - 273.15);
const formatDate = (ts, locale = navigator.language) =>
  new Date(ts * 1000).toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const formatDay = (ts, locale = navigator.language) =>
  new Date(ts * 1000).toLocaleDateString(locale, { weekday: 'short' });

/**
 * API client to fetch weather and city data.
 * Uses environment variables for configuration.
 */
const api = {
  // PUBLIC_INTERFACE
  async searchCities(query, signal) {
    /** Search city names using geocoding API (OpenWeather compatible). */
    if (!query || query.length < 2) return [];
    if (!GEOCODING_API_BASE || !WEATHER_API_KEY) {
      console.warn('Geocoding env vars missing');
      return [];
    }
    const url = `${GEOCODING_API_BASE}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Failed to fetch city suggestions');
    return res.json();
  },

  // PUBLIC_INTERFACE
  async getCurrentWeatherByCoords(lat, lon, signal) {
    /** Get current weather by coordinates. */
    if (!WEATHER_API_BASE || !WEATHER_API_KEY) throw new Error('Weather API not configured');
    const url = `${WEATHER_API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Failed to fetch current weather');
    return res.json();
  },

  // PUBLIC_INTERFACE
  async getForecastByCoords(lat, lon, signal) {
    /** Get 5-day forecast (3-hour intervals) by coordinates. */
    if (!WEATHER_API_BASE || !WEATHER_API_KEY) throw new Error('Weather API not configured');
    const url = `${WEATHER_API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Failed to fetch forecast');
    return res.json();
  }
};

/**
 * SearchBar with autocomplete.
 */
function SearchBar({ onSelectCity }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aborter, setAborter] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (aborter) aborter.abort();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    setAborter(controller);
    setLoading(true);
    setError('');
    api.searchCities(query, controller.signal)
      .then((data) => {
        setSuggestions(data || []);
        setOpen(true);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError('Failed to load suggestions');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  const handleSelect = (city) => {
    setQuery(`${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`);
    setOpen(false);
    onSelectCity(city);
  };

  return (
    <div className="searchbar">
      <input
        className="search-input"
        type="text"
        placeholder="Search city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        aria-label="Search city"
      />
      {loading && <div className="loader" aria-label="Loading" />}
      {open && (
        <ul className="suggestions" role="listbox">
          {error ? (
            <li className="suggestion error">{error}</li>
          ) : suggestions.length ? (
            suggestions.map((s, idx) => (
              <li
                key={`${s.lat}-${s.lon}-${idx}`}
                className="suggestion"
                role="option"
                onMouseDown={() => handleSelect(s)}
              >
                <span className="suggestion-name">{s.name}</span>
                <span className="suggestion-meta">
                  {[s.state, s.country].filter(Boolean).join(', ')}
                </span>
              </li>
            ))
          ) : (
            <li className="suggestion muted">No results</li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Current weather card.
 */
function CurrentWeather({ data }) {
  if (!data) return null;
  const temp = kelvinToC(data.main.temp);
  const feels = kelvinToC(data.main.feels_like);
  const wind = Math.round(data.wind.speed);
  const desc = data.weather?.[0]?.description ?? '';
  const icon = data.weather?.[0]?.icon;

  return (
    <div className="card current">
      <div className="card-header">
        <h2 className="card-title">
          {data.name}
          <span className="country"> {data.sys?.country}</span>
        </h2>
        <div className="badge accent">Now</div>
      </div>
      <div className="current-content">
        <div className="temp">
          <span className="temp-value">{temp}°C</span>
          <span className="temp-desc">{desc}</span>
          <div className="temp-sub">Feels like {feels}°C</div>
        </div>
        <div className="meta">
          {icon && (
            <img
              src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
              alt={desc}
              className="weather-icon"
            />
          )}
          <div className="meta-row">
            <span>Humidity</span>
            <strong>{data.main.humidity}%</strong>
          </div>
          <div className="meta-row">
            <span>Wind</span>
            <strong>{wind} m/s</strong>
          </div>
          <div className="meta-row">
            <span>Pressure</span>
            <strong>{data.main.pressure} hPa</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Forecast list grouped by day (first item for 12:00 if present).
 */
function Forecast({ data }) {
  if (!data?.list?.length) return null;
  // Group by date (YYYY-MM-DD)
  const groups = data.list.reduce((acc, item) => {
    const d = new Date(item.dt * 1000);
    const key = d.toISOString().slice(0, 10);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  const days = Object.keys(groups)
    .slice(0, 5)
    .map((k) => {
      // Prefer midday forecast
      const dayItems = groups[k];
      let pick = dayItems.find(i => new Date(i.dt * 1000).getHours() === 12) || dayItems[0];
      return pick;
    });

  return (
    <div className="card forecast">
      <div className="card-header">
        <h3 className="card-title">5-Day Forecast</h3>
        <div className="badge primary">Forecast</div>
      </div>
      <div className="forecast-grid">
        {days.map((item, idx) => {
          const t = kelvinToC(item.main.temp);
          const icon = item.weather?.[0]?.icon;
          const desc = item.weather?.[0]?.description ?? '';
          return (
            <div className="forecast-item" key={idx}>
              <div className="forecast-day">{formatDay(item.dt)}</div>
              {icon && (
                <img
                  src={`https://openweathermap.org/img/wn/${icon}.png`}
                  alt={desc}
                  className="forecast-icon"
                />
              )}
              <div className="forecast-temp">{t}°C</div>
              <div className="forecast-desc">{desc}</div>
              <div className="forecast-time">{formatDate(item.dt)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Weather App main component.
   * - Header with search + theme switch
   * - Main: current and forecast
   * - Footer credits
   */
  const [theme, setTheme] = useState('light');
  const [selectedCity, setSelectedCity] = useState(null);
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // Apply theme and auto mode on load
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = prefersDark ? 'dark' : 'light';
    setTheme(initial);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch weather when city changes
  useEffect(() => {
    if (!selectedCity) return;
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    Promise.all([
      api.getCurrentWeatherByCoords(selectedCity.lat, selectedCity.lon, controller.signal),
      api.getForecastByCoords(selectedCity.lat, selectedCity.lon, controller.signal),
    ])
      .then(([c, f]) => {
        setCurrent(c);
        setForecast(f);
        setStatus('success');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message || 'Failed to load weather data');
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [selectedCity]);

  // Demo: default to a city once if none selected (e.g., London)
  useEffect(() => {
    // Avoid auto-select if env missing
    if (!selectedCity && GEOCODING_API_BASE && WEATHER_API_KEY) {
      api.searchCities('London').then((res) => {
        if (res && res[0]) setSelectedCity(res[0]);
      }).catch(() => {});
    }
  }, [selectedCity]);

  const footerYear = useMemo(() => new Date().getFullYear(), []);

  const apiConfigured = Boolean(WEATHER_API_BASE && WEATHER_API_KEY && GEOCODING_API_BASE);

  return (
    <div className="App">
      <header className="wf-header">
        <div className="brand">
          <div className="logo">🌤️</div>
          <div className="brand-text">
            <h1 className="title">Weather Forecast</h1>
            <p className="subtitle">Find current weather and 5-day forecast</p>
          </div>
        </div>

        <div className="controls">
          <SearchBar onSelectCity={setSelectedCity} />
          <button
            className="btn theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {!apiConfigured && (
        <div className="container">
          <div className="alert">
            Missing API configuration. Please set REACT_APP_WEATHER_API_BASE, REACT_APP_GEOCODING_API_BASE and REACT_APP_WEATHER_API_KEY in your .env file.
          </div>
        </div>
      )}

      <main className="wf-main container">
        {status === 'idle' && (
          <div className="placeholder">
            <p>Search for a city to view weather details.</p>
          </div>
        )}
        {status === 'loading' && (
          <div className="loading-block">
            <div className="loader large" />
            <p>Loading weather data...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="alert error">
            {error}
          </div>
        )}
        {status === 'success' && (
          <div className="grid">
            <CurrentWeather data={current} />
            <Forecast data={forecast} />
          </div>
        )}
      </main>

      <footer className="wf-footer">
        <div className="container footer-inner">
          <span>© {footerYear} Weather Forecast</span>
          <span className="credits">
            Data by <a href="https://openweathermap.org/api" target="_blank" rel="noreferrer">OpenWeather</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
