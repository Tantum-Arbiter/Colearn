import React from 'react';
import { StoryCatalogueScreen, type CatalogueSectionRequest } from './catalogue/story-catalogue-screen';
import type { CatalogueMode } from './catalogue/catalogue-story';
import { Story } from '@/types/story';

interface SimpleStoryScreenProps {
  onStorySelect?: (story: Story) => void;
  onStoryTransitionComplete?: () => void;
  selectedStory?: Story | null;
  onBack: () => void;
  /** Pre-selected story mode from main menu (interactive / music / classic) */
  initialMode?: string | null;
  /** Which catalogue section the home asked for, keyed so a repeat request still applies */
  sectionRequest?: CatalogueSectionRequest;
  /** Opens the grown-ups' area from the profile page's settings control. */
  onOpenSettings?: () => void;
  isActive?: boolean;
}

export function SimpleStoryScreen({
  onStorySelect,
  onBack: _onBack,
  initialMode,
  sectionRequest,
  onOpenSettings,
  isActive,
}: SimpleStoryScreenProps) {
  return (
    <StoryCatalogueScreen
      onStorySelect={onStorySelect}
      initialMode={(initialMode as CatalogueMode | null) ?? null}
      sectionRequest={sectionRequest}
      onOpenSettings={onOpenSettings}
      isActive={isActive}
    />
  );
}
