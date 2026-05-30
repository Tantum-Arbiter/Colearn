/**
 * ReadingChallengeUI - Overlay for reading challenge interactions.
 * fill_in_blank: Story text with blanks + word bank
 * spell_word: Letter boxes + letter pool
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import type { ReadingChallengeHookResult } from '@/hooks/use-reading-challenge';

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
      <View style={[styles.overlay, pad]} testID="reading-challenge-spell">
        <View style={styles.spellBox}>
          <Text style={[styles.sub, { fontSize: sf(16) }]}>{t('reading.spellTheWord', 'Spell the word:')}</Text>
          <View style={styles.slotsRow}>
            {challenge.letterSlots.map((slot, i) => {
              const filled = slot.placedLetter !== '';
              return (
                <Pressable key={`ls${i}`} onPress={() => filled && lUn(i)} accessibilityRole="button" testID={`letter-slot-${i}`}
                  style={[styles.lSlot, filled && styles.lSlotF, i === challenge.nextLetterIndex && !filled && styles.lSlotN]}>
                  <Text style={[styles.lSlotTxt, { fontSize: sf(24) }]}>{filled ? slot.placedLetter : ''}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.bank}>
          <Text style={[styles.bankLbl, { fontSize: sf(14) }]}>{t('reading.letterPool', 'Choose a letter:')}</Text>
          <View style={styles.bankRow}>
            {challenge.letterPool.map(it => (
              <Pressable key={it.id} onPress={() => !it.used && lTap(it.id)} style={[styles.lPool, it.used && styles.used]}
                testID={`letter-pool-${it.id}`} accessibilityRole="button" accessibilityLabel={it.letter}>
                <Text style={[styles.lPoolTxt, { fontSize: sf(20) }, it.used && styles.usedTxt]}>{it.letter}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ActionBar allowSkip={allowSkip} onSkip={onSkip} onReset={onReset} t={t} sf={sf} />
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  big: { color: '#fff', fontFamily: Fonts, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  sub: { color: '#ccc', fontFamily: Fonts, textAlign: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#4ECDC4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28, marginTop: 20 },
  btnTxt: { color: '#fff', fontFamily: Fonts, fontWeight: '700' },
  textArea: { flex: 1, width: '100%' },
  textContent: { paddingHorizontal: 16, paddingVertical: 12 },
  textFlow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  word: { color: '#fff', fontFamily: Fonts, lineHeight: 32 },
  blank: { borderBottomWidth: 2, borderBottomColor: '#888', marginHorizontal: 4, paddingHorizontal: 6, paddingVertical: 2, minWidth: 60, alignItems: 'center' },
  blankF: { borderBottomColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.15)' },
  blankN: { borderBottomColor: '#FFD700', borderBottomWidth: 3 },
  blankTxt: { color: '#fff', fontFamily: Fonts, textAlign: 'center' },
  bank: { width: '100%', paddingHorizontal: 16, paddingVertical: 12 },
  bankLbl: { color: '#aaa', fontFamily: Fonts, marginBottom: 8 },
  bankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  bankItem: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  bankTxt: { color: '#fff', fontFamily: Fonts },
  used: { opacity: 0.3 },
  usedTxt: { textDecorationLine: 'line-through' },
  spellBox: { alignItems: 'center', marginVertical: 20 },
  slotsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  lSlot: { width: 48, height: 56, borderWidth: 2, borderColor: '#555', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  lSlotF: { borderColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.2)' },
  lSlotN: { borderColor: '#FFD700', borderWidth: 3 },
  lSlotTxt: { color: '#fff', fontFamily: Fonts, fontWeight: '700' },
  lPool: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  lPoolTxt: { color: '#fff', fontFamily: Fonts, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  actTxt: { color: '#aaa', fontFamily: Fonts },
});