export const NIGHT_RAMP = ['#04102F', '#071D54', '#092E8E', '#1552B7'] as const;

export type NightStop = (typeof NIGHT_RAMP)[number];

export const NIGHT_VOID: NightStop = NIGHT_RAMP[0];
export const NIGHT_DEEP: NightStop = NIGHT_RAMP[1];
export const NIGHT_PRIMARY: NightStop = NIGHT_RAMP[2];
export const NIGHT_BRIGHT: NightStop = NIGHT_RAMP[3];

export type SkyGradient = readonly [NightStop, NightStop, NightStop];

export const SKY_GRADIENT_WORLD: SkyGradient = [NIGHT_BRIGHT, NIGHT_PRIMARY, NIGHT_DEEP];

export const SETTINGS_SKY: readonly [NightStop, NightStop] = [NIGHT_DEEP, NIGHT_VOID];

const VEIL_SOLID_UNTIL = 0.55;

export interface SkyColour {
  red: number;
  green: number;
  blue: number;
}

export interface SkyVeil {
  colours: [string, string, string];
  locations: [number, number, number];
}

function channels(hex: string): SkyColour {
  return {
    red: parseInt(hex.slice(1, 3), 16),
    green: parseInt(hex.slice(3, 5), 16),
    blue: parseInt(hex.slice(5, 7), 16),
  };
}

export function skyWorldColourAt(fraction: number): SkyColour {
  const along = Math.min(Math.max(fraction, 0), 1) * (SKY_GRADIENT_WORLD.length - 1);
  const index = Math.min(Math.floor(along), SKY_GRADIENT_WORLD.length - 2);
  const from = channels(SKY_GRADIENT_WORLD[index]);
  const to = channels(SKY_GRADIENT_WORLD[index + 1]);
  const blend = along - index;

  return {
    red: Math.round(from.red + (to.red - from.red) * blend),
    green: Math.round(from.green + (to.green - from.green) * blend),
    blue: Math.round(from.blue + (to.blue - from.blue) * blend),
  };
}

export function headerSkyVeil(headerHeight: number, screenHeight: number): SkyVeil {
  const share = screenHeight > 0 ? headerHeight / screenHeight : 0;
  const paint = (at: number, alpha: number) => {
    const colour = skyWorldColourAt(share * at);

    return `rgba(${colour.red}, ${colour.green}, ${colour.blue}, ${alpha})`;
  };

  return {
    colours: [paint(0, 1), paint(VEIL_SOLID_UNTIL, 1), paint(1, 0)],
    locations: [0, VEIL_SOLID_UNTIL, 1],
  };
}

export function skyBand(solidTo: number, clearBy: number, screenHeight: number): SkyVeil {
  const paint = (y: number, alpha: number) => {
    const colour = skyWorldColourAt(screenHeight > 0 ? y / screenHeight : 0);

    return `rgba(${colour.red}, ${colour.green}, ${colour.blue}, ${alpha})`;
  };

  return {
    colours: [paint(0, 1), paint(solidTo, 1), paint(clearBy, 0)],
    locations: [0, solidTo / clearBy, 1],
  };
}

export const SURFACE_PRIMARY = 'rgba(80, 120, 200, 0.32)';
export const SURFACE_SECONDARY = 'rgba(63, 105, 184, 0.55)';
export const SURFACE_NAV = 'rgba(14, 43, 113, 0.82)';

export const BORDER_DEFAULT = 'rgba(190, 215, 255, 0.38)';
export const BORDER_ACTIVE = 'rgba(214, 230, 255, 0.62)';

export const TEXT_PRIMARY = '#FFFFFF';
export const TEXT_SECONDARY = 'rgba(255, 255, 255, 0.72)';

export const ACCENT_GOLD = '#E8B84B';
export const ACCENT_PURPLE = '#6D5DF5';
export const ACCENT_BLUE = NIGHT_BRIGHT;
export const ACCENT_GREEN = '#6FCF7F';

/** Removal and other undoing. The same red the screen-time ring warns in. */
export const ACCENT_CORAL = '#E4483F';
