/**
 * The Profile page's trophy case (§32): every badge at once, earned and
 * still-locked alike, at a size that fits five to a phone row. It carries no
 * titles or progress bars -- the Progress screen's cards do that -- so what a
 * child reads here is simply how much of the wall has lit up.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BadgeWall, badgeDiameter } from '@/components/profile/badge-wall';
import { COVER_GRID_GAP } from '@/components/child-ui/tokens';
import { Badge, badgeStatus } from '@/components/progress/progress-model';

const badge = (id: string, current: number, target: number): Badge => ({
  id,
  titleKey: `progress.badges.${id}.title`,
  descriptionKey: `progress.badges.${id}.description`,
  artwork: { uri: `test://${id}` },
  category: 'stories',
  currentProgress: current,
  targetProgress: target,
  status: badgeStatus(current, target),
});

const BADGES = [
  badge('one', 10, 10),
  badge('two', 0, 10),
  badge('three', 6, 10),
  badge('four', 1, 10),
  badge('five', 0, 10),
  badge('six', 10, 10),
];

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function wallItems(tree: ReturnType<typeof render>, id: string) {
  return tree.UNSAFE_root.findAll(
    (n: any) => n.props.testID === `badge-wall-item-${id}` && n.props.accessibilityRole === 'button',
  );
}

/** Which badges the wall put up, however many nodes each renders through. */
function wallIds(tree: ReturnType<typeof render>) {
  const ids = tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('badge-wall-item-'))
    .map((n: any) => n.props.testID.replace('badge-wall-item-', ''));

  return [...new Set(ids)];
}

describe('BadgeWall', () => {
  beforeEach(() => jest.clearAllMocks());

  it('draws every badge, locked ones included', () => {
    const underTest = render(<BadgeWall badges={BADGES} width={340} onPress={jest.fn()} />);

    expect(wallIds(underTest)).toEqual(BADGES.map((entry) => entry.id));
  });

  it('shows how many of the wall has been earned', () => {
    const underTest = render(<BadgeWall badges={BADGES} width={340} onPress={jest.fn()} />);

    const summary = byTestId(underTest, 'badge-wall-summary')[0];

    expect(summary.props.children).toBe('progress.badgesSummary (earned:2, total:6)');
  });

  it('reports the tapped badge so the shared detail sheet can open on it', () => {
    const onPress = jest.fn();
    const underTest = render(<BadgeWall badges={BADGES} width={340} onPress={onPress} />);

    fireEvent.press(wallItems(underTest, 'three')[0]);

    expect(onPress).toHaveBeenCalledWith(BADGES[2]);
  });

  it('names each badge for a screen reader through its title key', () => {
    const underTest = render(<BadgeWall badges={BADGES} width={340} onPress={jest.fn()} />);

    const item = wallItems(underTest, 'one')[0];

    expect(item.props.accessibilityRole).toBe('button');
    expect(item.props.accessibilityLabel).toBe('progress.badges.one.title');
  });

  it('renders nothing at all when there are no badges to show', () => {
    const underTest = render(<BadgeWall badges={[]} width={340} onPress={jest.fn()} />);

    expect(byTestId(underTest, 'badge-wall')).toHaveLength(0);
  });
});

/**
 * Five to a row is the point of the wall: the medallion takes whatever the
 * content width leaves once the four gaps between them are paid for.
 */
describe('badgeDiameter', () => {
  it.each([320, 340, 402, 520])('fits five across %ipt with the gaps paid for', (width) => {
    const diameter = badgeDiameter(width, 5);

    expect(diameter * 5 + COVER_GRID_GAP * 4).toBeLessThanOrEqual(width);
  });

  it('grows with the width it is given', () => {
    expect(badgeDiameter(520, 5)).toBeGreaterThan(badgeDiameter(320, 5));
  });

  it('never shrinks below a tappable medallion, however narrow the screen', () => {
    expect(badgeDiameter(200, 5)).toBeGreaterThanOrEqual(40);
  });
});
