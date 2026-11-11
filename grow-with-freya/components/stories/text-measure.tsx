import React, { memo, useCallback, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { StoryWord } from './sound-words';
import { rowBreaks, type LineBreaks, type TextLine } from './text-pages';

interface TextMeasureProps {
  lines: readonly TextLine[];
  renderWord: (pieces: StoryWord) => ReactNode;
  onBreaks: (breaks: LineBreaks) => void;
}

export const TextMeasure = memo(function TextMeasure({ lines, renderWord, onBreaks }: TextMeasureProps) {
  const rowTops = useRef<Record<number, number>>({});
  const wordTops = useRef<Record<number, { line: number; y: number }>>({});
  const sent = useRef('');

  const report = useCallback(() => {
    const tops: Record<number, number> = {};
    for (const [index, { line, y }] of Object.entries(wordTops.current)) {
      const row = rowTops.current[line];
      if (row === undefined) return;
      tops[Number(index)] = row + y;
    }
    const breaks = rowBreaks(lines, tops);
    if (!breaks) return;
    const key = JSON.stringify(breaks);
    if (key === sent.current) return;
    sent.current = key;
    onBreaks(breaks);
  }, [lines, onBreaks]);

  const onRow = useCallback(
    (line: number) => (event: LayoutChangeEvent) => {
      rowTops.current[line] = event.nativeEvent.layout.y;
      report();
    },
    [report]
  );

  const onWord = useCallback(
    (line: number, index: number) => (event: LayoutChangeEvent) => {
      wordTops.current[index] = { line, y: event.nativeEvent.layout.y };
      report();
    },
    [report]
  );

  return (
    <View testID="story-text-measure" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.box, { opacity: 0 }]}>
      {lines.map((line, lineIndex) => (
          <View key={lineIndex} testID={`measure-row-${lineIndex}`} style={styles.row} onLayout={onRow(lineIndex)}>
            {line.words.map((word, position) =>
              word.index < 0 ? (
                <View key={position}>{renderWord(word.pieces)}</View>
              ) : (
                <View key={position} testID={`measure-word-${word.index}`} onLayout={onWord(lineIndex, word.index)}>
                  {renderWord(word.pieces)}
                </View>
              )
            )}
          </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
