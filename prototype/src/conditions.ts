import type { Condition, WeatherIcon, Scene } from './data.ts';

const codes = {
  0: ['sunny', 'sunny'],
  1: ['sunny', 'sunny'],
  2: ['cloudy', 'cloudy'],
  3: ['cloudy', 'cloudy'],
  45: ['cloudy', 'fog'],
  48: ['cloudy', 'fog'],
  51: ['rainy', 'rainy'],
  53: ['rainy', 'rainy'],
  55: ['rainy', 'rainy'],
  56: ['rainy', 'rainy'],
  57: ['rainy', 'rainy'],
  61: ['rainy', 'rainy'],
  63: ['rainy', 'rainy'],
  65: ['rainy', 'rainy'],
  66: ['rainy', 'rainy'],
  67: ['rainy', 'rainy'],
  71: ['cloudy', 'snow'],
  73: ['cloudy', 'snow'],
  75: ['cloudy', 'snow'],
  77: ['cloudy', 'snow'],
  80: ['rainy', 'rainy'],
  81: ['rainy', 'rainy'],
  82: ['rainy', 'rainy'],
  85: ['cloudy', 'snow'],
  86: ['cloudy', 'snow'],
  95: ['rainy', 'storm'],
  96: ['rainy', 'storm'],
  99: ['rainy', 'storm']
} as const satisfies Record<number, readonly [Scene, WeatherIcon]>;

export type WeatherCode = keyof typeof codes;

export function weatherCondition(code: number | null, isDay: boolean): Condition {
  const known = code !== null && Object.hasOwn(codes, code) ? code as WeatherCode : null;
  const [scene, icon] = known === null ? ['cloudy', 'cloudy'] as const : codes[known];
  return {
    code: known,
    scene: isDay ? scene : 'night',
    icon: !isDay && icon === 'sunny' ? 'night' : icon
  };
}
