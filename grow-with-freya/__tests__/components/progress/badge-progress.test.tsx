/**
 * The progress pill carries the state meaning that colour alone must not
 * (§30): a readable count, purple fill in progress, gold when earned.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeProgress } from '@/components/progress/badge-progress';
import { ACCENT_GOLD, ACCENT_PURPLE } from '@/constants/night-palette';

function fillStyle(tree: ReturnType<typeof render>) {
  const fill = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'badge-progress-fill')[0];
  return fill.props.style.flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
}

describe('BadgeProgress', () => {
  it('shows the count through the shared translation key', () => {
    const tree = render(<BadgeProgress current={3} target={5} earned={false} />);

    const counts = tree.UNSAFE_root.findAll(
      (n: any) => n.props.children === 'progress.count (current:3, target:5)'
    );
    expect(counts.length).toBeGreaterThan(0);
  });

  it('fills proportionally to progress', () => {
    const tree = render(<BadgeProgress current={3} target={5} earned={false} />);

    expect(fillStyle(tree).width).toBe('60%');
  });

  it.each([
    [false, ACCENT_PURPLE],
    [true, ACCENT_GOLD],
  ])('uses %s→%s fill colouring', (earned, colour) => {
    const tree = render(<BadgeProgress current={5} target={5} earned={earned} />);

    expect(fillStyle(tree).backgroundColor).toBe(colour);
  });
});
