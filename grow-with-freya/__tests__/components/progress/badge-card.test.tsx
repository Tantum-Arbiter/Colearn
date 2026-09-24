/**
 * One BadgeCard serves every state (§32): the rim, artwork energy and
 * progress pill change with status, never the component. No locks — an
 * undiscovered badge is a dashed, dreamy silhouette (§15, §19).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BadgeCard } from '@/components/progress/badge-card';
import { Badge, BadgeStatus, badgeStatus } from '@/components/progress/progress-model';

const badge = (current: number, target: number): Badge => ({
  id: 'story-adventurer',
  titleKey: 'progress.badges.storyAdventurer.title',
  descriptionKey: 'progress.badges.storyAdventurer.description',
  artwork: { uri: 'test://artwork' },
  category: 'stories',
  currentProgress: current,
  targetProgress: target,
  status: badgeStatus(current, target),
  recommendation: { labelKey: 'progress.recommendations.discover', tag: null },
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('BadgeCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [0, 10, 'undiscovered'],
    [1, 10, 'started'],
    [6, 10, 'in_progress'],
    [10, 10, 'earned'],
  ] as [number, number, BadgeStatus][])(
    'renders %s/%s through the %s artwork state of the single component',
    (current, target, status) => {
      const tree = render(<BadgeCard badge={badge(current, target)} width={140} onPress={jest.fn()} />);

      expect(byTestId(tree, `badge-artwork-${status}`).length).toBeGreaterThan(0);
    }
  );

  it('always shows the readable progress count regardless of state', () => {
    const tree = render(<BadgeCard badge={badge(6, 10)} width={140} onPress={jest.fn()} />);

    const counts = tree.UNSAFE_root.findAll(
      (n: any) => n.props.children === 'progress.count (current:6, target:10)'
    );
    expect(counts.length).toBeGreaterThan(0);
  });

  it('shows a CMS badge by its own copy', () => {
    const cms = { ...badge(6, 10), titleKey: '', descriptionKey: '', title: 'Calm Collector', description: 'Finish two calming books' };
    const tree = render(<BadgeCard badge={cms} width={140} onPress={jest.fn()} />);

    expect(byTestId(tree, 'badge-card-story-adventurer')[0].props.accessibilityLabel).toBe('Calm Collector');
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'Finish two calming books').length).toBeGreaterThan(0);
  });

  it('exposes its progress to assistive tech without relying on colour', () => {
    const tree = render(<BadgeCard badge={badge(6, 10)} width={140} onPress={jest.fn()} />);

    const card = byTestId(tree, 'badge-card-story-adventurer')[0];
    expect(card.props.accessibilityLabel).toBe('progress.badges.storyAdventurer.title');
    expect(card.props.accessibilityValue.text).toContain('progress.count');
  });

  it('reports taps with the badge', () => {
    const onPress = jest.fn();
    const underTest = badge(6, 10);
    const tree = render(<BadgeCard badge={underTest} width={140} onPress={onPress} />);

    fireEvent.press(byTestId(tree, 'badge-card-story-adventurer')[0]);

    expect(onPress).toHaveBeenCalledWith(underTest);
  });

  it('never renders a lock icon for an undiscovered badge', () => {
    const tree = render(<BadgeCard badge={badge(0, 10)} width={140} onPress={jest.fn()} />);

    const locks = tree.UNSAFE_root.findAll(
      (n: any) => typeof n.props.name === 'string' && n.props.name.includes('lock')
    );
    expect(locks).toHaveLength(0);
  });
});
