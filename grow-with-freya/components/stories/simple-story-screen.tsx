import React from 'react';
import { StorySelectionScreen } from './story-selection-screen';
import { Story } from '@/types/story';

interface SimpleStoryScreenProps {
  onStorySelect?: (story: Story) => void;
  onStoryTransitionComplete?: () => void;
  selectedStory?: Story | null;
  onBack: () => void;
}

export function SimpleStoryScreen({
  onStorySelect,
  selectedStory,
  onBack,
}: SimpleStoryScreenProps) {
  // Story selection now uses the StoryTransitionContext for mode selection overlay
  // The onStoryTransitionComplete is no longer called immediately -
  // instead, the context's onBeginCallback handles starting the story reader
  // after the user selects a mode and taps "Begin"

  return (
    <StorySelectionScreen
      onStorySelect={onStorySelect}
    />
  );
}
