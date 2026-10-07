/**
 * StoryRow -- one shelf of books to swipe along, headed like any section,
 * with a way to see all of them at the row's end.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { StoryRow } from '@/components/stories/catalogue/story-row';
import { fromStory } from '@/components/stories/catalogue/catalogue-story';
import { Story } from '@/types/story';

const story = (id: string): Story => ({ id, title: id, category: 'adventure', isAvailable: true });

function byTestId(tree: ReturnType<typeof render>, testID: string): any[] {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('StoryRow', () => {
  const stories = ['bear', 'owl', 'whale'].map((id) => fromStory(story(id)));
  const renderCard = jest.fn((item, width) => <Text testID={`card-${item.id}`}>{`${item.id}@${width}`}</Text>);

  beforeEach(() => jest.clearAllMocks());

  it('should head the shelf and lay every book along it at the card width', () => {
    const tree = render(
      <StoryRow heading="stories.genreStories" stories={stories} cardWidth={150} edgeInset={20} renderCard={renderCard} testID="row" />
    );

    expect(byTestId(tree, 'row-heading').length).toBeGreaterThan(0);
    for (const id of ['bear', 'owl', 'whale']) {
      expect(byTestId(tree, `card-${id}`).length).toBeGreaterThan(0);
    }
    expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'bear' }), 150);
  });

  it('should run out past the content margin to the screen edge and back', () => {
    const tree = render(
      <StoryRow heading="h" stories={stories} cardWidth={150} edgeInset={20} renderCard={renderCard} testID="row" />
    );

    const shelf = byTestId(tree, 'row-shelf')[0];
    const underTest = StyleSheet.flatten(shelf.props.style);
    const content = StyleSheet.flatten(shelf.props.contentContainerStyle);

    expect(underTest.marginHorizontal).toBe(-20);
    expect(content.paddingHorizontal).toBe(20);
    expect(shelf.props.horizontal).toBe(true);
  });

  it('should offer See all at the row end and hand a tap to onAction', () => {
    const onAction = jest.fn();
    const tree = render(
      <StoryRow heading="h" stories={stories} cardWidth={150} edgeInset={20} renderCard={renderCard} actionLabel="catalogue.seeAll" onAction={onAction} testID="row" />
    );

    const action = byTestId(tree, 'row-heading-action').find((n: any) => n.props.accessibilityRole === 'button');
    fireEvent.press(action);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('should carry no See all when the row has nowhere to lead', () => {
    const tree = render(
      <StoryRow heading="h" stories={stories} cardWidth={150} edgeInset={20} renderCard={renderCard} testID="row" />
    );

    expect(byTestId(tree, 'row-heading-action')).toHaveLength(0);
  });
});
