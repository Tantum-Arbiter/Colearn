import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { PrivacyPolicyContent } from '@/components/account/privacy-policy-screen';
import { TermsConditionsContent } from '@/components/account/terms-conditions-screen';
import { useAppStore } from '@/store/app-store';
import { mapPlanIdToPackage, purchasePackage, getOfferings, getOfferingPrices, type PlanPricing } from '@/services/subscription-service';

type PlanId = 'monthly_basic' | 'monthly_premium' | 'yearly';
interface Plan { id: PlanId; name: string; price: string; period: string; details: string[]; badge?: string; originalPrice?: string; hasTrial?: boolean; }

// --- Fallback pricing (shown before RC offerings load or in dev mode) ---
const FALLBACK_PRICES: Record<PlanId, string> = {
  monthly_basic: '$5.99',
  monthly_premium: '$9.99',
  yearly: '$89.99',
};
const FALLBACK_ANNUAL_ORIGINAL = '$119.88';

function buildPlans(
  t: (key: string) => string,
  livePrices: Record<string, PlanPricing | null> | null,
): Plan[] {
  const basicPrice = livePrices?.monthly_basic?.priceString ?? FALLBACK_PRICES.monthly_basic;
  const premiumPrice = livePrices?.monthly_premium?.priceString ?? FALLBACK_PRICES.monthly_premium;
  const annualPrice = livePrices?.yearly?.priceString ?? FALLBACK_PRICES.yearly;
  // For the "was" price, we can't pull a struck-through price from RC — keep fallback
  const annualOriginal = FALLBACK_ANNUAL_ORIGINAL;

  return [
    { id: 'monthly_basic', name: t('subscription.planBasic'), price: basicPrice, period: t('subscription.perMonth'), hasTrial: true,
      details: [t('subscription.detailAllStories'), t('subscription.detailAllLearning'), t('subscription.detailDownload50'), t('subscription.detailLimitedSongs'), t('subscription.detailSyncDevices')] },
    { id: 'monthly_premium', name: t('subscription.planPremium'), price: premiumPrice, period: t('subscription.perMonth'), badge: t('subscription.mostRecommended'), hasTrial: true,
      details: [t('subscription.detailAllStories'), t('subscription.detailDownload100'), t('subscription.detailAllSongs'), t('subscription.detailAllInstruments')] },
    { id: 'yearly', name: t('subscription.planAnnual'), price: annualPrice, period: t('subscription.perYear'), badge: t('subscription.percentOff'), originalPrice: annualOriginal,
      details: [t('subscription.detailEverythingPremium'), t('subscription.detailSave25')] },
  ];
}

const ANIM_MS = 350;

const TRIAL_FALLBACK_PRICE = '£9.99 / $9.99';

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

const TRIAL_LINK_DOTS = 7;

const TRIAL_BENEFIT_KEYS = [
  'subscription.trial.benefitStories',
  'subscription.trial.benefitMoreLater',
  'subscription.trial.benefitMusic',
  'subscription.trial.benefitNoAds',
  'subscription.trial.benefitDevices',
  'subscription.trial.benefitCancel',
];

const TRIAL_PREMIUM_ART = require('../../assets/images/subscription/premium-music.webp');

/** The hero sky's own stars -- the design's are lit, and a glyph cannot be. */
const STAR_SMALL = require('../../assets/images/home-sky/star-small.webp');
const STAR_MEDIUM = require('../../assets/images/home-sky/star-medium.webp');
const STAR_LARGE = require('../../assets/images/home-sky/star-large.webp');

const TRIAL_STARS = [
  { source: STAR_SMALL, size: 13 },
  { source: STAR_MEDIUM, size: 23 },
  { source: STAR_LARGE, size: 40 },
  { source: STAR_MEDIUM, size: 23 },
  { source: STAR_SMALL, size: 13 },
];

interface Props { visible: boolean; onClose: () => void; }

