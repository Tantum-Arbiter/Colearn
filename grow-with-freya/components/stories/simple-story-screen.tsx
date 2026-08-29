import React from 'react';
import { StoryGardenScreen } from './story-garden/story-garden-screen';
import { StoryCatalogueScreen } from './catalogue/story-catalogue-screen';
import type { CatalogueMode } from './catalogue/catalogue-story';
import { useAppStore } from '@/store/app-store';
import { Story } from '@/types/story';

interface SimpleStoryScreenProps {
  onStorySelect?: (story: Story) => void;
  onStoryTransitionComplete?: () => void;
  selectedStory?: Story | null;
  onBack: () => void;
  /** Pre-selected story mode from main menu (interactive / music / classic) */
  initialMode?: string | null;
  /** Story Garden: where the parent-facing layer lives */
  onOpenParentCorner?: () => void;
}

export function SimpleStoryScreen({
  onStorySelect,
  onBack: _onBack,
  initialMode,
  onOpenParentCorner,
}: SimpleStoryScreenProps) {
  const useStoryGarden = useAppStore((state) => state.useStoryGarden);

  if (useStoryGarden) {
    return <StoryGardenScreen onStorySelect={onStorySelect} onOpenParentCorner={onOpenParentCorner} />;
  }

  return (
    <StoryCatalogueScreen
      onStorySelect={onStorySelect}
      initialMode={(initialMode as CatalogueMode | null) ?? null}
      onOpenParentCorner={onOpenParentCorner}
    />
  );
}
