/**
 * ReadingChallengeUI - Overlay for reading challenge interactions.
 * fill_in_blank: Story text with blanks + word bank
 * spell_word: Visual letter-card spelling game for ages 0-6
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import type { ReadingChallengeHookResult } from '@/hooks/use-reading-challenge';

/** Pastel palette for letter cards — soft, warm, child-friendly */
const LETTER_CARD_COLORS = [
  '#FF9AA2', // soft coral
  '#FFB7B2', // peach
  '#FFDAC1', // apricot
  '#B5EAD7', // mint
  '#C7CEEA', // periwinkle
  '#E2F0CB', // sage
  '#F3D1F4', // lavender
  '#FFE5B4', // cream
  '#A8D8EA', // sky
  '#FFD3E0', // rose
];

interface ReadingChallengeUIProps {
  challenge: ReadingChallengeHookResult;
  onReset?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

function ActionBar({ allowSkip, onSkip, onReset, t, sf }: any) {
  return (
    <View style={styles.actions}>
      {allowSkip && onSkip && (
        <Pressable onPress={onSkip} style={styles.actBtn} accessibilityRole="button" testID="reading-skip">
          <Text style={[styles.actTxt, { fontSize: sf(14) }]}>{t('reading.skip', 'Skip')}</Text>
        </Pressable>
      )}
      {onReset && (
        <Pressable onPress={onReset} style={styles.actBtn} accessibilityRole="button" testID="reading-reset">
          <Text style={[styles.actTxt, { fontSize: sf(14) }]}>{t('reading.reset', 'Give up')}</Text>
        </Pressable>
      )}
    </View>
  );
}

export const ReadingChallengeUI: React.FC<ReadingChallengeUIProps> = ({
  challenge, onReset, onContinue, onSkip, allowSkip = false,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize: sf } = useAccessibility();
  const wTap = useCallback((id: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); challenge.tapWord(id); }, [challenge]);
  const wUn = useCallback((i: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); challenge.unplaceWord(i); }, [challenge]);
  const lTap = useCallback((id: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); challenge.tapLetter(id); }, [challenge]);
  const lUn = useCallback((i: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); challenge.unplaceLetter(i); }, [challenge]);
  const pad = { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 };

  if (challenge.isComplete) {
    return (
      <View style={[styles.overlay, pad]} testID="reading-challenge-complete">
        <View style={styles.center}>
          <Text style={[styles.big, { fontSize: sf(28) }]}>{challenge.completedCleanly ? '\u2B50 ' : ''}{t('reading.completed', 'Well done!')}</Text>
          {challenge.mistakes > 0 && <Text style={[styles.sub, { fontSize: sf(16) }]}>{challenge.mistakes} mistakes</Text>}
          {onContinue && (
            <Pressable style={styles.btn} onPress={onContinue} accessibilityRole="button" accessibilityLabel={t('reading.continue', 'Continue Story')} testID="reading-continue">
              <Text style={[styles.btnTxt, { fontSize: sf(18) }]}>{t('reading.continue', 'Continue Story')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }
  if (challenge.mode === 'fill_in_blank') {
    return (
      <View style={[styles.overlay, pad]} testID="reading-challenge-fill">
        <ScrollView style={styles.textArea} contentContainerStyle={styles.textContent}>
          <View style={styles.textFlow}>
            {challenge.textWords.map((word, i) => {
              const si = challenge.blankSlots.findIndex(sl => sl.wordIndex === i);
              if (si >= 0) {
                const slot = challenge.blankSlots[si];
                const filled = slot.placedWord !== '';
                return (
                  <Pressable key={`b${i}`} onPress={() => filled && wUn(si)} accessibilityRole="button" testID={`blank-slot-${si}`}
                    style={[styles.blank, filled && styles.blankF, si === challenge.nextBlankIndex && !filled && styles.blankN]}>
                    <Text style={[styles.blankTxt, { fontSize: sf(18) }]}>{filled ? slot.placedWord : '___'}</Text>
                  </Pressable>
                );
              }
              return <Text key={`w${i}`} style={[styles.word, { fontSize: sf(18) }]}>{word}{' '}</Text>;
            })}
          </View>
        </ScrollView>
        <View style={styles.bank}>
          <Text style={[styles.bankLbl, { fontSize: sf(14) }]}>{t('reading.wordBank', 'Tap the correct word:')}</Text>
          <View style={styles.bankRow}>
            {challenge.wordBank.map(it => (
              <Pressable key={it.id} onPress={() => !it.used && wTap(it.id)} style={[styles.bankItem, it.used && styles.used]}
                testID={`word-bank-${it.id}`} accessibilityRole="button" accessibilityLabel={it.word}>
                <Text style={[styles.bankTxt, { fontSize: sf(16) }, it.used && styles.usedTxt]}>{it.word}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ActionBar allowSkip={allowSkip} onSkip={onSkip} onReset={onReset} t={t} sf={sf} />
      </View>
    );
  }
  if (challenge.mode === 'spell_word') {
    return (
      <View style={[styles.spellOverlay, pad]} testID="reading-challenge-spell">
        {/* ── Prompt: show the target word ── */}
        <View style={styles.spellPrompt}>
          <Ionicons name="sparkles" size={sf(28)} color="#FFD700" style={{ marginBottom: 4 }} />
          <Text style={[styles.spellLabel, { fontSize: sf(16) }]}>{t('reading.spellTheWord', 'Spell the word:')}</Text>
          <Text style={[styles.spellTargetWord, { fontSize: sf(36) }]}>{challenge.targetWord}</Text>
        </View>

        {/* ── Letter slots: card-shaped placeholders ── */}
        <View style={styles.spellSlotsContainer}>
          <View style={styles.spellSlotsRow}>
            {challenge.letterSlots.map((slot, i) => {
              const filled = slot.placedLetter !== '';
              const isNext = i === challenge.nextLetterIndex && !filled;
              const cardColor = filled ? LETTER_CARD_COLORS[i % LETTER_CARD_COLORS.length] : 'transparent';
              return (
                <Pressable
                  key={`ls${i}`}
                  onPress={() => filled && lUn(i)}
                  accessibilityRole="button"
                  testID={`letter-slot-${i}`}
                  style={[
                    styles.spellSlotCard,
                    filled && { backgroundColor: cardColor, borderColor: cardColor },
                    isNext && styles.spellSlotNext,
                  ]}
                >
                  {filled ? (
                    <Text style={[styles.spellSlotLetter, { fontSize: sf(28) }]}>{slot.placedLetter}</Text>
                  ) : (
                    <View style={styles.spellSlotDot} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Letter card pool ── */}
        <View style={styles.spellCardPool}>
          <Text style={[styles.spellPoolLabel, { fontSize: sf(14) }]}>{t('reading.letterPool', 'Choose a letter:')}</Text>
          <View style={styles.spellCardRow}>
            {challenge.letterPool.map((it, idx) => {
              const bg = LETTER_CARD_COLORS[idx % LETTER_CARD_COLORS.length];
              return (
                <Pressable
                  key={it.id}
                  onPress={() => !it.used && lTap(it.id)}
                  testID={`letter-pool-${it.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={it.letter}
                  style={[
                    styles.spellLetterCard,
                    { backgroundColor: bg },
                    it.used && styles.spellLetterCardUsed,
                  ]}
                >
                  <Text style={[styles.spellLetterCardText, { fontSize: sf(24) }, it.used && styles.spellLetterCardTextUsed]}>
                    {it.letter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ActionBar allowSkip={allowSkip} onSkip={onSkip} onReset={onReset} t={t} sf={sf} />
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  // ── Shared ──
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  big: { color: '#fff', fontFamily: Fonts.rounded, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  sub: { color: '#ccc', fontFamily: Fonts.sans, textAlign: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#4ECDC4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28, marginTop: 20 },
  btnTxt: { color: '#fff', fontFamily: Fonts.rounded, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  actTxt: { color: '#aaa', fontFamily: Fonts.sans },

  // ── fill_in_blank ──
  textArea: { flex: 1, width: '100%' },
  textContent: { paddingHorizontal: 16, paddingVertical: 12 },
  textFlow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  word: { color: '#fff', fontFamily: Fonts.sans, lineHeight: 32 },
  blank: { borderBottomWidth: 2, borderBottomColor: '#888', marginHorizontal: 4, paddingHorizontal: 6, paddingVertical: 2, minWidth: 60, alignItems: 'center' },
  blankF: { borderBottomColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.15)' },
  blankN: { borderBottomColor: '#FFD700', borderBottomWidth: 3 },
  blankTxt: { color: '#fff', fontFamily: Fonts.sans, textAlign: 'center' },
  bank: { width: '100%', paddingHorizontal: 16, paddingVertical: 12 },
  bankLbl: { color: '#aaa', fontFamily: Fonts.sans, marginBottom: 8 },
  bankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  bankItem: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  bankTxt: { color: '#fff', fontFamily: Fonts.sans },
  used: { opacity: 0.3 },
  usedTxt: { textDecorationLine: 'line-through' },

  // ── spell_word — letter card game ──
  spellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 60, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spellPrompt: {
    alignItems: 'center',
    marginBottom: 24,
  },
  spellLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Fonts.sans,
    textAlign: 'center',
    marginBottom: 6,
  },
  spellTargetWord: {
    color: '#FFD700',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  spellSlotsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  spellSlotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  spellSlotCard: {
    width: 56,
    height: 68,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  spellSlotNext: {
    borderColor: '#FFD700',
    borderStyle: 'solid',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  spellSlotLetter: {
    color: '#1a1a2e',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  spellSlotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  spellCardPool: {
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  spellPoolLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.sans,
    marginBottom: 12,
    textAlign: 'center',
  },
  spellCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  spellLetterCard: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  spellLetterCardUsed: {
    opacity: 0.2,
    shadowOpacity: 0,
    elevation: 0,
  },
  spellLetterCardText: {
    color: '#1a1a2e',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  spellLetterCardTextUsed: {
    textDecorationLine: 'line-through',
  },
});