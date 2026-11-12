import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { LANGUAGE_PANEL } from '@/components/stories/language-panel';
import { AUDIO_PANEL, AudioSettings, AudioSettingsPanel, audioPanelLayout, type AudioChannel } from '@/components/ui/audio-settings-panel';
import { MENU_INK } from '@/components/stories/reader-menu';
const mockSound = jest.fn();
jest.mock('@/contexts/global-sound-context', () => ({
  useGlobalSound: () => mockSound(),
}));

const A = AUDIO_PANEL;
const PHONE = { screen: { width: 874, height: 402 }, insets: { top: 0, bottom: 21, left: 59, right: 59 } };
const TABLET = { screen: { width: 1180, height: 820 }, insets: { top: 24, bottom: 20, left: 0, right: 0 } };

function channels(levels: [number, number, number] = [0.8, 0.5, 1]): AudioChannel[] {
  return [
    { id: 'master', label: 'Master Volume', value: levels[0], onChange: jest.fn() },
    { id: 'music', label: 'Music', value: levels[1], onChange: jest.fn() },
    { id: 'voice', label: 'Voice Over', value: levels[2], onChange: jest.fn() },
  ];
}

function props(overrides: Partial<React.ComponentProps<typeof AudioSettingsPanel>> = {}): React.ComponentProps<typeof AudioSettingsPanel> {
  return {
    visible: true,
    screen: TABLET.screen,
    insets: TABLET.insets,
    reduceMotion: true,
    title: 'Audio Settings',
    doneLabel: 'Done',
    muteLabel: 'Mute',
    unmuteLabel: 'Unmute',
    channels: channels(),
    onClose: jest.fn(),
    ...overrides,
  };
}

const find = (root: ReactTestInstance, id: string) => root.findAll((node) => node.props.testID === id);
const styled = (root: ReactTestInstance, id: string) => {
  const found = root.findAll((node) => node.props.testID === id && node.props.style !== undefined);
  return StyleSheet.flatten(found[found.length - 1].props.style);
};
const said = (root: ReactTestInstance, id: string): string => {
  const words = (node: ReactTestInstance | string): string => (typeof node === 'string' ? node : node.children.map(words).join(''));
  return words(find(root, id)[0]);
};
const pressable = (root: ReactTestInstance, id: string) => root.findAll((node) => node.props.testID === id && typeof node.props.onPress === 'function')[0];

describe('audioPanelLayout', () => {
  it.each([
    ['a phone on its side', PHONE],
    ['a tablet on its side', TABLET],
    ['a tablet upright', { screen: { width: 820, height: 1180 }, insets: TABLET.insets }],
  ])('on %s it keeps the painted frame`s shape and sits in the middle of the safe area', (_name, { screen, insets }) => {
    const underTest = audioPanelLayout(screen, insets);

    expect(underTest.width / underTest.height).toBeCloseTo(A.width / A.height, 5);
    expect(underTest.left).toBeGreaterThanOrEqual(insets.left);
    expect(underTest.top).toBeGreaterThanOrEqual(insets.top);
    expect(underTest.left + underTest.width).toBeLessThanOrEqual(screen.width - insets.right);
    expect(underTest.top + underTest.height).toBeLessThanOrEqual(screen.height - insets.bottom);
    expect(underTest.left - insets.left).toBeCloseTo(screen.width - insets.right - underTest.left - underTest.width, 5);
    expect(underTest.top - insets.top).toBeCloseTo(screen.height - insets.bottom - underTest.top - underTest.height, 5);
  });

  it('is never wider than the language panel is allowed to be', () => {
    expect(audioPanelLayout(TABLET.screen, TABLET.insets).width).toBeLessThanOrEqual(LANGUAGE_PANEL.width * LANGUAGE_PANEL.maxScale + 0.01);
  });

  it('grows its words with the text size, as far as the language panel lets its own grow', () => {
    const plain = audioPanelLayout(TABLET.screen, TABLET.insets, 1);
    const larger = audioPanelLayout(TABLET.screen, TABLET.insets, 2);

    expect(larger.scale * larger.text).toBeCloseTo(plain.scale * LANGUAGE_PANEL.largestText, 5);
  });

  it('is nothing on a screen not yet measured', () => {
    expect(audioPanelLayout({ width: 0, height: 0 }, TABLET.insets).scale).toBe(0);
  });
});

