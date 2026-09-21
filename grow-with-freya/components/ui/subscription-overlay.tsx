import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, useWindowDimensions, Alert, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';
import { Fonts } from '@/constants/theme';
import { PrivacyPolicyContent } from '@/components/account/privacy-policy-screen';
import { TermsConditionsContent } from '@/components/account/terms-conditions-screen';
import { useAppStore } from '@/store/app-store';
import { useTrialEligibility } from '@/hooks/use-trial-eligibility';
import { mapPlanIdToPackage, purchasePackage, getOfferings, getOfferingPrices } from '@/services/subscription-service';
import type { LivePrices } from '@/components/subscription/plan-picker';
import { fallbackPrices } from '@/constants/fallback-prices';

/** The plan the trial runs on -- the only thing this screen sells. */
const TRIAL_PLAN_ID = 'monthly_basic';

const ANIM_MS = 350;

const TRIAL_STEPS = [
  {
    icon: require('../../assets/images/subscription/trial-today.webp'),
    labelKey: 'subscription.trial.todayLabel',
    bodyKey: 'subscription.trial.todayBody',
    pill: 'amber' as const,
  },
  {
    icon: require('../../assets/images/subscription/trial-notify.webp'),
    labelKey: 'subscription.trial.notifyLabel',
    bodyKey: 'subscription.trial.notifyBody',
    pill: 'indigo' as const,
  },
  {
    icon: require('../../assets/images/subscription/trial-charge.webp'),
    labelKey: 'subscription.trial.chargeLabel',
    bodyKey: 'subscription.trial.chargeBody',
    pill: 'amber' as const,
  },
];

/**
 * The amber halo the design draws around both framed boxes. iOS renders it
 * from the shadow properties; Android's elevation shadow is always dark, so it
 * is left off there rather than muddying a dark panel with a grey drop.
 */
const BOX_GLOW = {
  shadowColor: '#FFE14D',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius: 18,
} as const;

const FRAME_YELLOW = '#FFE14D';

/** Room for the trial card, which is wider than the app's usual tablet column. */
const TRIAL_MAX_WIDTH = 600;

/** Above this the screen has room for type at its full size. */
const WIDE_WIDTH = 700;

/**
 * Below this there is not enough height for the offer at any size -- a phone
 * on its side is 400-ish points tall. It is also wider than `WIDE_WIDTH`,
 * which is exactly the trap this guards: sized off width alone, the shortest
 * screen the app runs on was picking the *largest* type and icons and
 * running the plan card out under the button.
 */
const SHORT_HEIGHT = 600;

/**
 * Below this the three steps cannot hold an icon and a readable line of text
 * side by side -- "Today" was breaking to "Tod / ay". Everything the timeline
 * draws shrinks together rather than the text alone being squeezed.
 */
const COMPACT_WIDTH = 480;

/**
 * What the card adds to the timeline above it, and nothing the timeline
 * already said: the books, the free period and the cancellation are all
 * promised up there, and repeating them cost the card half its height.
 */
const TRIAL_BENEFIT_KEYS = [
  'subscription.trial.benefitLearn',
  'subscription.trial.benefitMusic',
  'subscription.trial.benefitNoAds',
  'subscription.trial.benefitDevices',
];

/** The hero sky's own stars -- the design's are lit, and a glyph cannot be. */
const STAR_SMALL = require('../../assets/images/home-sky/star-small.webp');
const STAR_MEDIUM = require('../../assets/images/home-sky/star-medium.webp');
const STAR_LARGE = require('../../assets/images/home-sky/star-large.webp');

/** `drop` sets each star below the crown of the arc the design draws. */
const TRIAL_STARS = [
  { source: STAR_SMALL, size: 13, drop: 26 },
  { source: STAR_MEDIUM, size: 23, drop: 12 },
  { source: STAR_LARGE, size: 40, drop: 0 },
  { source: STAR_MEDIUM, size: 23, drop: 12 },
  { source: STAR_SMALL, size: 13, drop: 26 },
];

interface Props { visible: boolean; onClose: () => void; }

