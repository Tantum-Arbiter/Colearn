import React from 'react';
import { StyleSheet } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { withTiming } from 'react-native-reanimated';
import {
  LANGUAGE_PANEL,
  LANGUAGE_PANEL_MOTION,
  LANGUAGE_PILL,
  LanguagePanel,
  languagePanelLayout,
  type LanguageChoice,
  type LanguageMark,
} from '@/components/stories/language-panel';

const P = LANGUAGE_PANEL;
const PITCH = P.pill.height + P.pill.rowGap;
const FIXED = P.top + P.bottom;
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
const PHONE = { screen: { width: 874, height: 402 }, insets: { top: 0, bottom: 21, left: 59, right: 59 } };
const TABLET = { screen: { width: 820, height: 1180 }, insets: { top: 24, bottom: 20, left: 0, right: 0 } };

const LANGUAGES: LanguageChoice[] = ['en', 'pl', 'es', 'de', 'fr', 'it', 'pt', 'ar', 'tr', 'nl', 'da', 'la', 'ja', 'zh'].map((code) => ({
  code,
  name: `Name ${code}`,
  flag: `flag-${code}`,
}));

describe('languagePanelLayout', () => {
  const cases = [
    ['a phone on its side, beside the island', { width: 874, height: 402 }, { top: 0, bottom: 21, left: 59, right: 59 }],
    ['a small phone on its side', { width: 667, height: 375 }, NO_INSETS],
    ['a short Android phone on its side', { width: 640, height: 360 }, { top: 0, bottom: 0, left: 24, right: 0 }],
    ['a tablet upright', { width: 820, height: 1180 }, { top: 24, bottom: 20, left: 0, right: 0 }],
    ['a tablet on its side', { width: 1180, height: 820 }, { top: 24, bottom: 20, left: 0, right: 0 }],
  ] as const;

  it.each(cases)('on %s the panel keeps the picture`s shape and stays inside the safe area', (_name, screen, insets) => {
    const underTest = languagePanelLayout(screen, insets, 14);

    expect(underTest.width).toBeCloseTo(P.width * underTest.scale, 5);
    expect(underTest.height).toBeCloseTo((FIXED + underTest.list / underTest.scale) * underTest.scale, 5);
    expect(underTest.left).toBeGreaterThanOrEqual(insets.left);
    expect(underTest.left + underTest.width).toBeLessThanOrEqual(screen.width - insets.right);
    expect(underTest.top).toBeGreaterThanOrEqual(insets.top);
    expect(underTest.top + underTest.height).toBeLessThanOrEqual(screen.height - insets.bottom);
  });

  it.each(cases)('on %s it sits in the middle of the room the safe area leaves', (_name, screen, insets) => {
    const underTest = languagePanelLayout(screen, insets, 14);

    expect(underTest.left - insets.left).toBeCloseTo(screen.width - insets.right - underTest.left - underTest.width, 5);
    expect(underTest.top - insets.top).toBeCloseTo(screen.height - insets.bottom - underTest.top - underTest.height, 5);
  });

  it.each(cases.slice(0, 3))('on %s fourteen languages show three whole lines and the top of a fourth, and the list scrolls', (_name, screen, insets) => {
    const underTest = languagePanelLayout(screen, insets, 14);

    expect(underTest.scrolls).toBe(true);
    expect(underTest.rows).toBe(3);
    expect(underTest.list / underTest.scale).toBeCloseTo(P.list.padTop + 3 * PITCH + P.peek, 5);
  });

  it.each(cases.slice(3))('on %s all five lines of fourteen languages show at once, with nothing to scroll', (_name, screen, insets) => {
    const underTest = languagePanelLayout(screen, insets, 14);

    expect(underTest.scrolls).toBe(false);
    expect(underTest.rows).toBe(5);
    expect(underTest.list / underTest.scale).toBeCloseTo(P.list.padTop + 5 * P.pill.height + 4 * P.pill.rowGap + P.list.padBottom, 5);
    expect(underTest.scale).toBe(P.maxScale);
  });

  it('on a phone nine languages are made a little smaller to fit rather than scrolled, as in the drawing', () => {
    const underTest = languagePanelLayout(PHONE.screen, PHONE.insets, 9);

    expect(underTest.scrolls).toBe(false);
    expect(underTest.rows).toBe(3);
    expect(underTest.list / underTest.scale).toBeCloseTo(P.middle, 5);
    expect(underTest.scale * P.pill.height).toBeGreaterThanOrEqual(P.smallestPill);
  });

  it.each([
    ['a narrow window, as a tablet sharing its screen', { width: 500, height: 900 }],
    ['a phone held upright', { width: 402, height: 874 }],
    ['a small window both narrow and short', { width: 300, height: 400 }],
  ])('in %s every language shows, small, rather than scrolling in a list with room to spare', (_name, screen) => {
    const underTest = languagePanelLayout(screen, NO_INSETS, 14);

    expect(underTest.scrolls).toBe(false);
    expect(underTest.rows).toBe(5);
    expect(underTest.left).toBeCloseTo(P.margin.x, 5);
    expect(underTest.width).toBeCloseTo(screen.width - P.margin.x * 2, 5);
  });

  it('where fourteen languages fit with only a little shrinking, they are shrunk to fit and not scrolled', () => {
    const underTest = languagePanelLayout({ width: 700, height: 520 }, NO_INSETS, 14);

    expect(underTest.scrolls).toBe(false);
    expect(underTest.rows).toBe(5);
    expect(underTest.height).toBeCloseTo(520 - P.margin.y * 2, 5);
    expect(underTest.scale * P.pill.height).toBeGreaterThanOrEqual(P.smallestPill);
  });

  it.each([
    [{ width: 874, height: 402 }],
    [{ width: 600, height: 432 }],
    [{ width: 760, height: 430 }],
    [{ width: 1000, height: 440 }],
  ])('while it scrolls (%p) at least one line is always left to scroll to', (screen) => {
    const underTest = languagePanelLayout(screen, NO_INSETS, 14);

    expect(underTest.scrolls).toBe(true);
    expect(underTest.rows).toBeGreaterThanOrEqual(3);
    expect(underTest.rows).toBeLessThan(5);
  });

  it('keeps a little air above and below when the height is what limits it', () => {
    const underTest = languagePanelLayout(PHONE.screen, PHONE.insets, 14);

    expect(underTest.top).toBeCloseTo(PHONE.insets.top + P.margin.y, 5);
    expect(underTest.top + underTest.height).toBeCloseTo(PHONE.screen.height - PHONE.insets.bottom - P.margin.y, 5);
  });

  it.each([[9], [7], [3], [1]])('%p languages never scroll, however short the screen', (count) => {
    const underTest = languagePanelLayout({ width: 640, height: 280 }, NO_INSETS, count);

    expect(underTest.scrolls).toBe(false);
    expect(underTest.rows).toBe(Math.ceil(count / 3));
    expect(underTest.top + underTest.height).toBeLessThanOrEqual(280);
  });

  it('where the width leaves room for it, a fourth whole line shows before the list scrolls', () => {
    const underTest = languagePanelLayout({ width: 600, height: 432 }, NO_INSETS, 14);

    expect(underTest.scrolls).toBe(true);
    expect(underTest.rows).toBe(4);
    expect(underTest.list / underTest.scale).toBeCloseTo(P.list.padTop + 4 * PITCH + P.peek, 5);
    expect(underTest.top + underTest.height).toBeLessThanOrEqual(432);
  });

  it.each(cases)('on %s a language is never smaller than a finger can press', (_name, screen, insets) => {
    const underTest = languagePanelLayout(screen, insets, 14);

    expect(underTest.scale * P.pill.height).toBeGreaterThanOrEqual(38);
  });

  it.each([
    [1, 1],
    [1.15, 1.15],
    [1.3, 1.3],
    [2, 1.3],
    [0.85, 1],
  ])('with the text size at %p a tablet draws the panel %p times as big', (textScale, grown) => {
    const underTest = languagePanelLayout({ width: 1180, height: 1366 }, NO_INSETS, 14, textScale);

    expect(underTest.scale).toBeCloseTo(P.maxScale * grown, 5);
  });

  it.each([
    ['a phone on its side, where the panel cannot grow', PHONE.screen, PHONE.insets],
    ['a tablet upright, where it can grow only a little', TABLET.screen, TABLET.insets],
    ['a big tablet, where it grows all the way', { width: 1180, height: 1366 }, NO_INSETS],
  ])('on %s the words make up whatever the larger text size asks that the panel could not give', (_name, screen, insets) => {
    const plain = languagePanelLayout(screen, insets, 14, 1);

    for (const textScale of [1, 1.15, 1.3]) {
      const underTest = languagePanelLayout(screen, insets, 14, textScale);
      expect(underTest.scale * underTest.text).toBeCloseTo(plain.scale * textScale, 5);
      expect(underTest.text).toBeGreaterThanOrEqual(1);
    }
    expect(plain.text).toBe(1);
  });

  it('on a phone on its side the largest text size makes the words 1.3 times as big and leaves the panel alone', () => {
    const plain = languagePanelLayout(PHONE.screen, PHONE.insets, 14, 1);
    const underTest = languagePanelLayout(PHONE.screen, PHONE.insets, 14, 1.3);

    expect(underTest.scale).toBeCloseTo(plain.scale, 5);
    expect(underTest.text).toBeCloseTo(1.3, 5);
  });

  it('never grows past the screen, whatever the text size', () => {
    const underTest = languagePanelLayout(TABLET.screen, TABLET.insets, 14, 1.3);

    expect(underTest.width).toBeLessThanOrEqual(TABLET.screen.width);
  });

  it.each([
    [{ width: 0, height: 0 }],
    [{ width: 874, height: 0 }],
    [{ width: 0, height: 402 }],
  ])('draws nothing on a screen not yet measured (%p)', (screen) => {
    expect(languagePanelLayout(screen, NO_INSETS, 14).scale).toBe(0);
  });

  it('with no languages at all it still has a size', () => {
    const underTest = languagePanelLayout(TABLET.screen, TABLET.insets, 0);

    expect(underTest.rows).toBe(0);
    expect(underTest.scrolls).toBe(false);
    expect(underTest.scale).toBeGreaterThan(0);
  });
});

