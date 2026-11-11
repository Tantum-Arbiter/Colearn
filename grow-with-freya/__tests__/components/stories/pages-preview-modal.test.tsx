import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { PagePreviewModal } from '@/components/stories/pages-preview-modal';
import { PREVIEW_FACE, PREVIEW_RIM } from '@/components/stories/pages-preview-modal';
import type { Story } from '@/types/story';

const story = {
  id: 'preview',
  title: 'Preview',
  category: 'bedtime',
  pages: [
    { id: 'p0', pageNumber: 0, text: 'Cover' },
    { id: 'p1', pageNumber: 1, text: 'One' },
    { id: 'p2', pageNumber: 2, text: 'Two' },
  ],
} as unknown as Story;

const setup = () => render(<PagePreviewModal story={story} currentPageIndex={1} visible onClose={jest.fn()} onSelectPage={jest.fn()} />);
const texts = (root: ReactTestInstance) => root.findAll((node) => typeof node.props.children === 'string').map((node) => node.props.children as string);

describe('PagePreviewModal', () => {
  it('has no close button: a tap outside it closes it', () => {
    const onClose = jest.fn();
    const view = render(<PagePreviewModal story={story} currentPageIndex={1} visible onClose={onClose} onSelectPage={jest.fn()} />);

    expect(texts(view.UNSAFE_root)).not.toContain('×');
    const presses = view.UNSAFE_root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel !== undefined);
    expect(presses.map((node) => node.props.accessibilityLabel)).toEqual(expect.arrayContaining(['common.close']));
    fireEvent.press(presses.find((node) => node.props.accessibilityLabel === 'common.close')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('writes in the menu`s plum ink', () => {
    const { MENU_INK } = require('@/components/stories/reader-menu');
    const view = setup();
    const title = view.UNSAFE_root.findAll((node) => node.props.children === 'reader.pagePreview')[0];

    expect(StyleSheet.flatten(title.props.style).color).toBe(MENU_INK);
  });

  it('wears the reader menu`s colours: a cream face inside a gold rim', () => {
    const view = setup();
    const sheet = StyleSheet.flatten(view.UNSAFE_root.findAll((node) => node.props.testID === 'page-preview-sheet')[0].props.style);

    expect(sheet.backgroundColor).toBe(PREVIEW_FACE);
    expect(sheet.borderColor).toBe(PREVIEW_RIM);
    expect(sheet.borderWidth).toBeGreaterThanOrEqual(3);
  });

  it('marks the page you are on in the rim`s gold', () => {
    const view = setup();
    const current = view.UNSAFE_root.findAll((node) => node.props.testID === 'page-preview-current')[0];

    expect(StyleSheet.flatten(current.props.style).borderColor).toBe(PREVIEW_RIM);
  });
});