export const SubscriptionOverlay = React.memo(function SubscriptionOverlay({ visible, onClose }: Props) {
  useCoversJourneyBar(visible);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [livePrices, setLivePrices] = useState<LivePrices>(null);
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);
  const { isGuestMode, setGuestMode, setShowLoginAfterOnboarding } = useAppStore();
  const trialAvailable = useTrialEligibility();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);
  const legalSlideX = useSharedValue(screenW);

  // Fetch RC offerings when overlay becomes visible → populate live prices
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: ANIM_MS });
      // Load offerings in background; on success, swap fallback prices for live ones
      (async () => {
        const offerings = await getOfferings();
        if (offerings) {
          setLivePrices(getOfferingPrices());
        }
      })();
    }
  }, [visible, backdropOpacity, translateY]);

  const handleClose = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: ANIM_MS });
    translateY.value = withTiming(screenH, { duration: ANIM_MS, easing: Easing.in(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(onClose)();
    });
  }, [onClose, screenH, backdropOpacity, translateY]);

  const openLegal = useCallback((page: 'privacy' | 'terms') => {
    setLegalPage(page);
    legalSlideX.value = screenW;
    legalSlideX.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });
  }, [screenW, legalSlideX]);

  const closeLegal = useCallback(() => {
    legalSlideX.value = withTiming(screenW, { duration: ANIM_MS, easing: Easing.in(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(setLegalPage)(null);
    });
  }, [screenW, legalSlideX]);

  const modalStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const bdStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const legalStyle = useAnimatedStyle(() => ({ transform: [{ translateX: legalSlideX.value }] }));

  const trialPrice = livePrices?.monthly_basic?.priceString ?? fallbackPrices().monthly_basic;
  const short = screenH < SHORT_HEIGHT;
  // COMPACT_WIDTH is about the room the timeline actually gets, not the
  // screen: running two columns hands it half, which is where "Today" starts
  // breaking again even though the screen is wide.
  const timelineWidth = short ? Math.min(screenW, 940) / 2 : screenW;
  const compact = timelineWidth < COMPACT_WIDTH;
  // Full-size type is for a screen that is big, not merely wide: a phone in
  // landscape clears WIDE_WIDTH twice over and has a third of the height.
  const wide = screenW >= WIDE_WIDTH && !short;
  const stepIcon = short ? 54 : compact ? 68 : 97;
  // The plan card is half-width when the offer runs in two columns, so its
  // copy stacks there for the same reason it does on a narrow phone.
  const stackPlan = compact || short;
  const linkDots = compact ? 4 : 8;
  const dotGap = compact ? 3.5 : 6;

  if (!visible) return null;

  return (
    <View style={st.abs}>
      <Animated.View style={[st.backdrop, bdStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>
      </Animated.View>
      <Animated.View style={[st.modalWrap, modalStyle]}>
        <LinearGradient colors={['#1a1a3e', '#0d0d2b', '#050515']}
          style={[st.content, {
            paddingBottom: insets.bottom + (short ? 8 : 16),
            paddingTop: insets.top + (short ? 10 : 20),
            paddingLeft: insets.left + (short ? 6 : 16),
            paddingRight: insets.right + (short ? 6 : 16),
          }]}>
          {/* Background art */}
          <Image
            source={require('../../assets/images/ui-elements/story-art-strip-subscribe.webp')}
            style={st.bgImage}
            resizeMode="cover"
          />
          <View style={st.bgOverlay} />
          <Pressable testID="trial-close" style={[st.closeBtn, { top: insets.top + 10 }]} onPress={handleClose} hitSlop={16}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <ScrollView
            style={st.page}
            contentContainerStyle={[st.pageContent, short && st.pageContentShort]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            /* The offer is meant to be taken in at a glance, so nothing on
             * it may hide below a fold -- on any screen, in any orientation.
             * Landscape earns that by running two columns and trimming, not
             * by handing the parent a scrollbar. */
            scrollEnabled={false}
            testID="trial-scroller"
          >
            <View style={[st.column, short && st.columnShort, st.pageColumn, wide && st.pageColumnWide, short && st.pageColumnShort]}>
            <View style={st.headerBlock}>
            {short ? null : (
            <View style={st.starRow} testID="trial-star-cluster">
              {TRIAL_STARS.map((star, i) => (
                <Image
                  key={i}
                  source={star.source}
                  style={{ width: star.size, height: star.size, marginTop: star.drop }}
                  resizeMode="contain"
                />
              ))}
            </View>
            )}
            <Text style={[st.header, wide && st.headerWide, short && st.headerShort]}>{t('subscription.trial.title')}</Text>
            <Text style={[st.sub, wide && st.subWide, short && st.subShort]}>{t('subscription.trial.subtitle', { price: trialPrice })}</Text>
            </View>

            <View testID="trial-offer" style={short ? st.offerRowShort : st.offerColumn}>
            <View style={[st.timeline, short && st.offerTimeline, short && st.timelineShort]} testID="trial-timeline">
              {TRIAL_STEPS.map((step, i) => (
                <React.Fragment key={step.labelKey}>
                  {i > 0 ? (
                    <View
                      style={[st.timelineLink, { gap: dotGap, marginTop: stepIcon * 0.56 }]}
                      testID={`trial-link-${i - 1}`}
                    >
                      {Array.from({ length: linkDots }).map((_, d) => (
                        <View key={d} style={st.timelineDot} testID="trial-link-dot" />
                      ))}
                    </View>
                  ) : null}
                  <View style={st.step} testID={`trial-step-${i}`}>
                    <Image
                      testID={`trial-step-icon-${i}`}
                      source={step.icon}
                      style={{ width: stepIcon, height: stepIcon }}
                      resizeMode="contain"
                    />
                    <View style={[st.stepPill, step.pill === 'indigo' ? st.stepPillIndigo : st.stepPillAmber]}>
                      <Text
                        numberOfLines={1}
                        style={[st.stepPillText, wide && st.stepPillTextWide, step.pill === 'indigo' ? st.stepPillTextLight : null]}
                      >
                        {t(step.labelKey)}
                      </Text>
                    </View>
                    <Text style={[st.stepBody, wide && st.stepBodyWide]}>{t(step.bodyKey, { price: trialPrice })}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <View style={[st.premiumWrap, short && st.offerPlan]}>
            <View style={st.premiumCard} testID="trial-premium-card">
              <View style={[st.premiumBody, short && st.premiumBodyShort]}>
                <View style={[st.premiumCopyRow, stackPlan && st.premiumCopyStack]}>
                <View style={[st.premiumCopy, stackPlan && st.premiumColumnStacked]}>
                  <Text style={[st.premiumName, wide && st.premiumNameWide, short && st.premiumNameShort]}>{t('subscription.trial.planName')}</Text>
                  <Text style={[st.premiumTrial, wide && st.premiumTrialWide, short && st.premiumTrialShort]}>{t('subscription.trial.planTrial')}</Text>
                </View>
                <View style={[st.premiumBenefits, stackPlan && st.premiumColumnStacked, short && st.benefitsShort]}>
                  {TRIAL_BENEFIT_KEYS.map((key, i) => (
                    <View key={key} style={st.benefitRow} testID={`trial-benefit-${i}`}>
                      <Ionicons name="checkmark" size={15} color="#FFC61A" style={st.benefitTick} />
                      <Text style={[st.benefitText, wide && st.benefitTextWide, short && st.benefitTextShort]}>{t(key)}</Text>
                    </View>
                  ))}
                </View>
                </View>

              <View testID="trial-upgrade" style={[st.upgradeRow, stackPlan && st.upgradeRowCompact]}>
                <Text style={[st.upgradeNote, wide && st.upgradeNoteWide, short && st.upgradeNoteShort]}>{t('subscription.trial.upgrade')}</Text>
              </View>
              </View>
            </View>

              <View style={st.popularBadge}>
                <MaterialCommunityIcons name="crown" size={15} color="#4A2E00" />
                <Text style={st.popularText}>{t('subscription.trial.mostRecommended')}</Text>
              </View>
            </View>
            </View>

            </View>
          </ScrollView>
          <View style={st.column}>
          <Pressable style={[st.subBtn, short && st.subBtnShort]} disabled={isPurchasing} onPress={() => {
            if (isGuestMode) {
              Alert.alert(
                t('subscription.signInRequiredTitle'),
                t('subscription.signInRequiredMessage'),
                [
                  { text: t('subscription.signInRequiredCancel'), style: 'cancel' },
                  {
                    text: t('subscription.signInRequiredConfirm'),
                    onPress: () => {
                      // Close overlay, clear guest mode, redirect to login
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
            // RevenueCat purchase flow
            setIsPurchasing(true);
            (async () => {
              try {
                // Ensure offerings are loaded
                await getOfferings();
                const pkg = mapPlanIdToPackage(TRIAL_PLAN_ID);
                if (!pkg) {
                  Alert.alert(t('subscription.errorTitle'), t('subscription.errorUnavailable'));
                  return;
                }
                const result = await purchasePackage(pkg);
                if (result.success) {
                  handleClose();
                } else if (result.cancelled) {
                  // User cancelled -do nothing, keep overlay open
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
          }}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={[st.subBtnInner, short && st.subBtnInnerShort, isPurchasing && { opacity: 0.6 }]}>
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={st.subBtnRow}>
                  <Text style={[st.subBtnText, wide && st.subBtnTextWide]}>
                    {t(trialAvailable ? 'subscription.startFreeTrial' : 'subscription.unlockPlan')}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </Pressable>
          <View style={[st.legalRow, short && st.legalRowShort]}>
            <Pressable onPress={() => openLegal('privacy')}>
              <Text style={st.legalLink}>{t('subscription.privacyPolicy')}</Text>
            </Pressable>
            <Text style={st.legalDot}>|</Text>
            <Pressable onPress={() => openLegal('terms')}>
              <Text style={st.legalLink}>{t('subscription.termsAndConditions')}</Text>
            </Pressable>
          </View>
          </View>
        </LinearGradient>

        {/* Legal page slide-in */}
        {legalPage && (
          <Animated.View style={[st.legalPanel, legalStyle]}>
            <LinearGradient colors={['#1a1a3e', '#0d0d2b', '#050515']}
              style={[st.legalPanelInner, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
              <Pressable style={[st.closeBtn, { top: insets.top + 10 }]} onPress={closeLegal} hitSlop={16}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 40 }}>
                {legalPage === 'privacy' ? <PrivacyPolicyContent /> : <TermsConditionsContent />}
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
});

const st = StyleSheet.create({
  abs: { ...StyleSheet.absoluteFillObject, zIndex: 2500 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalWrap: { flex: 1 },
  content: { flex: 1 },
  // Fitted by the platform against its own bounds: sized here from the window
  // it is a render behind a rotation, and the art leaves a gap down one side.
  bgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 5, 20, 0.45)' },
  closeBtn: { position: 'absolute', right: 18, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  closeTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // The offer scrolls; the button below it does not. On a phone in landscape
  // there is no type size at which all of this fits in ~400pt of height, so
  // the last resort has to be reachable rather than clipped -- while the CTA
  // stays pinned where a thumb expects it.
  page: { flex: 1 },
  pageContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingBottom: 12 },
  pageContentShort: { paddingTop: 0, paddingBottom: 4 },
  // the three blocks share out whatever height the device has rather than
  // huddling in the middle of it: the heading rides at the top, and the space
  // left over becomes the gaps between the panels
  // A phone has barely more height than the offer needs, so sharing out what
  // is left over spaces it well. A tablet has hundreds of points spare, and
  // sharing those out pushes the timeline and the plan to arm's length -- so
  // there the gap is a fixed number and the block sits centred.
  pageColumn: { flex: 1, justifyContent: 'space-between' },
  pageColumnWide: { justifyContent: 'center', gap: 26 },
  // Sized by its content, not by a share of the viewport: `flex: 1` inside a
  // scroller would squeeze the offer back down to the height it doesn't fit
  // in, which is the thing the scroller is there to avoid.
  pageColumnShort: { flex: 0, gap: 10 },
  // Landscape is short on height and awash with width, so the two panels the
  // offer is made of sit beside each other instead of stacking -- which is
  // what lets the whole thing fit without a fold.
  offerRowShort: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  offerColumn: { gap: 24 },
  offerTimeline: { flex: 0.86 },
  offerPlan: { flex: 1.14 },
  columnShort: { maxWidth: 940 },
  headerBlock: { width: '100%' },
  // the trial card is a marketing page, not a form: stretched to a tablet's
  // full width the dot runs float in empty space and the timeline stops
  // reading as one journey. Capped and centred, the proportions hold at any size.
  column: { width: '100%', maxWidth: TRIAL_MAX_WIDTH, alignSelf: 'center' },
  header: { fontSize: 26, fontWeight: '800', color: '#FFD700', fontFamily: Fonts.rounded, textAlign: 'center', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontFamily: Fonts.sans, textAlign: 'center', marginBottom: 0, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  subBtn: { marginTop: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  subBtnInner: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  // Every point the pinned block gives back is a point the offer above it
  // keeps.
  subBtnShort: { marginTop: 6 },
  headerWide: { fontSize: 34, marginBottom: 6 },
  subWide: { fontSize: 18, lineHeight: 24 },
  stepPillTextWide: { fontSize: 17 },
  stepBodyWide: { fontSize: 16, lineHeight: 22, marginTop: 9 },
  premiumNameWide: { fontSize: 32 },
  premiumTrialWide: { fontSize: 25 },
  benefitTextWide: { fontSize: 18, lineHeight: 25 },
  upgradeNoteWide: { fontSize: 17, lineHeight: 23 },
  subBtnTextWide: { fontSize: 22 },
  subBtnText: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: Fonts.rounded, letterSpacing: 0.5 },
  subBtnInnerShort: { paddingVertical: 11 },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 },
  headerShort: { fontSize: 23, marginBottom: 2 },
  subShort: { fontSize: 13 },
  benefitsShort: { gap: 3 },
  legalRowShort: { marginTop: 4 },
  legalLink: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sans, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  starRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 6, marginBottom: 0 },
  subBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  timelineShort: { paddingVertical: 6 },
  timeline: { ...BOX_GLOW, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: FRAME_YELLOW, borderRadius: 20, backgroundColor: 'rgba(10,10,35,0.55)', paddingVertical: 13, paddingHorizontal: 5 },
  timelineLink: { flexDirection: 'row', alignItems: 'center' },
  timelineDot: { width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: FRAME_YELLOW },
  step: { flex: 1, alignItems: 'center', paddingHorizontal: 1 },
  stepPill: { marginTop: 7, paddingHorizontal: 13, paddingVertical: 5, borderRadius: 999 },
  stepPillAmber: { backgroundColor: '#FFC61A' },
  stepPillIndigo: { backgroundColor: '#4F46E5' },
  stepPillText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800', color: '#3A2600' },
  stepPillTextLight: { color: '#FFFFFF' },
  stepBody: { marginTop: 7, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 17.5, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  // the badge sits outside the clipped card: overflow:hidden is what lets the
  // artwork meet the border, and it would crop the badge off the top edge too
  premiumWrap: {},
  premiumCard: { ...BOX_GLOW, borderWidth: 1.5, borderColor: FRAME_YELLOW, borderRadius: 20, backgroundColor: 'rgba(10,10,35,0.5)', overflow: 'hidden' },
  popularBadge: { position: 'absolute', top: -13, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFC61A', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, zIndex: 2 },
  popularText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', color: '#4A2E00', letterSpacing: 0.6 },
  premiumCopyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // side by side, a phone leaves the benefits ~110pt and every one of them
  // wraps to three lines; stacked they each fit on one and the card halves
  premiumCopyStack: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
  premiumBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  premiumBodyShort: { paddingTop: 10, paddingBottom: 8 },
  upgradeRowCompact: { marginTop: 8, paddingTop: 8 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' },
  upgradeNote: { fontFamily: Fonts.rounded, fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#FFC61A', textAlign: 'center', flexShrink: 1 },
  premiumCopy: { flex: 1, justifyContent: 'center' },
  // stacked, the copy and the benefits sit in a column, where flex:1 is a
  // vertical share of a box with no height of its own -- they collapse to
  // nothing. Sized by their content instead.
  premiumColumnStacked: { flex: 0, alignSelf: 'stretch' },
  premiumNameShort: { fontSize: 21 },
  premiumTrialShort: { fontSize: 17 },
  benefitTextShort: { fontSize: 14, lineHeight: 19 },
  upgradeNoteShort: { fontSize: 13, lineHeight: 17 },
  premiumName: { fontFamily: Fonts.rounded, fontSize: 25, fontWeight: '800', color: '#FFFFFF' },
  premiumTrial: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '800', color: '#FFC61A', marginTop: 2 },
  premiumBenefits: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 5 },
  // flex-start, not center: a benefit that wraps to two lines would otherwise
  // hang its tick in the gap between them
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  benefitTick: { marginRight: 8, marginTop: 3 },
  benefitText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, color: '#FFFFFF', flex: 1 },
  legalPanel: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  legalPanelInner: { flex: 1, paddingHorizontal: 20 },

});