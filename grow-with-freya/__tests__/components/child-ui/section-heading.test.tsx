/**
 * Section headings sit on the background with a gold star mark (§6.6).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SectionHeading } from '@/components/child-ui/section-heading';
import { ACCENT_GOLD } from '@/constants/night-palette';

const mockAccessibility = jest.fn(() => ({
  scaledFontSize: (n: number) => n,
  scaledButtonSize: (n: number) => n,
  scaledPadding: (n: number) => n,
  isTablet: false,
  contentMaxWidth: 402,
}));
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => mockAccessibility(),
}));

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

  it('takes a mark of its own when the section has one', () => {
    const tree = render(<SectionHeading label="catalogue.continueReading" icon="time-outline" iconColor="#ABCDEF" />);

    const marks = tree.UNSAFE_root.findAll((n: any) => n.props.name === 'time-outline' && n.props.color === '#ABCDEF');
    expect(marks.length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.name === 'star')).toHaveLength(0);
  });

  it('offers See all at the row end and hands a tap to onAction', () => {
    const onAction = jest.fn();
    const tree = render(<SectionHeading label="h" actionLabel="catalogue.seeAll" onAction={onAction} testID="heading" />);

    const action = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'heading-action' && n.props.accessibilityRole === 'button')[0];
    fireEvent.press(action);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.seeAll').length).toBeGreaterThan(0);
  });

  it('carries no action when given none', () => {
    const tree = render(<SectionHeading label="h" testID="heading" />);

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'heading-action')).toHaveLength(0);
  });

  it('leads with a gold star when the section has no mark of its own', () => {
    const tree = render(<SectionHeading label="catalogue.moreStories" />);

    const underTest = tree.UNSAFE_root.findAll((n: any) => n.props.name === 'star' && n.props.color === ACCENT_GOLD);

    expect(underTest.length).toBeGreaterThan(0);
  });

  it('sets the mark and the See all larger on a tablet, where there is room for them', () => {
    const phone = render(<SectionHeading label="h" actionLabel="catalogue.seeAll" onAction={jest.fn()} testID="heading" />);
    const phoneMark = phone.UNSAFE_root.findAll((n: any) => n.props.name === 'star')[0].props.size;
    const phoneAction = phone.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.seeAll')[0].props.style;
    mockAccessibility.mockReturnValue({
      scaledFontSize: (n: number) => n,
      scaledButtonSize: (n: number) => n,
      scaledPadding: (n: number) => n,
      isTablet: true,
      contentMaxWidth: 834,
    });

    const tablet = render(<SectionHeading label="h" actionLabel="catalogue.seeAll" onAction={jest.fn()} testID="heading" />);

    const underTest = tablet.UNSAFE_root.findAll((n: any) => n.props.name === 'star')[0].props.size;
    const tabletAction = tablet.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.seeAll')[0].props.style;
    expect(underTest).toBeGreaterThan(phoneMark);
    expect(StyleSheet.flatten(tabletAction).fontSize).toBeGreaterThan(StyleSheet.flatten(phoneAction).fontSize);
  });
});
