import { ColorScheme } from '../types';

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'zune-magenta',
    name: 'Zune Twist Magenta',
    origin: 'Zune HD',
    accent: '#E6007E',
    accentHover: '#C7006D',
    accentFg: '#FFFFFF',
    secondaryTile: '#9E0059',
  },
  {
    id: 'zune-orange',
    name: 'Zune Sunset Orange',
    origin: 'Zune 30GB',
    accent: '#E85D04',
    accentHover: '#C84E03',
    accentFg: '#FFFFFF',
    secondaryTile: '#9D3C02',
  },
  {
    id: 'zune-doubleshot',
    name: 'Double-Shot Espresso',
    origin: 'Zune 30GB Brown',
    accent: '#689F00',
    accentHover: '#558200',
    accentFg: '#FFFFFF',
    secondaryTile: '#4A2C1D',
    darkBgTint: '#110D0B',
    darkSurfaceTint: '#1B1512',
  },
  {
    id: 'metro-cobalt',
    name: 'Metro Cobalt',
    origin: 'Windows 8',
    accent: '#0078D7',
    accentHover: '#0062B1',
    accentFg: '#FFFFFF',
    secondaryTile: '#004E8C',
  },
  {
    id: 'metro-teal',
    name: 'Metro Teal',
    origin: 'Windows 8',
    accent: '#008280',
    accentHover: '#006B69',
    accentFg: '#FFFFFF',
    secondaryTile: '#005958',
  },
  {
    id: 'metro-crimson',
    name: 'Zune Red',
    origin: 'Zune Originals',
    accent: '#C81D25',
    accentHover: '#A8171E',
    accentFg: '#FFFFFF',
    secondaryTile: '#801117',
  },
  {
    id: 'metro-emerald',
    name: 'Metro Emerald',
    origin: 'Windows 8',
    accent: '#107C10',
    accentHover: '#0C620C',
    accentFg: '#FFFFFF',
    secondaryTile: '#094D09',
  },
  {
    id: 'metro-gold',
    name: 'Studio Amber',
    origin: 'Zune HD',
    accent: '#B45309',
    accentHover: '#92400E',
    accentFg: '#FFFFFF',
    secondaryTile: '#78350F',
  },
];

export function getColorScheme(id: string): ColorScheme {
  return COLOR_SCHEMES.find((scheme) => scheme.id === id) ?? COLOR_SCHEMES[0];
}
