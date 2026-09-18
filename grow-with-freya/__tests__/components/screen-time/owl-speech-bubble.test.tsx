/**
 * The owl's line writes itself out rather than fading in as a block -- a
 * quick game-dialogue reveal. It has to stay quick (a page most children
 * tap straight through), and it must never hide the real words from
 * anything reading the tree while it builds up to them.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { OwlSpeechBubble, typewriterDurationMs, TYPEWRITER_TICK_MS } from '@/components/screen-time/owl-speech-bubble';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const BODY = 'Let’s take a quick tour to help you get the most out of storytime.';

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function visibleBody(tree: ReturnType<typeof render>): string {
  const node = findByTestId(tree, 'bubble-body')[0];
  return typeof node.props.children === 'string' ? node.props.children : '';
}

function json(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

/** The write-out's own duration lands on a tick boundary that does not
 *  always coincide with the exact millisecond the line finishes on, so the
 *  last letter can trail by up to one tick -- imperceptible to a person,
 *  but worth a tick of slack here rather than an exact-millisecond test. */
function finishDuration(length: number): number {
  return typewriterDurationMs(length) + TYPEWRITER_TICK_MS;
}

function renderBubble(props: Partial<React.ComponentProps<typeof OwlSpeechBubble>> = {}) {
  return render(
    <OwlSpeechBubble
      idPrefix="bubble"
      body={BODY}
      page={0}
      pageCount={1}
      nextLabel="Next"
      closeLabel="Close"
      onNext={jest.fn()}
      onClose={jest.fn()}
      maxWidth={280}
      {...props}
    />
  );
}

describe('OwlSpeechBubble', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes the line out rather than showing it whole from the first frame', () => {
    const tree = renderBubble();

    expect(visibleBody(tree)).toBe('');

    act(() => {
      jest.advanceTimersByTime(finishDuration(BODY.length));
    });

    expect(visibleBody(tree)).toBe(BODY);
  });

  it('keeps the full line available to the tree the whole time, mid-write included', () => {
    const tree = renderBubble();

    // Nothing has been revealed to the eye yet, but the real words are
    // already there for a screen reader (or anything else reading the
    // tree) to find.
    expect(visibleBody(tree)).toBe('');
    expect(json(tree)).toContain(BODY);

    act(() => {
      jest.advanceTimersByTime(TYPEWRITER_TICK_MS * 2);
    });

    expect(visibleBody(tree).length).toBeGreaterThan(0);
    expect(visibleBody(tree).length).toBeLessThan(BODY.length);
    expect(json(tree)).toContain(BODY);
  });

  it('grows monotonically -- every tick shows at least as much as the last', () => {
    const tree = renderBubble();
    let lastLength = 0;
    const ticks = Math.ceil(typewriterDurationMs(BODY.length) / TYPEWRITER_TICK_MS) + 2;

    for (let i = 0; i < ticks; i += 1) {
      act(() => {
        jest.advanceTimersByTime(TYPEWRITER_TICK_MS);
      });
      const length = visibleBody(tree).length;
      expect(length).toBeGreaterThanOrEqual(lastLength);
      lastLength = length;
    }

    expect(lastLength).toBe(BODY.length);
  });

  it('skips straight to the full line under reduced motion -- nothing to build up to', () => {
    mockReducedMotion.mockReturnValue(true);
    const tree = renderBubble();

    expect(visibleBody(tree)).toBe(BODY);
  });

  it('writes the new page out fresh when the body changes', () => {
    const tree = renderBubble({ page: 0, body: 'First page.' });

    act(() => {
      jest.advanceTimersByTime(finishDuration('First page.'.length));
    });
    expect(visibleBody(tree)).toBe('First page.');

    tree.rerender(
      <OwlSpeechBubble
        idPrefix="bubble"
        body="Second page, a little longer than the first."
        page={1}
        pageCount={2}
        nextLabel="Next"
        closeLabel="Close"
        onNext={jest.fn()}
        onClose={jest.fn()}
        maxWidth={280}
      />
    );

    // The moment the new page lands, it starts from nothing again rather
    // than snapping straight to the old bubble's full-length text.
    expect(visibleBody(tree)).toBe('');

    act(() => {
      jest.advanceTimersByTime(finishDuration('Second page, a little longer than the first.'.length));
    });
    expect(visibleBody(tree)).toBe('Second page, a little longer than the first.');
  });

  it('caps the write-out so a long line never reads as sluggish', () => {
    const long = 'A '.repeat(120).trim();
    const tree = renderBubble({ body: long });

    act(() => {
      jest.advanceTimersByTime(finishDuration(long.length));
    });

    expect(visibleBody(tree)).toBe(long);
  });
});