describe('AudioSettingsPanel', () => {
  const place = audioPanelLayout(TABLET.screen, TABLET.insets);
  const u = (units: number) => units * place.scale;

  it('paints its own frame across the whole panel', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);

    expect(styled(UNSAFE_root, 'audio-panel-art')).toEqual(expect.objectContaining({ width: place.width, height: place.height }));
  });

  it('heads itself in the language panel`s title style, centred under the crest', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);
    const box = styled(UNSAFE_root, 'audio-panel-heading');

    const title = styled(UNSAFE_root, 'audio-panel-title');
    expect(said(UNSAFE_root, 'audio-panel-title')).toBe('Audio Settings');
    expect(title.color).toBe(MENU_INK);
    expect(title.fontWeight).toBe('800');
    expect(title.fontSize).toBeCloseTo(u(A.title.size) * place.text, 5);
    expect(box.left + box.width / 2).toBeCloseTo(u(A.crest), 5);
  });

  it('sits the title in the band between the crest and the first card, clear of both', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);
    const box = styled(UNSAFE_root, 'audio-panel-heading');
    const centre = (box.top + box.height / 2) / place.scale;

    expect(centre).toBeCloseTo((A.crestFoot + A.cards[0]) / 2, 0);
    expect(centre - (A.title.size * 0.72) / 2).toBeGreaterThan(A.crestFoot);
  });

  it('has no close coin; Done and the page around it close it', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);

    expect(find(UNSAFE_root, 'audio-panel-close')).toHaveLength(0);
  });

  it('centres the cards and Done on the frame`s own middle', () => {
    expect((A.card.left + A.card.right) / 2).toBeCloseTo(A.width / 2, 0);
    expect(A.done.left + A.done.width / 2).toBeCloseTo(A.width / 2, 0);
  });

  it('spaces the three cards evenly', () => {
    expect(A.cards[1] - A.cards[0]).toBeCloseTo(A.cards[2] - A.cards[1], 5);
  });

  it('ends the level and the slider before the leaf on each card', () => {
    expect(A.level.right).toBeLessThanOrEqual(A.leaf);
    expect(A.slider.right).toBeLessThanOrEqual(A.leaf);
  });

  it.each([
    ['Done', 'audio-panel-done'],
    ['the page around it', 'audio-panel-backdrop'],
  ])('closes from %s', (_name, id) => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ onClose })} />);

    fireEvent.press(pressable(UNSAFE_root, id));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('draws Done narrower than the cards, centred under them', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);

    const done = styled(UNSAFE_root, 'audio-panel-done');
    expect(done.width).toBeCloseTo(u(A.done.width), 5);
    expect(A.done.width).toBeLessThanOrEqual((A.card.right - A.card.left) * 0.4);
    expect(done.left + done.width / 2).toBeCloseTo(u(A.width / 2), 5);
  });

  it('sinks Done into its lip and shrinks it a touch while it is held, and lets it back up after', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);
    const done = pressable(UNSAFE_root, 'audio-panel-done');
    const face = () => StyleSheet.flatten(UNSAFE_root.findAll((node) => node.props.testID === 'audio-panel-done-face')[0].props.style);
    const rest = { button: styled(UNSAFE_root, 'audio-panel-done'), face: face() };

    act(() => { fireEvent(done, 'pressIn'); });
    const held = { button: styled(UNSAFE_root, 'audio-panel-done'), face: face() };
    act(() => { fireEvent(done, 'pressOut'); });

    expect(rest.button.transform).toBeUndefined();
    expect(held.button.transform).toEqual([{ scale: expect.any(Number) }]);
    expect(held.button.transform[0].scale).toBeLessThan(1);
    expect(held.face.transform).toEqual([{ translateY: expect.any(Number) }]);
    expect(held.face.transform[0].translateY).toBeGreaterThan(0);
    expect(styled(UNSAFE_root, 'audio-panel-done').transform).toBeUndefined();
  });

  it('says Done in the words it is given', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);

    expect(said(UNSAFE_root, 'audio-panel-done-label')).toBe('Done');
  });

  it('draws nothing while it is shut', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ visible: false })} />);

    expect(find(UNSAFE_root, 'audio-panel')).toHaveLength(0);
  });

  it.each([
    ['master', 'Master Volume', '80%'],
    ['music', 'Music', '50%'],
    ['voice', 'Voice Over', '100%'],
  ])('names the %s row in the panel`s ink and shows its level', (id, label, level) => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);

    expect(said(UNSAFE_root, `audio-panel-label-${id}`)).toBe(label);
    expect(said(UNSAFE_root, `audio-panel-level-${id}`)).toBe(level);
    expect(styled(UNSAFE_root, `audio-panel-label-${id}`).color).toBe(MENU_INK);
    expect(styled(UNSAFE_root, `audio-panel-level-${id}`).color).toBe(MENU_INK);
  });

  it.each([0, 1, 2])('puts row %i`s icon in the middle of its painted slot', (row) => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);
    const id = channels()[row].id;

    const icon = styled(UNSAFE_root, `audio-panel-button-${id}`);
    expect(icon.left + icon.width / 2).toBeCloseTo(u(A.slot.x), 5);
    expect(icon.top + icon.height / 2).toBeCloseTo(u(A.cards[row] + A.card.height / 2), 5);
  });

  it('lays each slider along its card, past the button', () => {
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props()} />);

    const slider = UNSAFE_root.findAll((node) => node.props.testID === 'audio-panel-slider-music' && typeof node.props.onValueChange === 'function')[0];
    expect(slider.props.value).toBe(0.5);
    expect(slider.props.width).toBeCloseTo(u(A.slider.right - A.slider.left), 5);
  });

  it('hands a slider`s change back to its own channel', () => {
    const given = channels();
    const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ channels: given })} />);
    const slider = UNSAFE_root.findAll((node) => node.props.testID === 'audio-panel-slider-music' && typeof node.props.onValueChange === 'function')[0];

    slider.props.onValueChange(0.25);

    expect(given[1].onChange).toHaveBeenCalledWith(0.25);
    expect(given[0].onChange).not.toHaveBeenCalled();
  });

  describe('the round buttons', () => {
    it('mute their channel when it is playing', () => {
      const given = channels();
      const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ channels: given })} />);

      fireEvent.press(pressable(UNSAFE_root, 'audio-panel-button-music'));

      expect(given[1].onChange).toHaveBeenCalledWith(0);
      expect(given[0].onChange).not.toHaveBeenCalled();
    });

    it('bring a muted channel back to the level it had', () => {
      const given = channels();
      const view = render(<AudioSettingsPanel {...props({ channels: given })} />);
      fireEvent.press(pressable(view.UNSAFE_root, 'audio-panel-button-music'));
      const muted = channels([0.8, 0, 1]);
      muted[1].onChange = given[1].onChange;
      view.rerender(<AudioSettingsPanel {...props({ channels: muted })} />);

      fireEvent.press(pressable(view.UNSAFE_root, 'audio-panel-button-music'));

      expect(given[1].onChange).toHaveBeenLastCalledWith(0.5);
    });

    it('bring a channel that was already silent back at full', () => {
      const given = channels([0.8, 0, 1]);
      const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ channels: given })} />);

      fireEvent.press(pressable(UNSAFE_root, 'audio-panel-button-music'));

      expect(given[1].onChange).toHaveBeenCalledWith(1);
    });

    it('remember a level the slider set before muting', () => {
      const given = channels();
      const view = render(<AudioSettingsPanel {...props({ channels: given })} />);
      const moved = channels([0.8, 0.3, 1]);
      moved[1].onChange = given[1].onChange;
      view.rerender(<AudioSettingsPanel {...props({ channels: moved })} />);
      fireEvent.press(pressable(view.UNSAFE_root, 'audio-panel-button-music'));
      const muted = channels([0.8, 0, 1]);
      muted[1].onChange = given[1].onChange;
      view.rerender(<AudioSettingsPanel {...props({ channels: muted })} />);

      act(() => {
        fireEvent.press(pressable(view.UNSAFE_root, 'audio-panel-button-music'));
      });

      expect(given[1].onChange).toHaveBeenLastCalledWith(0.3);
    });

    it('bring back the level from before the slider was dragged down to nothing', () => {
      const given = channels();
      const view = render(<AudioSettingsPanel {...props({ channels: given })} />);
      const moved = channels([0.8, 0.3, 1]);
      moved[1].onChange = given[1].onChange;
      view.rerender(<AudioSettingsPanel {...props({ channels: moved })} />);
      const dragged = channels([0.8, 0, 1]);
      dragged[1].onChange = given[1].onChange;
      view.rerender(<AudioSettingsPanel {...props({ channels: dragged })} />);

      fireEvent.press(pressable(view.UNSAFE_root, 'audio-panel-button-music'));

      expect(given[1].onChange).toHaveBeenLastCalledWith(0.3);
    });

    it('show a muted channel as off', () => {
      const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ channels: channels([0.8, 0, 1]) })} />);

      expect(find(UNSAFE_root, 'audio-panel-off-music')).not.toHaveLength(0);
      expect(find(UNSAFE_root, 'audio-panel-off-master')).toHaveLength(0);
      expect(styled(UNSAFE_root, 'audio-panel-icon-music').opacity).toBeLessThan(1);
      expect(styled(UNSAFE_root, 'audio-panel-icon-master').opacity ?? 1).toBe(1);
    });

    it('say what they will do, for VoiceOver', () => {
      const { UNSAFE_root } = render(<AudioSettingsPanel {...props({ channels: channels([0.8, 0, 1]) })} />);

      expect(pressable(UNSAFE_root, 'audio-panel-button-master').props.accessibilityLabel).toBe('Mute Master Volume');
      expect(pressable(UNSAFE_root, 'audio-panel-button-music').props.accessibilityLabel).toBe('Unmute Music');
    });
  });
});

