/**
 * Sign-in floats above the app. Opened from a page, it slides up over that
 * page the way pages slide; reached at launch, it simply appears for the login
 * screen's own fade.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { withTiming } from 'react-native-reanimated';
import { AuthOverlay } from '@/components/auth/auth-overlay';
import { PAGE_TRANSITION_DURATION_MS } from '@/constants/page-transition';

describe('AuthOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('holds what it is given', () => {
    const view = render(
      <AuthOverlay entrance="fade">
        <Text testID="inside">login</Text>
      </AuthOverlay>
    );

    expect(view.UNSAFE_root.findAll((n: any) => n.props.testID === 'inside').length).toBeGreaterThan(0);
  });

  it('slides up into place over a page, at the pace pages slide', () => {
    render(
      <AuthOverlay entrance="slide">
        <Text>login</Text>
      </AuthOverlay>
    );

    expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: PAGE_TRANSITION_DURATION_MS }));
  });

  it('does not move when sign-in is where the journey begins', () => {
    render(
      <AuthOverlay entrance="fade">
        <Text>login</Text>
      </AuthOverlay>
    );

    expect(withTiming).not.toHaveBeenCalled();
  });
});
