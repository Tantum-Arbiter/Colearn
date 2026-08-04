/**
 * Tests for the onboarding page content blocks that make up the redesigned
 * five-page intro (worlds / together / safety / ready) plus the profile setup.
 *
 * Key behaviors tested:
 * 1. Each page renders every item from its design
 * 2. Copy comes from translation keys, not hardcoded English
 * 3. The profile page reports avatar, nickname and age-range changes
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  TogetherPage,
  TogetherBackdrop,
  SafetyPage,
  SafetyBackdrop,
  ReadyPage,
  ProfilePage,
  AGE_RANGE_OPTIONS,
  AVATAR_OPTIONS,
} from '@/components/onboarding/onboarding-pages';
import { SUPPORTED_LANGUAGES } from '@/services/i18n';

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

describe('TogetherPage', () => {
  it.each(['read', 'play', 'talk'])('renders the %s chip', (key) => {
    const tree = render(<TogetherPage />);

    expect(findByTestId(tree, `together-chip-${key}`)).toHaveLength(1);
  });

  it.each(['read', 'play', 'talk'])('renders the %s icon art', (key) => {
    const tree = render(<TogetherPage />);

    expect(findByTestId(tree, `together-art-${key}`).length).toBeGreaterThan(0);
  });

  it('does not render the hero itself -the shell places it as a full-bleed backdrop', () => {
    const tree = render(<TogetherPage />);

    expect(findByTestId(tree, 'together-hero')).toHaveLength(0);
  });

  it('renders its own body copy below the chips', () => {
    expect(toStr(render(<TogetherPage />))).toContain('onboardingV2.together.body');
  });
});

describe('TogetherBackdrop', () => {
  it('renders the full-bleed hero illustration', () => {
    const tree = render(<TogetherBackdrop />);

    expect(findByTestId(tree, 'together-hero').length).toBeGreaterThan(0);
  });
});

describe('SafetyPage', () => {
  it.each(['noAds', 'noTracking', 'noPressure', 'gentle'])('renders the %s promise', (key) => {
    const tree = render(<SafetyPage />);

    expect(findByTestId(tree, `safety-item-${key}`)).toHaveLength(1);
  });

  it.each(['noAds', 'noTracking', 'noPressure', 'gentle'])('renders the %s icon art', (key) => {
    const tree = render(<SafetyPage />);

    expect(findByTestId(tree, `safety-art-${key}`).length).toBeGreaterThan(0);
  });

  it('does not render the hero itself -the shell places it as a full-bleed backdrop', () => {
    const tree = render(<SafetyPage />);

    expect(findByTestId(tree, 'safe-hero')).toHaveLength(0);
  });

  it('renders the supporting copy', () => {
    expect(toStr(render(<SafetyPage />))).toContain('onboardingV2.safe.body');
  });
});

describe('SafetyBackdrop', () => {
  it('renders the full-bleed cloud illustration', () => {
    const tree = render(<SafetyBackdrop />);

    expect(findByTestId(tree, 'safe-hero').length).toBeGreaterThan(0);
  });
});

describe('ReadyPage', () => {
  it.each(['offline', 'routines', 'parent'])('renders the %s feature', (key) => {
    const tree = render(<ReadyPage />);

    expect(findByTestId(tree, `ready-item-${key}`)).toHaveLength(1);
  });

  it('renders a description for each feature', () => {
    const s = toStr(render(<ReadyPage />));

    expect(s).toContain('onboardingV2.ready.offlineDesc');
    expect(s).toContain('onboardingV2.ready.routinesDesc');
    expect(s).toContain('onboardingV2.ready.parentDesc');
  });
});

describe('ProfilePage', () => {
  const defaultProps = {
    nickname: '',
    onNicknameChange: jest.fn(),
    avatarKey: 'bear',
    onAvatarKeyChange: jest.fn(),
    ageMonths: 36,
    onAgeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders every avatar option', () => {
    const tree = render(<ProfilePage {...defaultProps} />);

    AVATAR_OPTIONS.forEach((option) => {
      expect(findByTestId(tree, `avatar-option-${option.key}`).length).toBeGreaterThan(0);
    });
  });

  it('shows the selected avatar as the hero', () => {
    const tree = render(<ProfilePage {...defaultProps} avatarKey="fox" />);

    expect(findByTestId(tree, 'avatar-hero-fox').length).toBeGreaterThan(0);
  });

  it('steps through avatars with the chevrons', () => {
    const tree = render(<ProfilePage {...defaultProps} avatarKey="bear" />);

    fireEvent.press(findByTestId(tree, 'avatar-next')[0]);
    expect(defaultProps.onAvatarKeyChange).toHaveBeenCalledWith('rabbit');

    fireEvent.press(findByTestId(tree, 'avatar-prev')[0]);
    expect(defaultProps.onAvatarKeyChange).toHaveBeenCalledWith('elephant');
  });

  it('reports nickname changes', () => {
    const tree = render(<ProfilePage {...defaultProps} />);

    fireEvent.changeText(findByTestId(tree, 'profile-nickname-input')[0], 'Freya');

    expect(defaultProps.onNicknameChange).toHaveBeenCalledWith('Freya');
  });

  it('reports avatar changes', () => {
    const tree = render(<ProfilePage {...defaultProps} />);

    fireEvent.press(findByTestId(tree, 'avatar-option-dino')[0]);

    expect(defaultProps.onAvatarKeyChange).toHaveBeenCalledWith('dino');
  });

  it.each(AGE_RANGE_OPTIONS.map((o) => [o.key, o.months] as const))(
    'reports the %s age range as %i months',
    (key, months) => {
      const tree = render(<ProfilePage {...defaultProps} />);

      fireEvent.press(findByTestId(tree, 'age-select')[0]);
      fireEvent.press(findByTestId(tree, `age-option-${key}`)[0]);

      expect(defaultProps.onAgeChange).toHaveBeenCalledWith(months);
    }
  );

  it('marks the selected age range', () => {
    const tree = render(<ProfilePage {...defaultProps} ageMonths={60} />);

    fireEvent.press(findByTestId(tree, 'age-select')[0]);
    const selected = findByTestId(tree, 'age-option-4-6')[0];

    expect(selected.props.accessibilityState).toEqual({ selected: true });
  });

  it('keeps the option list closed until the field is tapped', () => {
    const tree = render(<ProfilePage {...defaultProps} />);

    expect(findByTestId(tree, 'age-options')).toHaveLength(0);

    fireEvent.press(findByTestId(tree, 'age-select')[0]);

    expect(findByTestId(tree, 'age-options').length).toBeGreaterThan(0);
  });

  it('offers every supported language', () => {
    const tree = render(<ProfilePage {...defaultProps} />);

    fireEvent.press(findByTestId(tree, 'language-select')[0]);

    SUPPORTED_LANGUAGES.forEach((lang) => {
      expect(findByTestId(tree, `language-option-${lang.code}`).length).toBeGreaterThan(0);
    });
  });

  it('marks the selected avatar', () => {
    const tree = render(<ProfilePage {...defaultProps} avatarKey="dino" />);

    const selected = findByTestId(tree, 'avatar-option-dino')[0];

    expect(selected.props.accessibilityState).toEqual({ selected: true });
  });
});
