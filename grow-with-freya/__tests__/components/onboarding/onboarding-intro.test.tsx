/**
 * The page before onboarding. For now it is a placeholder the operator asked
 * for: a white page saying what will stand here -- a short film selling the
 * app the moment it opens -- and a button into onboarding.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_INTRO, OnboardingIntro } from '@/components/onboarding/onboarding-intro';

const byTestId = (tree: ReturnType<typeof render>, id: string) => tree.UNSAFE_root.findAll((n: any) => n.props.testID === id);
const styled = (tree: ReturnType<typeof render>, id: string) =>
  StyleSheet.flatten(byTestId(tree, id).filter((n: any) => n.props.style !== undefined).slice(-1)[0].props.style);

describe('OnboardingIntro', () => {
  it('is a plain white page that fills the screen, clear of the status bar and the home bar', () => {
    const tree = render(<OnboardingIntro onStart={jest.fn()} />);

    expect(styled(tree, 'onboarding-intro')).toEqual(
      expect.objectContaining({ flex: 1, backgroundColor: '#FFFFFF', paddingTop: 44, paddingBottom: 34 }),
    );
  });

  it('says what will stand here, in the operator\'s words', () => {
    const tree = render(<OnboardingIntro onStart={jest.fn()} />);

    expect(ONBOARDING_INTRO.message).toBe(
      'Sell what it is here, the moment a user opens - a short video showcasing functionality/value for kid and parent',
    );
    expect(byTestId(tree, 'onboarding-intro-message')[0].props.children).toBe(ONBOARDING_INTRO.message);
    expect(styled(tree, 'onboarding-intro-message').textAlign).toBe('center');
  });

  it('offers Start onboarding as a button, and starts when it is pressed', () => {
    const onStart = jest.fn();
    const tree = render(<OnboardingIntro onStart={onStart} />);
    const button = byTestId(tree, 'onboarding-intro-start').find((n: any) => n.props.accessibilityRole === 'button')!;

    expect(ONBOARDING_INTRO.start).toBe('Start onboarding');
    expect(button.props.accessibilityLabel).toBe('Start onboarding');
    expect(button.findAll((n: any) => n.props.children === 'Start onboarding').length).toBeGreaterThan(0);
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.press(button);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('keeps the words to a readable width on a tablet', () => {
    const tree = render(<OnboardingIntro onStart={jest.fn()} />);

    expect(styled(tree, 'onboarding-intro-message').maxWidth).toBe(ONBOARDING_INTRO.maxWidth);
    expect(ONBOARDING_INTRO.maxWidth).toBeLessThanOrEqual(560);
  });
});
