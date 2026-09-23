import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  BORDER_ACTIVE,
  BORDER_DEFAULT,
  TEXT_PRIMARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { CIRCLE_BUTTON_DIAMETER_PHONE, CIRCLE_BUTTON_DIAMETER_TABLET } from './tokens';
import { FlagArt, hasFlag } from './flag-art';

const ICON_RATIO = 0.48;
const LABELLED_ICON_RATIO = 0.36;
const EMOJI_RATIO = 0.5;
const FLAG_EMOJI_RATIO = 0.62;
const BORDER_WIDTH = 1.5;
const PILL_PADDING_RATIO = 0.25;
const LABEL_MIN_SCALE = 0.7;
/** How hard the glass frosts whatever it is sitting over. */
const GLASS_BLUR = 16;
/**
 * A lighter fill than the shared surface token: the glass is meant to let the
 * colour behind it through, so it only tints rather than covering.
 */
const GLASS_FILL = 'rgba(80, 120, 200, 0.12)';

type CircleActionType = 'back' | 'home' | 'audio' | 'settings' | 'language';

interface CircleActionButtonProps {
  type: CircleActionType;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  muted?: boolean;
  /** A word beside the icon; the button becomes a pill of the same height. */
  label?: string;
  emoji?: string;
  /** The language whose flag fills a language button; the emoji stands in for one with no drawn flag. */
  language?: string;
  testID?: string;
}

function iconName(type: CircleActionType, muted: boolean): keyof typeof Ionicons.glyphMap {
  if (type === 'back') return 'arrow-back';
  if (type === 'home') return 'home';
  if (type === 'settings') return 'settings-outline';
  if (type === 'language') return 'globe-outline';
  return muted ? 'volume-mute' : 'volume-high';
}

export function CircleActionButton({
  type,
  onPress,
  onLongPress,
  accessibilityLabel,
  muted = false,
  label,
  emoji,
  language,
  testID,
}: CircleActionButtonProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const diameter = isTablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      testID={testID ?? `circle-action-${type}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.button,
        label ? [styles.pill, { paddingHorizontal: Math.round(diameter * PILL_PADDING_RATIO) }] : { width: diameter },
        {
          height: diameter,
          borderRadius: diameter / 2,
          borderColor: pressed ? BORDER_ACTIVE : BORDER_DEFAULT,
        },
      ]}
    >
      <View
        testID="circle-action-glass"
        style={[styles.glass, { borderRadius: diameter / 2 }]}
        pointerEvents="none"
      >
        <BlurView intensity={GLASS_BLUR} tint="dark" style={StyleSheet.absoluteFill} />
        {/* Light catching the top of the pill, with a faint bounce off the floor. */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.22)',
            'rgba(255, 255, 255, 0.04)',
            'rgba(255, 255, 255, 0.00)',
            'rgba(150, 195, 255, 0.09)',
          ]}
          locations={[0, 0.34, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {type === 'language' && hasFlag(language) ? (
        <View
          testID="circle-action-flag"
          style={[styles.flagClip, { width: diameter - BORDER_WIDTH * 2, height: diameter - BORDER_WIDTH * 2, borderRadius: diameter / 2 - BORDER_WIDTH }]}
          pointerEvents="none"
        >
          <FlagArt code={language} size={diameter - BORDER_WIDTH * 2} />
        </View>
      ) : emoji && type === 'language' ? (
        <Text style={{ fontSize: Math.round(diameter * FLAG_EMOJI_RATIO), lineHeight: diameter }} allowFontScaling={false}>
          {emoji}
        </Text>
      ) : emoji ? (
        <Text style={{ fontSize: Math.round(diameter * EMOJI_RATIO), lineHeight: diameter }} allowFontScaling={false}>
          {emoji}
        </Text>
      ) : (
        <Ionicons
          name={iconName(type, muted)}
          size={Math.round(diameter * (label ? LABELLED_ICON_RATIO : ICON_RATIO))}
          color={TEXT_PRIMARY}
        />
      )}
      {label ? (
        <Text
          style={[styles.label, { fontSize: scaledFontSize(isTablet ? 17 : 13) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={LABEL_MIN_SCALE}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
    zIndex: 1,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.rounded,
    // Heavy rather than bold: these pills sit over the bright globe, where the
    // label has to hold its own against the artwork behind it.
    fontWeight: '800',
  },
  button: {
    // A tint under the blur, so the pill still reads where blur is unavailable.
    backgroundColor: GLASS_FILL,
    borderWidth: BORDER_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glass: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  flagClip: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
