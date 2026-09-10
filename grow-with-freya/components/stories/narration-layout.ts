import type { ViewStyle } from 'react-native';

type NarrationLayout = ViewStyle & { right: number; width: number; top: number; bottom: number };

export function narrationLayout(width: number, height: number, rightInset: number): NarrationLayout | null {
  if (width <= height) return null;
  return {
    position: 'absolute',
    right: Math.max(rightInset + 20, width * 0.05),
    width: width * 0.39,
    maxWidth: width * 0.39,
    top: Math.max(50, height * 0.16),
    bottom: Math.max(70, height * 0.18),
    marginHorizontal: 0,
    flex: 0,
    justifyContent: 'center',
  };
}
