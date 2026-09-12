import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, useWindowDimensions, Alert, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { PlanPicker, type LivePrices } from '@/components/subscription/plan-picker';
import { fallbackPrices, type PlanId } from '@/constants/fallback-prices';
import { trialCalendarDaysRemaining, type TrialStatus } from '@/constants/trial-end';
import { useAppStore } from '@/store/app-store';
import { mapPlanIdToPackage, purchasePackage, getOfferings, getOfferingPrices } from '@/services/subscription-service';

const ANIM_MS = 350;

const UPGRADE_PLANS: PlanId[] = ['monthly_premium', 'yearly'];

/** Room for the plan cards without letting them stretch across a tablet. */
const CONTENT_MAX_WIDTH = 560;

const FRAME_YELLOW = '#FFE14D';

/**
 * Below this a phone has to fit the whole offer -- countdown, both cards and
 * the picker -- in one screen, so everything the page draws shrinks together
 * rather than the parent being handed a scroll to find the price.
 */
const COMPACT_WIDTH = 480;

/**
 * The amber halo the trial screen draws around its framed boxes. iOS renders
 * it from the shadow properties; Android's elevation shadow is always dark, so
 * it is left off there rather than muddying a dark panel with a grey drop.
 */
const BOX_GLOW = {
  shadowColor: '#FFE14D',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius: 18,
} as const;

const STAR_SMALL = require('../../assets/images/home-sky/star-small.webp');
const STAR_MEDIUM = require('../../assets/images/home-sky/star-medium.webp');
const STAR_LARGE = require('../../assets/images/home-sky/star-large.webp');

/** `drop` sets each star below the crown of the arc the design draws. */
const STARS = [
  { source: STAR_SMALL, size: 13, drop: 26 },
  { source: STAR_MEDIUM, size: 23, drop: 12 },
  { source: STAR_LARGE, size: 40, drop: 0 },
  { source: STAR_MEDIUM, size: 23, drop: 12 },
  { source: STAR_SMALL, size: 13, drop: 26 },
];

const PREMIUM_ART = require('../../assets/images/subscription/premium-music.webp');

const BASIC_KEEPS_KEYS = [
  'subscription.detail50Stories',
  'subscription.detailAllLearning',
  'subscription.detailLimitedSongs',
];

const PREMIUM_ADDS_KEYS = [
  'subscription.trialEnd.addsAll',
  'subscription.trialEnd.addsPractice',
  'subscription.detailAllInstruments',
  'subscription.detailDownload100',
];

/**
 * Which headline the countdown deserves, and the number it counts.
 *
 * Counted in calendar days so the line agrees with the date printed directly
 * beneath it. Days are not interchangeable here either: "ends in 0 days" is
 * how a parent finds out too late, so the last day and the day before it each
 * get their own sentence.
 */
export function trialEndTitle(
  status: TrialStatus | null,
  now: Date = new Date(),
): { key: string; count: number } {
  if (!status?.inTrial || !status.endsAt) {
    return { key: 'subscription.trialEnd.titleUpgrade', count: 0 };
  }

  const count = trialCalendarDaysRemaining(status.endsAt, now);
  if (count <= 0) return { key: 'subscription.trialEnd.titleToday', count };
  if (count === 1) return { key: 'subscription.trialEnd.titleTomorrow', count };
  return { key: 'subscription.trialEnd.titleDays', count };
}

export interface TrialEndUpgradeOverlayProps {
  visible: boolean;
  onClose: () => void;
  status: TrialStatus | null;
}

/**
 * The offer a parent gets before the trial converts.
 *
 * Doing nothing is a real answer -- the store charges for Basic and the app
 * keeps working -- so the screen says what that costs before it sells anything,
 * and leaving without choosing is one tap, not a hunt for a close button.
 */
