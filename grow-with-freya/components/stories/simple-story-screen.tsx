import React from 'react';
import { StorySelectionScreen } from './story-selection-screen';
import { Story } from '@/types/story';

interface SimpleStoryScreenProps {
  onStorySelect?: (story: Story) => void;
  onStoryTransitionComplete?: () => void;
  selectedStory?: Story | null;
  onBack: () => void;
  /** Pre-selected story mode from main menu (interactive / music / classic) */
  initialMode?: string | null;
}

export function SimpleStoryScreen({
  onStorySelect,
  selectedStory,
  onBack,
  initialMode,
}: SimpleStoryScreenProps) {
  return (
    <StorySelectionScreen
      onStorySelect={onStorySelect}
      initialMode={initialMode as any}
    />
  );
}
