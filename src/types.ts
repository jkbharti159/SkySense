export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  uvi: number;
  visibility: number;
  clouds: number;
  pressure: number;
  conditionText: string;
  conditionCode: number;
  aqi: number;
  sunrise: string;
  sunset: string;
  timestamp: string;
  precipitation?: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  feelsLike: number;
  rainProb: number;
  windSpeed: number;
  conditionText: string;
  conditionCode: number;
  uvi: number;
  humidity: number;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  rainProb: number;
  conditionText: string;
  conditionCode: number;
  humidity: number;
  windSpeed: number;
  uvi: number;
  sunrise: string;
  sunset: string;
  moonPhase: number; // 0 to 1
  moonIllumination: number; // 0 to 100
  summary: string;
}

export interface AirQuality {
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
  label: 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very Poor';
  color: string;
  description: string;
}

export interface WeatherScores {
  outdoor: number;
  travel: number;
  photography: number;
  exercise: number;
  commute: number;
  outdoorText: string;
  travelText: string;
  photographyText: string;
  exerciseText: string;
  commuteText: string;
}

export interface DayPlan {
  morning: { temp: number; condition: string; rainProb: number; wind: number; recommendation: string };
  afternoon: { temp: number; condition: string; rainProb: number; wind: number; recommendation: string };
  evening: { temp: number; condition: string; rainProb: number; wind: number; recommendation: string };
  night: { temp: number; condition: string; rainProb: number; wind: number; recommendation: string };
}

export interface LocationData {
  name: string;
  country: string;
  admin1?: string; // state/region
  lat: number;
  lon: number;
}

export interface WeatherAlert {
  type: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}

export interface WeatherIntelligence {
  generalSummary: string;
  story: {
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
  };
  scores: WeatherScores;
  plan: DayPlan;
  alerts: WeatherAlert[];
  photographyDetails: {
    goldenHourMorning: string;
    goldenHourEvening: string;
    blueHourMorning: string;
    blueHourEvening: string;
    rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
    tips: string[];
  };
  isFallback?: boolean;
  fallbackReason?: 'no_api_key' | 'quota_exceeded' | 'offline';
}

export interface FullWeatherData {
  location: LocationData;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  airQuality: AirQuality;
  intelligence: WeatherIntelligence;
  cachedAt: string;
}

export interface UserPreferences {
  tempUnit: 'C' | 'F';
  windUnit: 'kmh' | 'mph';
  graphicsMode: 'high' | 'perf';
  bgImage?: string;
  bgBlur?: number;
  bgDim?: number;
}

export interface CentralLocationState {
  city: string;
  district?: string;
  region: string;
  country: string;
  countryCode?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: 'saved' | 'gps' | 'ip' | 'search' | 'fallback' | 'postal_code';
  accuracy: 'approximate' | 'precise' | 'postal_area';
  isUserSelected: boolean;
}