export const TrialEndUpgradeOverlay = React.memo(function TrialEndUpgradeOverlay({
  visible,
  onClose,
  status,
}: TrialEndUpgradeOverlayProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly_premium');
  const [livePrices, setLivePrices] = useState<LivePrices>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { isGuestMode, setGuestMode, setShowLoginAfterOnboarding } = useAppStore();
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    translateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });
    backdropOpacity.value = withTiming(1, { duration: ANIM_MS });
    (async () => {
      const offerings = await getOfferings();
      if (offerings) setLivePrices(getOfferingPrices());
    })();
  }, [visible, backdropOpacity, translateY]);

  const handleClose = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: ANIM_MS });
    translateY.value = withTiming(screenH, { duration: ANIM_MS, easing: Easing.in(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(onClose)();
    });
  }, [onClose, screenH, backdropOpacity, translateY]);

  const modalStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const bdStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const basicPrice = livePrices?.monthly_basic?.priceString ?? fallbackPrices().monthly_basic;
  const compact = screenW < COMPACT_WIDTH;
  const artWidth = compact ? 84 : 104;
  const cardPad = compact ? 11 : 14;
  const starScale = compact ? 0.8 : 1;

  const chargeDate = useMemo(() => {
    if (!status?.endsAt) return null;
    return status.endsAt.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
  }, [status, i18n.language]);

  const handleUpgrade = useCallback(() => {
    if (isGuestMode) {
      Alert.alert(
        t('subscription.signInRequiredTitle'),
        t('subscription.signInRequiredMessage'),
        [
          { text: t('subscription.signInRequiredCancel'), style: 'cancel' },
          {
            text: t('subscription.signInRequiredConfirm'),
            onPress: () => {
              handleClose();
              setTimeout(() => {
                setGuestMode(false);
                setShowLoginAfterOnboarding(true);
              }, ANIM_MS + 50);
            },
          },
        ],
      );
      return;
    }

    setIsPurchasing(true);
    (async () => {
      try {
        await getOfferings();
        const pkg = mapPlanIdToPackage(selectedPlan);
        if (!pkg) {
          Alert.alert(t('subscription.errorTitle'), t('subscription.errorUnavailable'));
          return;
        }
        const result = await purchasePackage(pkg);
        if (result.success) {
          handleClose();
        } else if (result.devMode) {
          Alert.alert('Dev Mode', 'Purchases are disabled in dev mode. Use Developer Options to set your subscription tier.');
        } else if (result.error) {
          Alert.alert(t('subscription.errorTitle'), result.error);
        }
      } catch {
        Alert.alert(t('subscription.errorTitle'), t('subscription.errorGeneric'));
      } finally {
        setIsPurchasing(false);
      }
    })();
  }, [isGuestMode, selectedPlan, t, handleClose, setGuestMode, setShowLoginAfterOnboarding]);

  if (!visible) return null;

  const title = trialEndTitle(status);

  return (
    <View style={st.abs}>
      <Animated.View style={[st.backdrop, bdStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>
      </Animated.View>

      <Animated.View style={[st.modalWrap, modalStyle]}>
        <LinearGradient
          colors={['#1a1a3e', '#0d0d2b', '#050515']}
          style={[st.content, { paddingBottom: insets.bottom + 16, paddingTop: insets.top + 20 }]}
        >
          <Image
            testID="trial-end-background"
            source={require('../../assets/images/ui-elements/story-art-strip-subscribe.webp')}
            style={st.bgImage}
            resizeMode="cover"
          />
          <View style={st.bgOverlay} />
          <Pressable
            testID="trial-end-close"
            style={[st.closeBtn, { top: insets.top + 10 }]}
            onPress={handleClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={t('subscription.trialEnd.keepBasic')}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
            <View style={st.column}>
              <View style={st.starRow} testID="trial-end-star-cluster">
                {STARS.map((star, i) => (
                  <Image
                    key={i}
                    source={star.source}
                    style={{
                      width: star.size * starScale,
                      height: star.size * starScale,
                      marginTop: star.drop * starScale,
                    }}
                    resizeMode="contain"
                  />
                ))}
              </View>

              <Text style={[st.header, compact && st.headerCompact]} testID="trial-end-title">
                {t(title.key, { count: title.count })}
              </Text>
              <Text style={[st.sub, compact && st.subCompact]} testID="trial-end-subtitle">
                {status?.inTrial && chargeDate
                  ? t('subscription.trialEnd.subtitle', { price: basicPrice, date: chargeDate })
                  : t('subscription.trialEnd.subtitleUpgrade')}
              </Text>

              <View style={[st.stayingCard, { padding: cardPad }]} testID="trial-end-staying-card">
                <View style={st.stayingHeadRow}>
                  <MaterialCommunityIcons name="shield-check" size={17} color="#8FE3B0" />
                  <Text style={st.stayingHead}>{t('subscription.trialEnd.stayingLabel')}</Text>
                </View>
                {BASIC_KEEPS_KEYS.map((key) => (
                  <View key={key} style={st.lineRow}>
                    <Ionicons name="checkmark" size={14} color="#8FE3B0" style={st.lineIcon} />
                    <Text style={st.lineText}>{t(key)}</Text>
                  </View>
                ))}
                <Text style={st.stayingPrice}>
                  {t('subscription.trialEnd.stayingPrice', { price: basicPrice })}
                </Text>
              </View>

              <View style={st.addsCard} testID="trial-end-adds-card">
                <View style={[st.addsArt, { width: artWidth }]}>
                  <Image source={PREMIUM_ART} style={st.addsArtImage} resizeMode="cover" />
                </View>
                <View style={[st.addsBody, { paddingVertical: cardPad, paddingRight: cardPad, paddingLeft: artWidth + cardPad }]}>
                  <Text style={st.addsHead}>{t('subscription.trialEnd.upgradeHeading')}</Text>
                  {PREMIUM_ADDS_KEYS.map((key) => (
                    <View key={key} style={st.lineRow}>
                      <Ionicons name="add" size={15} color="#FFC61A" style={st.lineIcon} />
                      <Text style={st.lineText}>{t(key)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <PlanPicker
                planIds={UPGRADE_PLANS}
                selectedPlan={selectedPlan}
                onSelect={setSelectedPlan}
                livePrices={livePrices}
                showTrialNote={false}
                showDetails={false}
              />
            </View>
          </ScrollView>

          <View style={st.column}>
            <Pressable testID="trial-end-upgrade" disabled={isPurchasing} onPress={handleUpgrade} style={st.cta} accessibilityRole="button">
              <LinearGradient colors={['#F59E0B', '#D97706']} style={[st.ctaInner, isPurchasing && st.ctaBusy]}>
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={st.ctaRow}>
                    <Text style={st.ctaText}>{t('subscription.trialEnd.cta')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              testID="trial-end-keep-basic"
              onPress={handleClose}
              accessibilityRole="button"
              style={st.keepBasic}
            >
              <Text style={st.keepBasicText}>{t('subscription.trialEnd.keepBasic')}</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

const st = StyleSheet.create({
  abs: { ...StyleSheet.absoluteFillObject, zIndex: 2600 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalWrap: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  // Fitted by the platform against its own bounds: sized here from the window
  // it is a render behind a rotation, and the art leaves a gap down one side.
  bgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 5, 20, 0.45)' },
  closeBtn: { position: 'absolute', right: 18, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  // a tablet is taller than either screen needs, and left to itself the
  // content stacks at the top with the call to action stranded far below it
  scroll: { flexGrow: 1, justifyContent: 'center', paddingTop: 8, paddingBottom: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  starRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 6 },
  headerCompact: { fontSize: 21, marginBottom: 4 },
  subCompact: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  header: { fontSize: 25, fontWeight: '800', color: '#FFD700', fontFamily: Fonts.rounded, textAlign: 'center', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  sub: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.9)', fontFamily: Fonts.sans, textAlign: 'center', marginBottom: 18, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  stayingCard: { borderWidth: 1, borderColor: 'rgba(143,227,176,0.45)', borderRadius: 18, backgroundColor: 'rgba(10,10,35,0.62)', marginBottom: 10, gap: 4 },
  stayingHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  stayingHead: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800', color: '#8FE3B0' },
  stayingPrice: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  // the art box is absolute so it takes the card's settled height; left to
  // itself an Image with a fixed width claims its source's aspect ratio and
  // drags the whole card down with it
  addsCard: { ...BOX_GLOW, borderWidth: 1.5, borderColor: FRAME_YELLOW, borderRadius: 20, backgroundColor: 'rgba(10,10,35,0.62)', overflow: 'hidden', marginBottom: 16 },
  addsArt: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  addsArtImage: { width: '100%', height: '100%' },
  addsBody: { gap: 4 },
  addsHead: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '800', color: '#FFC61A', marginBottom: 3 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  lineIcon: { marginRight: 7, marginTop: 2 },
  lineText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: '#FFFFFF', flex: 1 },
  cta: { marginTop: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  ctaInner: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  ctaBusy: { opacity: 0.6 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: Fonts.rounded, letterSpacing: 0.5 },
  keepBasic: { paddingVertical: 12, alignItems: 'center' },
  keepBasicText: { fontFamily: Fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'underline' },
});
