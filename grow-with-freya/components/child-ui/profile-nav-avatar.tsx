import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ACCENT_GOLD, BORDER_DEFAULT, TEXT_PRIMARY } from '@/constants/night-palette';
import { LOGIN_CUE, loginCuePose, loginGlyphSize } from '@/constants/login-cue';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { useAppStore } from '@/store/app-store';
import { needsSignIn } from '@/store/session';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** As big as the Screensafe ring in the same bar: the child's own face is the bar's other landmark. */
export const PROFILE_NAV_AVATAR_SIZE = 58;

const HIGHLIGHT_FILL = 'rgba(232, 184, 75, 0.22)';

/**
 * The settings cog pinned to the avatar's bottom-right. Sized off the avatar so
 * it travels with it, and seated in the square's corner — outside the round
 * ring, inside the box the bar lays out — so the ring's clipping never eats it
 * and it never reaches the bar's own rounded edge.
 */
const COG_RATIO = 0.36;
const COG_GLYPH_RATIO = 0.62;

/** Which face the slot holds still on, for a picture of it; left unset, it lives its own life. */
export type ProfileSlotHold = 'avatar' | 'login';

interface ProfileNavAvatarProps {
  selected: boolean;
  size?: number;
  hold?: ProfileSlotHold;
  testID?: string;
}

export function ProfileNavAvatar({
  selected,
  size = PROFILE_NAV_AVATAR_SIZE,
  hold,
  testID = 'profile-nav-avatar',
}: ProfileNavAvatarProps) {
  const userAvatarId = useAppStore((state) => state.userAvatarId);
  const wanted = useAppStore((state) => needsSignIn(state));
  const reduceMotion = useReducedMotion();
  const avatar = AVATAR_OPTIONS.find((option) => option.key === userAvatarId) ?? AVATAR_OPTIONS[0];
  const cue = useSharedValue(hold === 'login' ? 1 : 0);
  const spin = !reduceMotion;
  const cues = hold === undefined && wanted;
  const showsLogin = hold === 'login' || cues;

  useEffect(() => {
    if (!cues) {
      cancelAnimation(cue);
      cue.value = hold === 'login' ? 1 : 0;
      return undefined;
    }
    const warp = { duration: LOGIN_CUE.warpMs, easing: Easing.inOut(Easing.sin) };
    cue.value = 0;
    cue.value = withDelay(
      LOGIN_CUE.firstDelayMs,
      withRepeat(
        withSequence(
          withTiming(1, warp),
          withDelay(LOGIN_CUE.holdMs, withTiming(0, warp)),
          withDelay(LOGIN_CUE.everyMs, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(cue);
    };
  }, [cues, hold, cue]);

  const avatarStyle = useAnimatedStyle(() => {
    const pose = loginCuePose(cue.value, spin).avatar;

    return { opacity: pose.opacity, transform: [{ rotate: `${pose.rotateDeg}deg` }, { scale: pose.scale }] };
  });

  const glyphStyle = useAnimatedStyle(() => {
    const pose = loginCuePose(cue.value, spin).glyph;

    return { opacity: pose.opacity, transform: [{ rotate: `${pose.rotateDeg}deg` }, { scale: pose.scale }] };
  });

  const highlightStyle = useAnimatedStyle(() => ({ opacity: loginCuePose(cue.value, spin).highlight }));

  const cogSize = Math.round(size * COG_RATIO);

  return (
    <View style={{ width: size, height: size }}>
      <View
        testID={testID}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: selected ? TEXT_PRIMARY : BORDER_DEFAULT,
          },
        ]}
      >
        <Animated.View style={[styles.layer, avatarStyle]}>
          <Image
            testID={`${testID}-image`}
            source={avatar.art}
            style={styles.image}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        </Animated.View>
        {showsLogin ? (
          <>
            <Animated.View
              testID={`${testID}-highlight`}
              pointerEvents="none"
              style={[styles.layer, styles.highlight, { borderRadius: size / 2 }, highlightStyle]}
            />
            <Animated.View testID={`${testID}-login`} pointerEvents="none" style={[styles.layer, styles.centred, glyphStyle]}>
              <Ionicons name="log-in-outline" size={loginGlyphSize(size)} color={ACCENT_GOLD} />
            </Animated.View>
          </>
        ) : null}
      </View>

      <View
        testID={`${testID}-settings`}
        pointerEvents="none"
        style={[
          styles.cog,
          { width: cogSize, height: cogSize, borderRadius: cogSize / 2 },
        ]}
      >
        <Ionicons
          name="settings-sharp"
          size={Math.round(cogSize * COG_GLYPH_RATIO)}
          color={TEXT_PRIMARY}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(4, 16, 47, 0.55)',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    backgroundColor: HIGHLIGHT_FILL,
    borderWidth: 2,
    borderColor: ACCENT_GOLD,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cog: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 16, 47, 0.92)',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
});
