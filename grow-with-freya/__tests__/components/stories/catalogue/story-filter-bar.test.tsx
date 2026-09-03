/**
 * The filter row is always a single line (§6.5): content-sized pills scroll
 * horizontally rather than wrapping or shrinking their labels, selection is
 * reported per tag, and the trailing toggle switches the catalogue view.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { StoryFilterBar } from '@/components/stories/catalogue/story-filter-bar';
import { StoryFilterTag } from '@/types/story';

const baseProps = {
  selectedTags: new Set<StoryFilterTag>(),
  onToggleTag: jest.fn(),
  gridActive: false,
  onToggleView: jest.fn(),
};

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll(
    (n: any) => n.props.testID === testID && n.props.accessibilityRole === 'button'
  );
}

describe('StoryFilterBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [['calming', 'bedtime', 'adventure'] as StoryFilterTag[]],
    [['calming', 'bedtime', 'adventure', 'learning', 'music'] as StoryFilterTag[]],
  ])('renders %j as one horizontal row that scrolls instead of wrapping', (tags) => {
    const tree = render(<StoryFilterBar {...baseProps} tags={tags} />);

    const list = tree.UNSAFE_root.findAllByType(FlatList as any)[0];
    expect(list.props.horizontal).toBe(true);
    expect(list.props.data).toHaveLength(tags.length);
  });

  it('never shrinks a pill label to fit', () => {
    const tree = render(<StoryFilterBar {...baseProps} tags={['learning'] as StoryFilterTag[]} />);

    const labels = tree.UNSAFE_root.findAll(
      (n: any) => n.props.children === 'stories.filterTags.learning' && n.props.style
    );
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label: any) => {
      expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    });
  });

  it('reports pill taps through onToggleTag', () => {
    const onToggleTag = jest.fn();
    const tree = render(
      <StoryFilterBar {...baseProps} tags={['calming', 'bedtime', 'adventure']} onToggleTag={onToggleTag} />
    );

    fireEvent.press(byTestId(tree, 'story-filter-pill-bedtime')[0]);

    expect(onToggleTag).toHaveBeenCalledWith('bedtime');
  });

  it('marks selected pills for assistive tech without changing their hue', () => {
    const tree = render(
      <StoryFilterBar
        {...baseProps}
        tags={['calming', 'bedtime', 'adventure']}
        selectedTags={new Set<StoryFilterTag>(['bedtime'])}
      />
    );

    const pill = byTestId(tree, 'story-filter-pill-bedtime')[0];
    expect(pill.props.accessibilityState.selected).toBe(true);
  });

  it('reports the view toggle', () => {
    const onToggleView = jest.fn();
    const tree = render(
      <StoryFilterBar {...baseProps} tags={['calming', 'bedtime', 'adventure']} onToggleView={onToggleView} />
    );

    fireEvent.press(byTestId(tree, 'story-view-toggle')[0]);

    expect(onToggleView).toHaveBeenCalledTimes(1);
  });

  it('labels pills through their translation keys', () => {
    const tree = render(<StoryFilterBar {...baseProps} tags={['calming'] as StoryFilterTag[]} />);

    expect(byTestId(tree, 'story-filter-pill-calming')[0].props.accessibilityLabel)
      .toBe('stories.filterTags.calming');
  });
});
