/**
 * Section headings sit on the background with a gold star mark (§6.6).
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SectionHeading } from '@/components/child-ui/section-heading';
import { ACCENT_GOLD } from '@/constants/night-palette';

describe('SectionHeading', () => {
  it('renders the label text', () => {
    const tree = render(<SectionHeading label="catalogue.moreStories" />);

    const texts = tree.UNSAFE_root.findAll(
      (n: any) => n.props.children === 'catalogue.moreStories' && n.props.accessibilityRole === 'header'
    );
    expect(texts.length).toBeGreaterThan(0);
  });

  it('leads with a gold star icon', () => {
    const tree = render(<SectionHeading label="catalogue.moreStories" />);

    const stars = tree.UNSAFE_root.findAll(
      (n: any) => n.props.name === 'star' && n.props.color === ACCENT_GOLD
    );
    expect(stars.length).toBeGreaterThan(0);
  });
});
