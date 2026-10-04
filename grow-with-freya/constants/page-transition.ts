import type { VoyagePhase } from '@/constants/island-voyage';

export const PAGE_TRANSITION_DURATION_MS = 800;
export const SLIDE_AFTER_SECTION_SWITCH_MS = 80;

export const PREWARMED_PAGES = ['stories', 'account'] as const;
export const INSTANT_PAGES = ['island'] as const;
export const PREWARMED_FOR_THE_ISLAND = [...PREWARMED_PAGES, 'island'] as const;

export function prewarmedDuring(phase: VoyagePhase): readonly string[] {
  return phase === 'home' || phase === 'leaving' ? PREWARMED_PAGES : PREWARMED_FOR_THE_ISLAND;
}
