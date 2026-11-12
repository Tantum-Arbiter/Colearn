import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { PagePill } from '@/components/stories/page-pill';

type Node = { children: (string | Node)[] };
const text = (node: Node): string => node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
const pill = (root: ReactTestInstance) => root.findAll((node) => node.props.testID === 'page-indicator')[0];

describe('PagePill', () => {
  const cases: [number, number, string][] = [
    [4, 15, '4 / 15'],
    [1, 2, '1 / 2'],
    [12, 12, '12 / 12'],
  ];

  it.each(cases)('page %p of %p reads %p, written by the app', (page, total, expected) => {
    const { UNSAFE_root } = render(<PagePill page={page} total={total} height={34} fontSize={15} label="" />);

    expect(text(pill(UNSAFE_root) as unknown as Node)).toBe(expected);
  });

  it('carries the open book in front of the numbers', () => {
    const { UNSAFE_root } = render(<PagePill page={4} total={15} height={34} fontSize={15} label="" />);
    const inside = pill(UNSAFE_root).findAll((node) => typeof node.props.testID === 'string').map((node) => node.props.testID);

    expect(inside.indexOf('page-pill-book')).toBeGreaterThanOrEqual(0);
    expect(inside.indexOf('page-pill-book')).toBeLessThan(inside.indexOf('page-pill-number'));
  });

  it('is fully rounded at the height it is given and writes at the size it is given', () => {
    const { UNSAFE_root } = render(<PagePill page={4} total={15} height={40} fontSize={17} label="" />);
    const number = UNSAFE_root.findAll((node) => node.props.testID === 'page-pill-number')[0];

    expect(StyleSheet.flatten(pill(UNSAFE_root).props.style)).toEqual(expect.objectContaining({ height: 40, borderRadius: 20 }));
    expect(StyleSheet.flatten(number.props.style).fontSize).toBe(17);
  });

  it('reads the page and the book length to the screen reader in words', () => {
    const { UNSAFE_root } = render(<PagePill page={4} total={15} height={34} fontSize={15} label="Page 4 of 15" />);

    expect(pill(UNSAFE_root).props.accessibilityLabel).toBe('Page 4 of 15');
    expect(pill(UNSAFE_root).props.accessible).toBe(true);
  });
});