export const SubscriptionOverlay = React.memo(function SubscriptionOverlay({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly_premium');
  const [livePrices, setLivePrices] = useState<Record<string, PlanPricing | null> | null>(null);
  const plans = useMemo(() => buildPlans(t, livePrices), [t, livePrices]);
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const { isGuestMode, setGuestMode, setShowLoginAfterOnboarding } = useAppStore();
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

  const trialPrice = livePrices?.monthly_premium?.priceString ?? TRIAL_FALLBACK_PRICE;

  if (!visible) return null;

  const renderPlan = (plan: Plan) => {
    const sel = selectedPlan === plan.id;
    return (
      <Pressable
        key={plan.id}
        testID={`plan-card-${plan.id}`}
        accessibilityRole="button"
        accessibilityState={{ selected: sel }}
        onPress={() => setSelectedPlan(plan.id)}
        style={[st.planCard, sel && st.planCardSel]}
      >
        {plan.badge ? <View style={[st.badge, plan.id === 'yearly' ? st.badgeGreen : st.badgeAmber]}>
          <Text style={st.badgeText}>{plan.badge}</Text></View> : null}
        <View style={st.planRow}>
          <View style={[st.radio, sel && st.radioSel]}>{sel ? <View style={st.radioDot} /> : null}</View>
          <View style={{ flex: 1 }}>
            <View style={st.planNameRow} testID={`plan-name-row-${plan.id}`}>
              <Text style={st.planName}>{plan.name}</Text>
              {plan.hasTrial ? (
                <Text style={st.planTrialNote} testID={`plan-trial-note-${plan.id}`}>
                  {t('subscription.trial.includesTrial')}
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={st.planPrice}>{plan.price}<Text style={st.planPeriod}>{plan.period}</Text></Text>
              {plan.originalPrice ? <Text style={st.planOrigPrice}>{plan.originalPrice}</Text> : null}
            </View>

          </View>
        </View>
        {sel ? <View style={st.planDetails}>
          {plan.details.map((d, i) => (
            <View key={i} style={st.detailRow}>
              <Ionicons name="checkmark" size={15} color="#fff" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={st.detailText}>{d}</Text>
            </View>
          ))}
        </View> : null}
      </Pressable>
    );
  };

  return (
    <View style={st.abs}>
      <Animated.View style={[st.backdrop, bdStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>
      </Animated.View>
      <Animated.View style={[st.modalWrap, modalStyle]}>
        <LinearGradient colors={['#1a1a3e', '#0d0d2b', '#050515']}
          style={[st.content, { paddingBottom: insets.bottom + 16, paddingTop: insets.top + 20 }]}>
          {/* Background art */}
          <Image
            source={require('../../assets/images/ui-elements/story-art-strip-subscribe.webp')}
            style={[st.bgImage, { width: screenW, height: screenH }]}
            resizeMode="cover"
          />
          <View style={st.bgOverlay} />
          <Pressable style={[st.closeBtn, { top: insets.top + 10 }]} onPress={handleClose} hitSlop={16}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
            <View style={st.starRow} testID="trial-star-cluster">
              {TRIAL_STARS.map((star, i) => (
                <Image
                  key={i}
                  source={star.source}
                  style={{ width: star.size, height: star.size }}
                  resizeMode="contain"
                />
              ))}
            </View>
            <Text style={st.header}>{t('subscription.trial.title')}</Text>
            <Text style={st.sub}>{t('subscription.trial.subtitle', { price: trialPrice })}</Text>

            <View style={st.timeline} testID="trial-timeline">
              {TRIAL_STEPS.map((step, i) => (
                <React.Fragment key={step.labelKey}>
                  {i > 0 ? (
                    <View style={st.timelineLink} testID={`trial-link-${i - 1}`}>
                      {Array.from({ length: TRIAL_LINK_DOTS }).map((_, d) => (
                        <View key={d} style={st.timelineDot} testID="trial-link-dot" />
                      ))}
                    </View>
                  ) : null}
                  <View style={st.step} testID={`trial-step-${i}`}>
                    <Image
                      testID={`trial-step-icon-${i}`}
                      source={step.icon}
                      style={st.stepIcon}
                      resizeMode="contain"
                    />
                    <View style={[st.stepPill, step.pill === 'indigo' ? st.stepPillIndigo : st.stepPillAmber]}>
                      <Text style={[st.stepPillText, step.pill === 'indigo' ? st.stepPillTextLight : null]}>
                        {t(step.labelKey)}
                      </Text>
                    </View>
                    <Text style={st.stepBody}>{t(step.bodyKey, { price: trialPrice })}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <View style={st.premiumCard} testID="trial-premium-card">
              <View style={st.popularBadge}>
                <MaterialCommunityIcons name="crown" size={15} color="#4A2E00" />
                <Text style={st.popularText}>{t('subscription.trial.mostPopular')}</Text>
              </View>
              <View style={st.premiumRow}>
                <Image
                  testID="trial-premium-art"
                  source={TRIAL_PREMIUM_ART}
                  style={st.premiumArt}
                  resizeMode="contain"
                />
                <View style={st.premiumCopy}>
                  <Text style={st.premiumName}>{t('subscription.trial.planName')}</Text>
                  <Text style={st.premiumTrial}>{t('subscription.trial.planTrial')}</Text>
                  <Text style={st.premiumPrice}>
                    {t('subscription.trial.planPrice', { price: trialPrice })}
                  </Text>
                </View>
                <View style={st.premiumBenefits}>
                  {TRIAL_BENEFIT_KEYS.map((key, i) => (
                    <View key={key} style={st.benefitRow} testID={`trial-benefit-${i}`}>
                      <Ionicons name="checkmark" size={15} color="#FFC61A" style={{ marginRight: 8 }} />
                      <Text style={st.benefitText}>{t(key)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Pressable
              testID="unlock-plan-toggle"
              accessibilityRole="button"
              accessibilityState={{ expanded: plansOpen }}
              accessibilityLabel={t('subscription.exploreOptions')}
              onPress={() => setPlansOpen((open) => !open)}
              style={st.plansToggle}
            >
              <Text style={st.plansToggleText}>{t('subscription.exploreOptions')}</Text>
              <Ionicons name={plansOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.8)" />
            </Pressable>

            {plansOpen ? (
              <View testID="unlock-plan-section">
                <Text style={st.plansHint}>{t('subscription.choosePlan')}</Text>
                {plans.map(renderPlan)}
              </View>
            ) : null}
          </ScrollView>
          <Pressable style={st.subBtn} disabled={isPurchasing} onPress={() => {
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
                const pkg = mapPlanIdToPackage(selectedPlan);
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
            <LinearGradient colors={['#F59E0B', '#D97706']} style={[st.subBtnInner, isPurchasing && { opacity: 0.6 }]}>
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={st.subBtnRow}>
                  <Text style={st.subBtnText}>{isGuestMode ? t('subscription.signInToSubscribe') : t('subscription.trial.cta')}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </Pressable>
          <View style={st.legalRow}>
            <Pressable onPress={() => openLegal('privacy')}>
              <Text style={st.legalLink}>{t('subscription.privacyPolicy')}</Text>
            </Pressable>
            <Text style={st.legalDot}>|</Text>
            <Pressable onPress={() => openLegal('terms')}>
              <Text style={st.legalLink}>{t('subscription.termsAndConditions')}</Text>
            </Pressable>
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
  content: { flex: 1, paddingHorizontal: 20 },
  bgImage: { position: 'absolute', top: 0, left: 0, opacity: 0.35 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 5, 20, 0.45)' },
  closeBtn: { position: 'absolute', right: 18, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  closeTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scroll: { paddingTop: 8, paddingBottom: 16 },
  header: { fontSize: 26, fontWeight: '800', color: '#FFD700', fontFamily: Fonts.rounded, textAlign: 'center', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontFamily: Fonts.sans, textAlign: 'center', marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  planCard: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  planCardSel: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' },
  badge: { position: 'absolute', top: -10, right: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeAmber: { backgroundColor: '#F59E0B' },
  badgeGreen: { backgroundColor: '#10B981' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: Fonts.rounded },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: '#F59E0B' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B' },
  planName: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: Fonts.rounded, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  planOrigPrice: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.rounded, textDecorationLine: 'line-through', marginTop: 2 },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#FFD700', fontFamily: Fonts.rounded, marginTop: 2 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  planTrialNote: { fontSize: 12, fontWeight: '600', color: '#8FE3B0', fontFamily: Fonts.rounded },
  planPeriod: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  planDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailText: { fontSize: 13, color: '#fff', fontFamily: Fonts.sans, flex: 1 },
  subBtn: { marginTop: 4, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  subBtnInner: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  subBtnText: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: Fonts.rounded, letterSpacing: 0.5 },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 },
  legalLink: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sans, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 },
  subBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: 'rgba(255,198,26,0.55)', borderRadius: 20, backgroundColor: 'rgba(10,10,35,0.55)', paddingVertical: 18, paddingHorizontal: 10, marginBottom: 18 },
  timelineLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 44 },
  timelineDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,198,26,0.85)' },
  step: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  stepIcon: { width: 78, height: 78 },
  stepPill: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  stepPillAmber: { backgroundColor: '#FFC61A' },
  stepPillIndigo: { backgroundColor: '#4F46E5' },
  stepPillText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800', color: '#3A2600' },
  stepPillTextLight: { color: '#FFFFFF' },
  stepBody: { marginTop: 8, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  premiumCard: { borderWidth: 1.5, borderColor: 'rgba(255,198,26,0.75)', borderRadius: 20, backgroundColor: 'rgba(10,10,35,0.5)', paddingTop: 24, paddingBottom: 16, paddingHorizontal: 14, marginBottom: 18 },
  popularBadge: { position: 'absolute', top: -13, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFC61A', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  popularText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', color: '#4A2E00', letterSpacing: 0.6 },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumArt: { width: 138, height: 176, marginLeft: -10, marginVertical: -14 },
  premiumCopy: { flex: 1.1, justifyContent: 'center' },
  premiumName: { fontFamily: Fonts.rounded, fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  premiumTrial: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '800', color: '#FFC61A', marginTop: 2 },
  premiumPrice: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  premiumBenefits: { flex: 1, justifyContent: 'center', gap: 5 },
  benefitRow: { flexDirection: 'row', alignItems: 'center' },
  benefitText: { fontFamily: Fonts.sans, fontSize: 13, color: '#FFFFFF', flex: 1 },
  plansToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(0,0,0,0.28)', marginBottom: 12 },
  plansToggleText: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  plansHint: { fontFamily: Fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 12 },
  legalPanel: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  legalPanelInner: { flex: 1, paddingHorizontal: 20 },

});