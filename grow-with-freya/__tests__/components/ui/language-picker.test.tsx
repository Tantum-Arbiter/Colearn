/**
 * One language chooser, opened from Grown-ups and from the flag on home: every
 * language with its flag, the one in use marked, and a tap to switch.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { LanguagePicker } from '@/components/ui/language-picker';
import { JourneyBarCoverProvider, useJourneyBarCovered } from '@/components/child-ui/journey-bar-cover';
import { SUPPORTED_LANGUAGES, setStoredLanguage } from '@/services/i18n';

jest.mock('@/services/i18n', () => ({
  ...jest.requireActual('@/services/i18n'),
  setStoredLanguage: jest.fn().mockResolvedValue(undefined),
}));

function byTestId(view: ReturnType<typeof render>, testID: string) {
  return view.UNSAFE_root.findAll((node: any) => node.props.testID === testID && typeof node.type !== 'string');
}

function options(view: ReturnType<typeof render>) {
  const pressable = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'language-option' && typeof node.props.onPress === 'function');
  return pressable.filter((node: any, index: number) => pressable.findIndex((other: any) => other.props.accessibilityLabel === node.props.accessibilityLabel) === index);
}

function texts(view: ReturnType<typeof render>): string[] {
  return view.UNSAFE_queryAllByType(Text).map((node) => node.props.children).filter((child): child is string => typeof child === 'string');
}

function press(view: ReturnType<typeof render>, testID: string) {
  const matches = view.UNSAFE_root.findAll((node: any) => node.props.testID === testID && typeof node.props.onPress === 'function');
  fireEvent.press(matches[matches.length - 1]);
}

describe('LanguagePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows nothing while closed', () => {
    const view = render(<LanguagePicker visible={false} onClose={jest.fn()} />);

    expect(byTestId(view, 'language-picker')).toHaveLength(0);
  });

  it('offers every language by its own name, with its flag', () => {
    const view = render(<LanguagePicker visible onClose={jest.fn()} />);

    const shown = texts(view);

    expect(options(view)).toHaveLength(SUPPORTED_LANGUAGES.length);
    SUPPORTED_LANGUAGES.forEach((language) => {
      expect(shown).toContain(language.nativeName);
      expect(shown).toContain(language.flag);
    });
    expect(shown).toContain('account.selectLanguage');
  });

  it('marks the language in use', () => {
    jest.spyOn(require('react-i18next'), 'useTranslation').mockReturnValue({
      t: (key: string) => key,
      i18n: { language: 'de' },
    } as never);

    const view = render(<LanguagePicker visible onClose={jest.fn()} />);

    const marked = options(view).filter((node: any) => node.props.accessibilityState?.selected);

    expect(marked).toHaveLength(1);
    expect(marked[0].props.accessibilityLabel).toBe('Deutsch');
  });

  it('switches to the language chosen, and closes', async () => {
    const onClose = jest.fn();
    const view = render(<LanguagePicker visible onClose={onClose} />);

    const french = options(view).find((node: any) => node.props.accessibilityLabel === 'Français');
    await act(async () => {
      french!.props.onPress();
    });

    expect(setStoredLanguage).toHaveBeenCalledWith('fr');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('closes on a tap outside the card', () => {
    const onClose = jest.fn();
    const view = render(<LanguagePicker visible onClose={onClose} />);

    press(view, 'language-picker');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open on a tap on the card itself', () => {
    const onClose = jest.fn();
    const view = render(<LanguagePicker visible onClose={onClose} />);

    const card = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'language-picker-card' && typeof node.props.onPress === 'function');
    card[card.length - 1].props.onPress({ stopPropagation: jest.fn() });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('covers the whole screen', () => {
    const view = render(<LanguagePicker visible onClose={jest.fn()} />);

    const style = StyleSheet.flatten(byTestId(view, 'language-picker')[0].props.style);

    expect(style.position).toBe('absolute');
    expect([style.top, style.left, style.right, style.bottom]).toEqual([0, 0, 0, 0]);
  });

  it('takes the journey bar away while it is open, and gives it back once closed', () => {
    const seen: boolean[] = [];
    function Probe() {
      seen.push(useJourneyBarCovered());
      return null;
    }

    const view = render(
      <JourneyBarCoverProvider>
        <LanguagePicker visible onClose={jest.fn()} />
        <Probe />
      </JourneyBarCoverProvider>
    );
    expect(seen[seen.length - 1]).toBe(true);

    view.rerender(
      <JourneyBarCoverProvider>
        <LanguagePicker visible={false} onClose={jest.fn()} />
        <Probe />
      </JourneyBarCoverProvider>
    );

    expect(seen[seen.length - 1]).toBe(false);
  });
});
