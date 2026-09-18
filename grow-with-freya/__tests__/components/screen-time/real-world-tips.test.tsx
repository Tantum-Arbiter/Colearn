/**
 * Tests for the real-world tips surface -- ways to carry the story off the
 * screen, shown from the screen-time alert.
 *
 * The content is generic to stories rather than tied to the book that was
 * just read, because nothing outside the emotions game records a completed
 * activity id. The card shape deliberately mirrors `RealWorldAdventure`, one
 * per category, so per-story bridges can replace the copy later without
 * touching this layout -- which is what the category assertions here protect.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { RealWorldTips } from '@/components/screen-time/real-world-tips';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function renderTips(props: Partial<React.ComponentProps<typeof RealWorldTips>> = {}) {
  return render(<RealWorldTips onClose={jest.fn()} {...props} />);
}

describe('RealWorldTips', () => {
  it('shows one card per category', () => {
    const tree = renderTips();

    expect(findByTestId(tree, 'real-world-tip-0').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'real-world-tip-1').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'real-world-tip-2').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'real-world-tip-3')).toHaveLength(0);
  });

  it('covers at-home, outdoors and creative', () => {
    const json = JSON.stringify(renderTips().toJSON());

    expect(json).toContain('screenTime.tips.atHome.title');
    expect(json).toContain('screenTime.tips.outdoors.title');
    expect(json).toContain('screenTime.tips.creative.title');
  });

  it('gives every card a body, not just a headline', () => {
    const json = JSON.stringify(renderTips().toJSON());

    expect(json).toContain('screenTime.tips.atHome.body');
    expect(json).toContain('screenTime.tips.outdoors.body');
    expect(json).toContain('screenTime.tips.creative.body');
  });

  it('reuses the bridge category labels rather than inventing its own', () => {
    const json = JSON.stringify(renderTips().toJSON());

    expect(json).toContain('bridge.atHome');
    expect(json).toContain('bridge.outdoors');
    expect(json).toContain('bridge.creative');
  });

  it('frames the list with an intro and a closing line', () => {
    const tree = renderTips();
    const json = JSON.stringify(tree.toJSON());

    expect(findByTestId(tree, 'real-world-tips-title').length).toBeGreaterThan(0);
    expect(json).toContain('screenTime.tips.intro');
    expect(findByTestId(tree, 'real-world-tips-closing').length).toBeGreaterThan(0);
  });

  it('closes from its own done button', () => {
    const onClose = jest.fn();
    const tree = renderTips({ onClose });

    fireEvent.press(findByTestId(tree, 'real-world-tips-done')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
