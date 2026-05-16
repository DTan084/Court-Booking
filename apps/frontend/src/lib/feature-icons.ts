import { Camera, Car, Lightbulb, Shirt, Wifi, Tent, type LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  CHANGING: Shirt,
  CHANGING_ROOM: Shirt,
  LOCKER_ROOM: Shirt,
  LIGHT: Lightbulb,
  LIGHTING: Lightbulb,
  NIGHT_LIGHTS: Lightbulb,
  PARKING: Car,
  ROOF: Tent,
  ROOF_COVER: Tent,
  CAMERA: Camera,
  SECURITY_CAMERA: Camera,
  WIFI: Wifi,
  WI_FI: Wifi,
};

function normalize(value?: string | null): string {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function resolveFeatureIcon(input?: {
  icon?: string | null;
  name?: string | null;
}): LucideIcon | undefined {
  const iconKey = normalize(input?.icon);
  if (iconKey && ICON_MAP[iconKey]) return ICON_MAP[iconKey];

  const nameKey = normalize(input?.name);
  if (nameKey && ICON_MAP[nameKey]) return ICON_MAP[nameKey];

  if (nameKey.includes('WIFI') || nameKey.includes('WI_FI')) return Wifi;
  if (nameKey.includes('PARKING')) return Car;
  if (nameKey.includes('LIGHT')) return Lightbulb;
  if (nameKey.includes('ROOF')) return Tent;
  if (nameKey.includes('CAMERA')) return Camera;
  if (nameKey.includes('CHANGING') || nameKey.includes('LOCKER')) return Shirt;
  return undefined;
}
