import React from 'react';
import { StorySelectionScreen } from './story-selection-screen';
import { StoryGardenScreen } from './story-garden/story-garden-screen';
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
  selectedStory,
  onBack,
  initialMode,
  onOpenParentCorner,
}: SimpleStoryScreenProps) {
  const useStoryGarden = useAppStore((state) => state.useStoryGarden);

  if (useStoryGarden) {
    return <StoryGardenScreen onStorySelect={onStorySelect} onOpenParentCorner={onOpenParentCorner} />;
  }

  return (
    <StorySelectionScreen
      onStorySelect={onStorySelect}
      initialMode={initialMode as any}
    />
  );
}
