export const NIGHT_RAMP = ['#04102F', '#071D54', '#092E8E', '#1552B7'] as const;

export type NightStop = (typeof NIGHT_RAMP)[number];

export const NIGHT_VOID: NightStop = NIGHT_RAMP[0];
export const NIGHT_DEEP: NightStop = NIGHT_RAMP[1];
export const NIGHT_PRIMARY: NightStop = NIGHT_RAMP[2];
export const NIGHT_BRIGHT: NightStop = NIGHT_RAMP[3];

export type SkyGradient = readonly [NightStop, NightStop, NightStop];

export const SKY_GRADIENT_WORLD: SkyGradient = [NIGHT_BRIGHT, NIGHT_PRIMARY, NIGHT_DEEP];

export const SKY_GRADIENT_QUIET: SkyGradient = [NIGHT_VOID, NIGHT_DEEP, NIGHT_PRIMARY];

export const SKY_GRADIENT_OVERLAY: SkyGradient = [NIGHT_PRIMARY, NIGHT_DEEP, NIGHT_VOID];

export const NIGHT_DEEP_RGB = '7, 29, 84';

export const SCRIM_TO_DEEP: readonly [string, string, string] = [
  `rgba(${NIGHT_DEEP_RGB}, 0)`,
  `rgba(${NIGHT_DEEP_RGB}, 0.55)`,
  NIGHT_DEEP,
];

export const SURFACE_PRIMARY = 'rgba(80, 120, 200, 0.32)';
export const SURFACE_SECONDARY = 'rgba(63, 105, 184, 0.55)';
export const SURFACE_NAV = 'rgba(14, 43, 113, 0.82)';

export const BORDER_DEFAULT = 'rgba(190, 215, 255, 0.38)';
export const BORDER_ACTIVE = 'rgba(214, 230, 255, 0.62)';

export const TEXT_PRIMARY = '#FFFFFF';
export const TEXT_SECONDARY = 'rgba(255, 255, 255, 0.72)';
export const TEXT_MUTED = 'rgba(255, 255, 255, 0.7)';
export const TEXT_FAINT = 'rgba(255, 255, 255, 0.5)';

export const ACCENT_GOLD = '#E8B84B';
export const ACCENT_PURPLE = '#6D5DF5';
export const ACCENT_BLUE = NIGHT_BRIGHT;
export const ACCENT_GREEN = '#6FCF7F';
