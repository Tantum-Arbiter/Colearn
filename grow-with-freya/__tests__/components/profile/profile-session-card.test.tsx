/**
 * Where signing in lives on the Profile page: a guest is told why it is worth
 * doing, in the gold of the sign-in symbol, with one way in; a signed-in
 * family gets a quiet line saying so, and the way out.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfileSessionCard } from '@/components/profile/profile-session-card';
import { PROFILE_CTA_MAX_WIDTH } from '@/components/profile/profile-session-card';
import { ACCENT_GOLD } from '@/constants/night-palette';

function texts(tree: ReturnType<typeof render>): string[] {
  return tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.children === 'string' && n.props.children !== n.props.name)
    .map((n: any) => n.props.children);
}

function button(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-session' && n.props.accessibilityRole === 'button')[0];
}

describe('ProfileSessionCard for a guest', () => {
  it('offers one gold Login button and nothing else to read', () => {
    const underTest = render(<ProfileSessionCard needsSignIn width={340} onLogin={jest.fn()} onLogout={jest.fn()} />);

    const words = texts(underTest).filter((text) => text.includes('.'));
    expect(new Set(words)).toEqual(new Set(['common.login']));
  });

  it('draws the login glyph in the ink the gold buttons use, not the bar\'s gold', () => {
    const underTest = render(<ProfileSessionCard needsSignIn width={340} onLogin={jest.fn()} onLogout={jest.fn()} />);

    // the button balances its glyph with an unseen twin; both are counted here
    const glyphs = underTest.UNSAFE_root.findAll((n: any) => n.props.name === 'log-in-outline');
    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-session-icon')).toHaveLength(1);
    expect(glyphs.length).toBeGreaterThan(0);
    glyphs.forEach((glyph: any) => expect(glyph.props.color).not.toBe(ACCENT_GOLD));
  });

  it('stays a button\'s width on a tablet rather than spanning the column', () => {
    const underTest = render(<ProfileSessionCard needsSignIn width={760} onLogin={jest.fn()} onLogout={jest.fn()} />);

    const card = underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-session-card')[0];
    expect(StyleSheet.flatten(card.props.style).width).toBe(PROFILE_CTA_MAX_WIDTH);
    expect(PROFILE_CTA_MAX_WIDTH).toBeLessThanOrEqual(320);
  });

  it('sits most of the way across the column, with a way in big enough for a thumb', () => {
    const underTest = render(<ProfileSessionCard needsSignIn width={340} onLogin={jest.fn()} onLogout={jest.fn()} />);

    const card = underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-session-card')[0];
    expect(StyleSheet.flatten(card.props.style).width).toBe(Math.round(340 * 0.72));
    const cta = StyleSheet.flatten(button(underTest).props.style({ pressed: false }));
    expect(cta.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('wears the shared gold button, the one the free trial wears too', () => {
    const underTest = render(<ProfileSessionCard needsSignIn width={340} onLogin={jest.fn()} onLogout={jest.fn()} />);

    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-session-glow').length).toBeGreaterThan(0);
    expect(underTest.UNSAFE_root.findAll((n: any) => Array.isArray(n.props.colors)).length).toBeGreaterThanOrEqual(2);
  });

  it('takes a guest to sign in, and never signs anyone out', () => {
    const onLogin = jest.fn();
    const onLogout = jest.fn();
    const underTest = render(<ProfileSessionCard needsSignIn width={340} onLogin={onLogin} onLogout={onLogout} />);

    fireEvent.press(button(underTest));

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();
    expect(button(underTest).props.accessibilityLabel).toBe('common.login');
  });
});

describe('ProfileSessionCard once signed in', () => {
  it('says so quietly, with no card and nothing asking to sign in', () => {
    const underTest = render(<ProfileSessionCard needsSignIn={false} width={340} onLogin={jest.fn()} onLogout={jest.fn()} />);

    expect(texts(underTest)).toEqual(expect.arrayContaining(['profile.signedIn', 'common.logout']));
    expect(texts(underTest)).not.toContain('common.login');
    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.name === 'log-in-outline')).toHaveLength(0);
  });

  it('offers the way out', () => {
    const onLogin = jest.fn();
    const onLogout = jest.fn();
    const underTest = render(<ProfileSessionCard needsSignIn={false} width={340} onLogin={onLogin} onLogout={onLogout} />);

    fireEvent.press(button(underTest));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onLogin).not.toHaveBeenCalled();
    expect(button(underTest).props.accessibilityLabel).toBe('common.logout');
  });
});
