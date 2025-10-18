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
  onStoryTransitionComplete,
  onBack,
}: SimpleStoryScreenProps) {
  console.log('SimpleStoryScreen rendering - using StorySelectionScreen');

  const handleStorySelect = (story: Story) => {
    console.log('SimpleStoryScreen: Story selected, calling callbacks');

    // Call the story select callback
    if (onStorySelect) {
      onStorySelect(story);
    }

    // Since we're not doing the thumbnail expansion animation,
    // immediately call the transition complete callback
    if (onStoryTransitionComplete) {
      console.log('SimpleStoryScreen: Calling transition complete immediately');
      onStoryTransitionComplete();
    }
  };

  return (
    <StorySelectionScreen
      onStorySelect={handleStorySelect}
    />
  );
}
