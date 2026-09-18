/**
 * The auth pills carry a label next to a leading mark. The Google mark is an
 * SVG that reports its size late, and with adjustsFontSizeToFit the label was
 * measured against a near-zero frame and shrank to an unreadable size. These
 * pin the label down: no iOS auto-shrink, and room to wrap instead.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthPillButton } from '@/components/auth/auth-pill-button';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

/** The label Text itself -- queried by testID so these assert against the node
 *  that actually carries numberOfLines and the font size, not a host wrapper
 *  where every one of these props reads as undefined. */
function labelNode(tree: ReturnType<typeof render>) {
  const node = byTestId(tree, 'auth-pill-label')[0];
  expect(node).toBeTruthy();
  return node;
}

const baseProps = {
  label: 'Continue with Google',
  variant: 'light' as const,
  onPress: jest.fn(),
};

describe('AuthPillButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders its label', () => {
    const tree = render(<AuthPillButton {...baseProps} testID="pill" />);

    expect(labelNode(tree).props.children).toBe('Continue with Google');
  });

  it('never asks iOS to auto-shrink the label', () => {
    const tree = render(<AuthPillButton {...baseProps} />);

    expect(labelNode(tree).props.adjustsFontSizeToFit).toBeUndefined();
  });

  it('lets a long translation wrap rather than truncating it', () => {
    const long = "Continuer en tant qu'invité";
    const tree = render(<AuthPillButton {...baseProps} label={long} variant="guest" />);

    expect(labelNode(tree).props.numberOfLines).toBeGreaterThan(1);
  });

  it('keeps the label at full size beside an icon that measures late', () => {
    const lateIcon = <Text testID="late-icon">icon</Text>;
    const tree = render(<AuthPillButton {...baseProps} icon={lateIcon} />);

    const styles = labelNode(tree).props.style.flat();
    const fontSize = styles.reduce(
      (found: number | undefined, s: any) => (s?.fontSize ? s.fontSize : found),
      undefined
    );

    expect(byTestId(tree, 'late-icon').length).toBeGreaterThan(0);
    expect(fontSize).toBe(17);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const tree = render(<AuthPillButton {...baseProps} onPress={onPress} testID="pill" />);

    fireEvent.press(byTestId(tree, 'pill')[0]);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // fireEvent.press ignores Pressable's disabled prop in this environment, so
  // this asserts the state the platform acts on rather than simulating a tap
  it('marks itself disabled for the platform and assistive tech', () => {
    const tree = render(<AuthPillButton {...baseProps} disabled testID="pill" />);

    // the flag lands on `disabled` or `aria-disabled` depending on which node
    // of the Pressable is queried, so accept either
    const disabled = byTestId(tree, 'pill').some(
      (n: any) => n.props.disabled === true || n.props['aria-disabled'] === true
    );

    expect(disabled).toBe(true);
  });
});