const find = (root: ReactTestInstance, test: (node: ReactTestInstance) => boolean) => root.findAll(test);
const styled = (root: ReactTestInstance, id: string) => {
  const found = find(root, (node) => node.props.testID === id && node.props.style !== undefined);
  return StyleSheet.flatten(found[found.length - 1].props.style);
};
const has = (root: ReactTestInstance, id: string) => find(root, (node) => node.props.testID === id).length > 0;
const pressable = (root: ReactTestInstance, id: string) => find(root, (node) => node.props.testID === id && typeof node.props.onPress === 'function')[0];
const words = (node: ReactTestInstance): string => node.children.map((child) => (typeof child === 'string' ? child : words(child))).join('');
const said = (root: ReactTestInstance, id: string) => words(find(root, (node) => node.props.testID === id)[0]);

type Props = React.ComponentProps<typeof LanguagePanel>;
const marksOf = (reading: string, comparing: string): Record<string, LanguageMark> => ({ [reading]: 'reading', [comparing]: 'comparing' });
const props = (over: Partial<Props> = {}): Props => ({
  visible: true,
  screen: PHONE.screen,
  insets: PHONE.insets,
  reduceMotion: false,
  title: 'Compare Languages',
  hint: 'Choose languages',
  doneLabel: 'Done',
  closeLabel: 'Close',
  toggle: { on: false, label: 'OFF', onPress: jest.fn() },
  languages: LANGUAGES,
  marks: marksOf('tr', 'en'),
  onPick: jest.fn(),
  onDone: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('LanguagePanel', () => {
  it('draws nothing while it is closed', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props({ visible: false })} />);

    expect(has(UNSAFE_root, 'language-panel')).toBe(false);
  });

  it('draws nothing on a screen not yet measured', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props({ screen: { width: 0, height: 0 } })} />);

    expect(has(UNSAFE_root, 'language-panel')).toBe(false);
  });

  it('says its title, its hint and Done in the words it is given', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    expect(said(UNSAFE_root, 'language-panel-title')).toBe('Compare Languages');
    expect(said(UNSAFE_root, 'language-panel-hint')).toBe('Choose languages');
    expect(said(UNSAFE_root, 'language-panel-done-label')).toBe('Done');
  });

  it('leaves the hint out when there is none', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props({ hint: undefined })} />);

    expect(has(UNSAFE_root, 'language-panel-hint')).toBe(false);
  });

  it('with no hint under it, the heading sits lower, in the middle of the room above the languages', () => {
    const place = languagePanelLayout(PHONE.screen, PHONE.insets, LANGUAGES.length);
    const withHint = render(<LanguagePanel {...props()} />);
    const before = ['language-panel-heading', 'language-panel-toggle', 'language-panel-close'].map((id) => styled(withHint.UNSAFE_root, id).top);
    withHint.unmount();

    const alone = render(<LanguagePanel {...props({ hint: undefined })} />);
    const after = ['language-panel-heading', 'language-panel-toggle', 'language-panel-close'].map((id) => styled(alone.UNSAFE_root, id).top);

    after.forEach((top, i) => expect(top - before[i]).toBeCloseTo(P.title.alone * place.scale, 5));
    expect(P.title.alone).toBeGreaterThan(0);
    expect(after[2] + P.close.size * place.scale).toBeLessThan(P.top * place.scale);
  });

  it('offers every language once, with its flag and its own name', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    for (const language of LANGUAGES) {
      expect(said(UNSAFE_root, `language-pill-flag-${language.code}`)).toBe(language.flag);
      expect(said(UNSAFE_root, `language-pill-name-${language.code}`)).toBe(language.name);
      expect(pressable(UNSAFE_root, `language-pill-${language.code}`).props.accessibilityLabel).toBe(language.name);
    }
  });

  it.each([
    ['the language being read', 'tr', 'reading'],
    ['the language beside it', 'en', 'comparing'],
  ] as const)('paints %s in its own colours, with a tick', (_name, code, mark) => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    expect(styled(UNSAFE_root, `language-pill-face-${code}`).borderColor).toBe(LANGUAGE_PILL[mark].rim);
    expect(styled(UNSAFE_root, `language-pill-tick-${code}`).backgroundColor).toBe(LANGUAGE_PILL[mark].tick);
    expect(pressable(UNSAFE_root, `language-pill-${code}`).props.accessibilityState).toEqual({ selected: true });
  });

  it('leaves a language nobody chose plain and without a tick', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    expect(styled(UNSAFE_root, 'language-pill-face-pl').borderColor).toBe(LANGUAGE_PILL.plain.rim);
    expect(has(UNSAFE_root, 'language-pill-tick-pl')).toBe(false);
    expect(pressable(UNSAFE_root, 'language-pill-pl').props.accessibilityState).toEqual({ selected: false });
  });

  it('uses the drawing`s gold for the language being read and its teal for the one beside it', () => {
    expect(LANGUAGE_PILL.reading).toEqual(expect.objectContaining({ rim: '#B56800', fill: ['#FDE052', '#FDD038'] }));
    expect(LANGUAGE_PILL.comparing).toEqual(expect.objectContaining({ rim: '#14CDB9', fill: ['#E5EBFD', '#D7D9FB'] }));
  });

  it('tells the two chosen colours apart from each other and from a plain language', () => {
    const rims = new Set([LANGUAGE_PILL.plain.rim, LANGUAGE_PILL.reading.rim, LANGUAGE_PILL.comparing.rim]);

    expect(rims.size).toBe(3);
  });

  it.each(LANGUAGES.map((language) => [language.code]))('a press on %s picks that language', (code) => {
    const onPick = jest.fn();
    const { UNSAFE_root } = render(<LanguagePanel {...props({ onPick })} />);

    act(() => pressable(UNSAFE_root, `language-pill-${code}`).props.onPress());

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(code);
  });

  it.each([
    ['Done', 'language-panel-done', 'onDone'],
    ['the close coin', 'language-panel-close', 'onClose'],
    ['the dimmed page behind it', 'language-panel-backdrop', 'onClose'],
  ] as const)('a press on %s is passed on, and nothing else is', (_name, id, handler) => {
    const handlers = { onDone: jest.fn(), onClose: jest.fn(), onPick: jest.fn() };
    const { UNSAFE_root } = render(<LanguagePanel {...props(handlers)} />);

    act(() => pressable(UNSAFE_root, id).props.onPress());

    expect(handlers[handler]).toHaveBeenCalledTimes(1);
    expect(Object.values(handlers).reduce((count, each) => count + each.mock.calls.length, 0)).toBe(1);
  });

  it('names the close coin for a screen reader', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    expect(pressable(UNSAFE_root, 'language-panel-close').props).toEqual(expect.objectContaining({ accessibilityRole: 'button', accessibilityLabel: 'Close' }));
  });

  it.each([
    [false, 'OFF'],
    [true, 'ON'],
  ])('its switch says whether comparing is on (%p)', (on, label) => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(<LanguagePanel {...props({ toggle: { on, label, onPress } })} />);
    const underTest = pressable(UNSAFE_root, 'language-panel-toggle');

    act(() => underTest.props.onPress());

    expect(said(UNSAFE_root, 'language-panel-toggle')).toBe(label);
    expect(underTest.props).toEqual(expect.objectContaining({ accessibilityRole: 'switch', accessibilityLabel: 'Compare Languages', accessibilityState: { checked: on } }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('paints the switch differently when it is on', () => {
    const off = render(<LanguagePanel {...props()} />);
    const offRim = styled(off.UNSAFE_root, 'language-panel-toggle-face').borderColor;
    off.unmount();
    const on = render(<LanguagePanel {...props({ toggle: { on: true, label: 'ON', onPress: jest.fn() } })} />);

    expect(styled(on.UNSAFE_root, 'language-panel-toggle-face').borderColor).not.toBe(offRim);
  });

  it('has no switch when it is given none', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props({ toggle: undefined })} />);

    expect(has(UNSAFE_root, 'language-panel-toggle')).toBe(false);
  });

  it.each([
    ['a phone on its side', PHONE],
    ['a tablet upright', TABLET],
  ])('on %s the frame is three pictures: the top and bottom at their own shape, the middle stretched to the list', (_name, device) => {
    const place = languagePanelLayout(device.screen, device.insets, LANGUAGES.length);
    const { UNSAFE_root } = render(<LanguagePanel {...props(device)} />);

    expect(styled(UNSAFE_root, 'language-panel')).toEqual(expect.objectContaining({ left: place.left, top: place.top, width: place.width, height: place.height }));
    expect(styled(UNSAFE_root, 'language-panel-art-top')).toEqual(expect.objectContaining({ top: 0, width: place.width, height: P.top * place.scale }));
    expect(styled(UNSAFE_root, 'language-panel-art-middle').height).toBeCloseTo(place.list + 2, 5);
    expect(styled(UNSAFE_root, 'language-panel-art-middle').top).toBeCloseTo(P.top * place.scale - 1, 5);
    expect(styled(UNSAFE_root, 'language-panel-art-bottom')).toEqual(expect.objectContaining({ bottom: 0, width: place.width, height: P.bottom * place.scale }));
  });

  it('stretches every picture to its box rather than cropping it', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    for (const name of ['top', 'middle', 'bottom']) {
      const art = find(UNSAFE_root, (node) => node.props.testID === `language-panel-art-${name}` && node.props.contentFit !== undefined)[0];
      expect(art.props).toEqual(expect.objectContaining({ contentFit: 'fill', accessible: false }));
    }
  });

  it('lays the languages three to a line inside the list', () => {
    const place = languagePanelLayout(PHONE.screen, PHONE.insets, LANGUAGES.length);
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);
    const list = styled(UNSAFE_root, 'language-panel-list');
    const pill = styled(UNSAFE_root, 'language-pill-en');

    expect(list.height).toBeCloseTo(place.list, 5);
    expect(list.top).toBeCloseTo(P.top * place.scale, 5);
    expect(pill.width * 3 + P.pill.gap * place.scale * 2).toBeCloseTo(list.width, 1);
    expect(pill.width * 3 + P.pill.gap * place.scale * 2).toBeLessThan(list.width);
    expect(pill.height).toBeCloseTo(P.pill.height * place.scale, 5);
  });

  it('on a phone the list scrolls and fades out at the foot, where more languages wait', () => {
    const place = languagePanelLayout(PHONE.screen, PHONE.insets, LANGUAGES.length);
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);
    const list = find(UNSAFE_root, (node) => node.props.testID === 'language-panel-list' && node.props.scrollEnabled !== undefined)[0];
    const foot = styled(UNSAFE_root, 'language-panel-more');

    expect(list.props.scrollEnabled).toBe(true);
    expect(foot.top + foot.height).toBeCloseTo(P.top * place.scale + place.list, 5);
    expect(foot.height).toBeCloseTo(P.peek * place.scale, 5);
    expect(foot.width).toBeCloseTo(styled(UNSAFE_root, 'language-panel-list').width, 5);
  });

  it('and fades in at the head, so a line scrolling away under the hint is not cut off square', () => {
    const place = languagePanelLayout(PHONE.screen, PHONE.insets, LANGUAGES.length);
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);
    const head = styled(UNSAFE_root, 'language-panel-above');

    expect(head.top).toBeCloseTo(P.top * place.scale, 5);
    expect(head.height).toBeCloseTo(P.list.padTop * place.scale, 5);
  });

  it.each([['language-panel-more'], ['language-panel-above']])('a press passes straight through %s to the language under it', (id) => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    expect(find(UNSAFE_root, (node) => node.props.testID === id && node.props.pointerEvents !== undefined)[0].props.pointerEvents).toBe('none');
  });

  it('on a tablet every language shows, so the list neither scrolls nor fades', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props(TABLET)} />);
    const list = find(UNSAFE_root, (node) => node.props.testID === 'language-panel-list' && node.props.scrollEnabled !== undefined)[0];

    expect(list.props.scrollEnabled).toBe(false);
    expect(has(UNSAFE_root, 'language-panel-more')).toBe(false);
    expect(has(UNSAFE_root, 'language-panel-above')).toBe(false);
  });

  it('keeps every label on one line, shrinking to fit, with no fixed line height', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);
    const labels = ['language-panel-title', 'language-panel-hint', 'language-panel-toggle-label', 'language-pill-name-pt', 'language-panel-done-label'];

    for (const id of labels) {
      const label = find(UNSAFE_root, (node) => node.props.testID === id && node.props.numberOfLines !== undefined)[0];
      expect(label.props).toEqual(expect.objectContaining({ numberOfLines: 1, adjustsFontSizeToFit: true }));
      expect(StyleSheet.flatten(label.props.style).lineHeight).toBeUndefined();
    }
  });

  it.each([
    ['language-panel-title', 'title'],
    ['language-panel-hint', 'hint'],
    ['language-panel-toggle-label', 'toggle'],
    ['language-pill-name-pt', 'pill'],
    ['language-panel-done-label', 'done'],
  ] as const)('draws %s at the drawing`s size, and bigger by the text size the family chose', (id, part) => {
    const size = (root: ReactTestInstance) => StyleSheet.flatten(find(root, (node) => node.props.testID === id && node.props.numberOfLines !== undefined)[0].props.style).fontSize;
    const plain = render(<LanguagePanel {...props()} />);
    const scale = languagePanelLayout(PHONE.screen, PHONE.insets, LANGUAGES.length).scale;
    const before = size(plain.UNSAFE_root);
    plain.unmount();

    const larger = render(<LanguagePanel {...props({ textScale: 1.3 })} />);

    expect(before).toBeCloseTo(P[part].size * scale, 5);
    expect(size(larger.UNSAFE_root)).toBeCloseTo(before * 1.3, 5);
  });

  it('keeps every word at the size it is drawn, whatever the phone`s own text setting', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);
    const labels = find(UNSAFE_root, (node) => typeof node.props.testID === 'string' && node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit === true);

    expect(labels.length).toBeGreaterThanOrEqual(4 + LANGUAGES.length);
    for (const label of labels) expect(label.props.allowFontScaling).toBe(false);
  });

  it('keeps a screen reader inside the panel while it is open', () => {
    const { UNSAFE_root } = render(<LanguagePanel {...props()} />);

    expect(find(UNSAFE_root, (node) => node.props.testID === 'language-panel-layer' && node.props.pointerEvents !== undefined)[0].props.accessibilityViewIsModal).toBe(true);
  });

  describe('opening and closing', () => {
    const timing = withTiming as unknown as jest.Mock;
    const original = timing.getMockImplementation();
    afterEach(() => {
      cleanup();
      timing.mockImplementation(original);
    });
    const hold = () => {
      const finishers: ((finished: boolean) => void)[] = [];
      timing.mockImplementation((to: number, _config: unknown, done?: (finished: boolean) => void) => {
        if (done) finishers.push(done);
        return to;
      });
      return finishers;
    };

    it('fades in over a short beat', () => {
      timing.mockClear();

      render(<LanguagePanel {...props()} />);

      expect(timing).toHaveBeenCalledWith(1, expect.objectContaining({ duration: LANGUAGE_PANEL_MOTION.inMs }));
    });

    it('stays on the page while it fades away, and only then goes', () => {
      const finishers = hold();
      const view = render(<LanguagePanel {...props()} />);

      view.rerender(<LanguagePanel {...props({ visible: false })} />);

      expect(timing).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: LANGUAGE_PANEL_MOTION.outMs }), expect.any(Function));
      expect(has(view.UNSAFE_root, 'language-panel')).toBe(true);
      expect(find(view.UNSAFE_root, (node) => node.props.testID === 'language-panel-layer' && node.props.pointerEvents !== undefined)[0].props.pointerEvents).toBe('none');

      act(() => finishers[finishers.length - 1](true));

      expect(has(view.UNSAFE_root, 'language-panel')).toBe(false);
    });

    it('stays if it is opened again before it has gone', () => {
      const finishers = hold();
      const view = render(<LanguagePanel {...props()} />);
      view.rerender(<LanguagePanel {...props({ visible: false })} />);

      const list = () => find(view.UNSAFE_root, (node) => node.props.testID === 'language-panel-list' && node.props.scrollEnabled !== undefined)[0];
      const before = list();

      view.rerender(<LanguagePanel {...props()} />);
      act(() => finishers[finishers.length - 1](false));

      expect(has(view.UNSAFE_root, 'language-panel')).toBe(true);
      expect(list()).toBe(before);
      expect(find(view.UNSAFE_root, (node) => node.props.testID === 'language-panel-layer' && node.props.pointerEvents !== undefined)[0].props.pointerEvents).toBe('box-none');
    });

    it('with Reduce Motion it appears and goes at once, with no fade', () => {
      timing.mockClear();
      const view = render(<LanguagePanel {...props({ reduceMotion: true })} />);

      view.rerender(<LanguagePanel {...props({ reduceMotion: true, visible: false })} />);

      expect(timing).not.toHaveBeenCalled();
      expect(has(view.UNSAFE_root, 'language-panel')).toBe(false);
    });

    it('put away under Reduce Motion, it is left clear, so it fades in again if motion comes back', () => {
      const reanimated = jest.requireMock('react-native-reanimated');
      const sharedValue = reanimated.useSharedValue as jest.Mock;
      const kept = sharedValue.getMockImplementation();
      const made: { value: number }[] = [];
      sharedValue.mockImplementation((initial = 0) => {
        const ref = React.useRef<{ value: number } | null>(null);
        if (!ref.current) {
          ref.current = { value: initial };
          made.push(ref.current);
        }
        return ref.current;
      });
      const view = render(<LanguagePanel {...props({ reduceMotion: true })} />);
      const open = made[0].value;

      view.rerender(<LanguagePanel {...props({ reduceMotion: true, visible: false })} />);

      expect(open).toBe(1);
      expect(made[0].value).toBe(0);
      cleanup();
      sharedValue.mockImplementation(kept);
    });

    it('keeps both beats short enough to feel instant and long enough to see', () => {
      expect(LANGUAGE_PANEL_MOTION.inMs).toBeGreaterThanOrEqual(120);
      expect(LANGUAGE_PANEL_MOTION.inMs).toBeLessThanOrEqual(260);
      expect(LANGUAGE_PANEL_MOTION.outMs).toBeGreaterThanOrEqual(100);
      expect(LANGUAGE_PANEL_MOTION.outMs).toBeLessThanOrEqual(LANGUAGE_PANEL_MOTION.inMs);
    });
  });
});
