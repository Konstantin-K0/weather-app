import type { WeatherCode } from './conditions.ts';

export const scenes = ['sunny', 'cloudy', 'rainy', 'night'] as const;
export type Scene = typeof scenes[number];
export type WeatherIcon = Scene | 'fog' | 'snow' | 'storm';
export interface Condition {
  code: WeatherCode | null;
  scene: Scene;
  icon: WeatherIcon;
}
export interface Hour {
  timestamp: number;
  date: string;
  localMinute: number;
  temperature: number | null;
  precipitation: number | null;
  condition: Condition;
}
export interface Day {
  key: string;
  relativeDay: number;
  condition: Condition;
  dailyCondition: Condition;
  readingTimestamp: number | null;
  temperature: number | null;
  feelsLike: number | null;
  low: number | null;
  high: number | null;
  wind: number | null;
  direction: number | null;
  humidity: number | null;
  uv: number | null;
  sunrise: number | null;
  sunset: number | null;
  hours: Hour[];
}
export interface Forecast {
  timezone: string;
  days: Day[];
  incomplete: boolean;
}
export type TemperatureUnit = 'C' | 'F';
export function temperatureValue(value: number, unit: TemperatureUnit): number {
  const rounded = Math.round(unit === 'F' ? value * 9 / 5 + 32 : value);
  return rounded === 0 ? 0 : rounded;
}
