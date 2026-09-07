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
  ReadyBackdrop,
  ProfilePage,
  AGE_RANGE_OPTIONS,
  AVATAR_OPTIONS,
} from '@/components/onboarding/onboarding-pages';
import { MIN_NICKNAME_LENGTH, MAX_NICKNAME_LENGTH } from '@/constants/profile';
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

/** The panel now runs the full padded width, the way the together chips do, and its cells and art scale with it. */
describe('SafetyPage grid', () => {
  function flat(style: unknown): any {
    return [style].flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
  }

  it('keeps the panel just inside the together chip row rather than matching it', () => {
    const tree = render(<SafetyPage />);

    // the grid is the one wrapping row whose width is a share of the page
    const grid = tree.UNSAFE_root.findAll((n: any) => {
      const style = flat(n.props.style);
      return style.flexWrap === 'wrap' && typeof style.width === 'string' && style.width.endsWith('%');
    })[0];

    expect(grid).toBeTruthy();
    const width = parseFloat(grid.props.style && flat(grid.props.style).width);

    expect(width).toBeLessThanOrEqual(84);
    expect(width).toBeGreaterThanOrEqual(72);
  });

  it('gives each cell room for its chip and two lines of label, clear of each other', () => {
    const tree = render(<SafetyPage />);

    const cell = findByTestId(tree, 'safety-item-noAds')[0];

    const height = flat(cell.props.style).height;

    expect(height).toBeGreaterThanOrEqual(120);
    expect(height).toBeLessThanOrEqual(155);
  });

  /**
   * The promise art is a starfield tile with the glyph about a third of its
   * width, so a tile scaled to cover the cell always draws the glyph at the
   * same fraction of that cell -- shrinking the cell alone never shrinks the
   * icon. It is drawn to a fixed size instead, well inside the cell.
   */
  it('draws the promise glyph to a fixed size rather than covering the cell', () => {
    const tree = render(<SafetyPage />);

    const art = findByTestId(tree, 'safety-art-noAds')[0];
    const style = flat(art.props.style);

    expect(typeof style.width).toBe('number');
    expect(style.width).toBeGreaterThanOrEqual(100);
    expect(style.width).toBeLessThanOrEqual(130);
    expect(style.height).toBe(style.width);
    expect(art.props.resizeMode).toBe('contain');
  });

  /** Bigger cells carry the label at the same size as the chip labels opposite. */
  it('sets the promise labels in the same 13pt as the together chip labels', () => {
    const tree = render(<SafetyPage />);

    const label = tree.UNSAFE_root.findAll(
      (n: any) => n.props.children === 'onboardingV2.safe.noAds'
    )[0];

    expect(label).toBeTruthy();
    expect(flat(label.props.style).fontSize).toBe(13);
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

  it('does not render the hero itself -the shell places it as a full-bleed backdrop', () => {
    const tree = render(<ReadyPage />);

    expect(findByTestId(tree, 'ready-hero')).toHaveLength(0);
  });
});

describe('ReadyBackdrop', () => {
  it('renders the full-bleed hero illustration', () => {
    const tree = render(<ReadyBackdrop />);

    expect(findByTestId(tree, 'ready-hero').length).toBeGreaterThan(0);
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

  it('only ticks the nickname once it reaches the minimum length', () => {
    const short = 'a'.repeat(MIN_NICKNAME_LENGTH - 1);

    expect(
      findByTestId(render(<ProfilePage {...defaultProps} nickname={short} />), 'profile-nickname-valid')
    ).toHaveLength(0);
    expect(
      findByTestId(
        render(<ProfilePage {...defaultProps} nickname={short + 'a'} />),
        'profile-nickname-valid'
      ).length
    ).toBeGreaterThan(0);
  });

  // the literal is deliberate: asserting against the constant the component
  // reads would pass no matter what that constant became
  it('caps the nickname field at 14 characters', () => {
    const tree = render(<ProfilePage {...defaultProps} />);

    expect(findByTestId(tree, 'profile-nickname-input')[0].props.maxLength).toBe(14);
    expect(MAX_NICKNAME_LENGTH).toBe(14);
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