describe('AudioSettings', () => {
  const RN = require('react-native');
  const RealModal = RN.Modal;
  const MockModal = ({ visible, children, onRequestClose }: { visible: boolean; children: React.ReactNode; onRequestClose: () => void }) =>
    React.createElement(RN.View, { testID: 'audio-settings-window', visible, onRequestCloseForTest: onRequestClose }, visible ? children : null);
  let dimensions: jest.SpyInstance;
  const sound = {
    masterVolume: 0.8,
    musicVolume: 0.5,
    voiceOverVolume: 1,
    setMasterVolume: jest.fn(),
    setMusicVolume: jest.fn(),
    setVoiceOverVolume: jest.fn(),
  };

  beforeAll(() => {
    RN.Modal = MockModal;
  });

  afterAll(() => {
    RN.Modal = RealModal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSound.mockReturnValue(sound);
    dimensions = jest.spyOn(RN.Dimensions, 'get').mockReturnValue({ width: 1180, height: 820, scale: 2, fontScale: 1 });
  });

  afterEach(() => {
    dimensions.mockRestore();
  });

  it('shows the volumes the app holds, under their names', () => {
    const { UNSAFE_root } = render(<AudioSettings visible onClose={jest.fn()} presentation="overlay" />);

    expect(said(UNSAFE_root, 'audio-panel-title')).toBe('audioSettings.title');
    expect(said(UNSAFE_root, 'audio-panel-label-master')).toBe('audioSettings.masterVolume');
    expect(said(UNSAFE_root, 'audio-panel-level-master')).toBe('80%');
    expect(said(UNSAFE_root, 'audio-panel-level-music')).toBe('50%');
    expect(said(UNSAFE_root, 'audio-panel-level-voice')).toBe('100%');
  });

  it.each([
    ['master', 'setMasterVolume'],
    ['music', 'setMusicVolume'],
    ['voice', 'setVoiceOverVolume'],
  ] as const)('hands the %s slider`s change to the app`s sound settings', (id, setter) => {
    const { UNSAFE_root } = render(<AudioSettings visible onClose={jest.fn()} presentation="overlay" />);
    const slider = UNSAFE_root.findAll((node) => node.props.testID === `audio-panel-slider-${id}` && typeof node.props.onValueChange === 'function')[0];

    slider.props.onValueChange(0.25);

    expect(sound[setter]).toHaveBeenCalledWith(0.25);
  });

  it('mutes a channel with its round button through the app`s sound settings', () => {
    const { UNSAFE_root } = render(<AudioSettings visible onClose={jest.fn()} presentation="overlay" />);

    fireEvent.press(pressable(UNSAFE_root, 'audio-panel-button-music'));

    expect(sound.setMusicVolume).toHaveBeenCalledWith(0);
  });

  it('closes with Done', () => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(<AudioSettings visible onClose={onClose} presentation="overlay" />);

    fireEvent.press(pressable(UNSAFE_root, 'audio-panel-done'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens in a window over the whole screen unless the page holds it itself', () => {
    const { UNSAFE_root } = render(<AudioSettings visible onClose={jest.fn()} />);

    const window = find(UNSAFE_root, 'audio-settings-window')[0];
    expect(window.props.visible).toBe(true);
    expect(window.findAll((node) => node.props.testID === 'audio-panel')).not.toHaveLength(0);
  });

  it('closes its window from Android back', () => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(<AudioSettings visible onClose={onClose} />);

    find(UNSAFE_root, 'audio-settings-window')[0].props.onRequestCloseForTest();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows no window while shut', () => {
    const { UNSAFE_root } = render(<AudioSettings visible={false} onClose={jest.fn()} />);

    expect(find(UNSAFE_root, 'audio-settings-window')[0].props.visible).toBe(false);
  });

  it('inside a page that holds it, opens in place, with no window of its own', () => {
    const { UNSAFE_root } = render(<AudioSettings visible onClose={jest.fn()} presentation="overlay" />);

    expect(find(UNSAFE_root, 'audio-settings-window')).toHaveLength(0);
    expect(find(UNSAFE_root, 'audio-panel')).not.toHaveLength(0);
  });
});
