import { TextSize } from '../store/app-store';

// Text scaling multipliers for different sizes
const TEXT_SCALE_MULTIPLIERS: Record<TextSize, number> = {
  small: 0.85,
  normal: 1.0,
  large: 1.15,
};

/**
 * Scales a font size based on the user's text size preference
 * @param baseFontSize - The base font size to scale
 * @param textSize - The user's text size preference
 * @returns The scaled font size
 */
export function scaleText(baseFontSize: number, textSize: TextSize): number {
  const multiplier = TEXT_SCALE_MULTIPLIERS[textSize];
  return Math.round(baseFontSize * multiplier);
}

/**
 * Hook to get a text scaling function for the current text size setting
 * @param textSize - The current text size setting
 * @returns A function that scales font sizes
 */
export function useTextScaling(textSize: TextSize) {
  return (baseFontSize: number) => scaleText(baseFontSize, textSize);
}

/**
 * Creates a scaled text style object
 * @param baseFontSize - The base font size
 * @param textSize - The text size preference
 * @param additionalStyles - Additional style properties
 * @returns Style object with scaled fontSize
 */
export function createScaledTextStyle(
  baseFontSize: number,
  textSize: TextSize,
  additionalStyles?: object
) {
  return {
    fontSize: scaleText(baseFontSize, textSize),
    ...additionalStyles,
  };
}

/**
 * Utility to get text size display name
 * @param textSize - The text size value
 * @returns Display name for the text size
 */
export function getTextSizeDisplayName(textSize: TextSize): string {
  switch (textSize) {
    case 'small':
      return 'Small';
    case 'normal':
      return 'Normal';
    case 'large':
      return 'Large';
    default:
      return 'Normal';
  }
}

/**
 * Utility to get language display name
 * @param language - The language code
 * @returns Display name for the language
 */
export function getLanguageDisplayName(language: string): string {
  switch (language) {
    case 'en':
      return 'English';
    case 'pl':
      return 'Polish';
    case 'fr':
      return 'French';
    default:
      return 'English';
  }
}
