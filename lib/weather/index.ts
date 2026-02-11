/**
 * Weather Module
 * February 10, 2026
 *
 * CREP weather data clients and utilities
 */

export {
  OpenMeteoClient,
  getOpenMeteoClient,
  VARIABLE_MAPPING,
  VARIABLE_UNITS,
  WEATHER_CODES,
  type OpenMeteoCurrentWeather,
  type OpenMeteoHourlyForecast,
  type OpenMeteoForecastResponse,
  type WeatherGridPoint,
  type WeatherGridData,
  type CurrentWeatherData,
  type HourlyForecastData,
} from "./open-meteo-client";
