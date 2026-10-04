import React, { useState, useRef, useEffect } from 'react';
import { Alert, View, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { OnboardingScreen } from './onboarding-screen';
import { TogetherPage, TogetherBackdrop, SafetyPage, SafetyBackdrop, ReadyPage, ReadyBackdrop, ProfilePage } from './onboarding-pages';
import { MIN_NICKNAME_LENGTH } from '@/constants/profile';
import { GOLD, CARD_BG, CARD_BORDER, TEXT_MUTED, NIGHT_BASE } from './onboarding-theme';
import { useAppStore } from '@/store/app-store';
import { preloadOnboardingImages } from '@/services/image-preloader';
import { ThemedText } from '../themed-text';
import { PrivacyPolicyContent } from '@/components/account/privacy-policy-screen';
import { TermsConditionsContent } from '@/components/account/terms-conditions-screen';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type StepId = 'together' | 'safe' | 'ready' | 'consent' | 'profile';

const STEP_ORDER: StepId[] = ['together', 'safe', 'ready', 'consent', 'profile'];

// Every illustrated step hangs its hero on the shell's full-bleed backdrop layer
// so the art fades in with the header rather than sliding up late with the
// content. The form steps have no hero.
const STEP_BACKDROPS: Partial<Record<StepId, React.ReactNode>> = {
  together: <TogetherBackdrop />,
  safe: <SafetyBackdrop />,
  ready: <ReadyBackdrop />,
};
const CONSENT_INDEX = STEP_ORDER.indexOf('consent');
const DEFAULT_AGE_MONTHS = 36;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [legalView, setLegalView] = useState<'none' | 'privacy' | 'terms'>('none');
  const [legalViewVisible, setLegalViewVisible] = useState(false);
  const [dataSummaryExpanded, setDataSummaryExpanded] = useState(false);
  const [nickname, setNickname] = useState('');
  // avatarType still feeds the store's gender-based story filtering; the picker
  // on this screen now chooses the animal avatar, which is stored as avatarId
  const [avatarType] = useState<'boy' | 'girl'>('girl');
  const [avatarKey, setAvatarKey] = useState('bear');
  const [ageMonths, setAgeMonths] = useState(DEFAULT_AGE_MONTHS);
  const {
    setOnboardingComplete,
    setCrashReportingEnabled,
    setConsent,
    setUserProfile,
    setChildAge,
  } = useAppStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const screenHeight = Dimensions.get('window').height;
  const legalSlideY = useSharedValue(-screenHeight);

  const legalOverlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: legalSlideY.value }],
  }));

  const openLegalView = (view: 'privacy' | 'terms') => {
    setLegalView(view);
    setLegalViewVisible(true);
    legalSlideY.value = -screenHeight;
    legalSlideY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  };

  const closeLegalView = () => {
    legalSlideY.value = withTiming(-screenHeight, { duration: 450, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(setLegalViewVisible)(false);
      runOnJS(setLegalView)('none');
    });
  };

  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepId = STEP_ORDER[currentStep];
  const isConsentStep = stepId === 'consent';
  const isProfileStep = stepId === 'profile';
  const allConsentsChecked = consentPrivacy && consentTerms && consentData;
  // Profile setup can no longer be skipped, so the nickname is required before
  // Continue will fire
  const hasNickname = nickname.trim().length >= MIN_NICKNAME_LENGTH;

  const finishOnboarding = () => {
    setUserProfile(nickname.trim(), avatarType, avatarKey);
    setChildAge(ageMonths);
    setOnboardingComplete(true);
    onComplete();
  };

  const goToStep = (index: number) => {
    setIsTransitioning(true);
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
    }
    nextTimeoutRef.current = setTimeout(() => {
      setCurrentStep(index);
      setIsTransitioning(false);
    }, 250);
  };

  const proceedToNext = () => {
    if (isProfileStep) {
      finishOnboarding();
      return;
    }
    if (isConsentStep) {
      setConsent(t('onboarding.screens.consent.policyVersion'));
    }
    goToStep(currentStep + 1);
  };

  const handleNext = () => {
    // Crash-reporting choice is asked once, as the consent step is completed
    if (isConsentStep) {
      Alert.alert(
        t('onboarding.crashReportingDialog.title'),
        t('onboarding.crashReportingDialog.body'),
        [
          {
            text: t('onboarding.crashReportingDialog.noThanks'),
            style: 'cancel',
            onPress: () => {
              setCrashReportingEnabled(false);
              proceedToNext();
            },
          },
          {
            text: t('onboarding.crashReportingDialog.enable'),
            style: 'default',
            onPress: () => {
              setCrashReportingEnabled(true);
              proceedToNext();
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    proceedToNext();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      if (prevTimeoutRef.current) {
        clearTimeout(prevTimeoutRef.current);
      }
      prevTimeoutRef.current = setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsTransitioning(false);
      }, 250);
    }
  };

  // Skipping the intro jumps to consent. Neither consent nor profile setup can
  // be skipped -- the shell is handed no onSkip on those steps.
  const handleSkip = () => {
    goToStep(CONSENT_INDEX);
  };

  useEffect(() => {
    const loadOnboardingImages = async () => {
      try {
        await preloadOnboardingImages();
      } catch {
        // Non-critical: images will load on demand
      }
    };

    loadOnboardingImages();
  }, []);

  useEffect(() => {
    return () => {
      if (nextTimeoutRef.current) {
        clearTimeout(nextTimeoutRef.current);
      }
      if (prevTimeoutRef.current) {
        clearTimeout(prevTimeoutRef.current);
      }
    };
  }, []);

  const summaryItems: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
    { icon: 'person-outline', key: 'profile' },
    { icon: 'book-outline', key: 'reading' },
    { icon: 'time-outline', key: 'screenTime' },
    { icon: 'phone-portrait-outline', key: 'device' },
    { icon: 'shield-checkmark-outline', key: 'noSell' },
  ];

  const renderDataSummary = () => (
    <View style={consentStyles.summaryContainer}>
      <Pressable
        testID="data-summary-toggle"
        style={consentStyles.summaryHeader}
        onPress={() => setDataSummaryExpanded(!dataSummaryExpanded)}
      >
        <Image
          testID="consent-art-collect"
          source={require('@/assets/images/onboarding/consent-collect.webp')}
          style={consentStyles.rowIcon}
          resizeMode="contain"
        />
        <ThemedText style={consentStyles.summaryHeaderText}>
          {t('onboarding.screens.consent.dataSummary.title')}
        </ThemedText>
        <Ionicons
          name={dataSummaryExpanded ? 'chevron-up' : 'chevron-forward'}
          size={18}
          color={GOLD}
        />
      </Pressable>
      {dataSummaryExpanded && (
        <View style={consentStyles.summaryBody}>
          {summaryItems.map((item) => (
            <View key={item.key} style={consentStyles.summaryItemRow}>
              <Ionicons name={item.icon} size={15} color={GOLD} style={consentStyles.summaryItemIcon} />
              <ThemedText style={consentStyles.summaryItem}>
                {t(`onboarding.screens.consent.dataSummary.${item.key}`)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderConsentContent = () => {
    const checkboxItems = [
      {
        key: 'privacy' as const,
        art: require('@/assets/images/onboarding/consent-privacy.webp'),
        checked: consentPrivacy,
        toggle: () => setConsentPrivacy(!consentPrivacy),
        link: () => openLegalView('privacy'),
      },
      {
        key: 'terms' as const,
        art: require('@/assets/images/onboarding/consent-terms.webp'),
        checked: consentTerms,
        toggle: () => setConsentTerms(!consentTerms),
        link: () => openLegalView('terms'),
      },
      {
        key: 'data' as const,
        art: require('@/assets/images/onboarding/consent-data.webp'),
        checked: consentData,
        toggle: () => setConsentData(!consentData),
        link: undefined,
      },
    ];

    return (
      <View style={consentStyles.container}>
        {renderDataSummary()}

        {checkboxItems.map((item) => (
          <Pressable
            key={item.key}
            testID={`consent-checkbox-${item.key}`}
            style={consentStyles.checkboxRow}
            onPress={item.toggle}
          >
            <Image
              testID={`consent-art-${item.key}`}
              source={item.art}
              style={consentStyles.rowIcon}
              resizeMode="contain"
            />
            <View style={consentStyles.checkboxTextContainer}>
              <ThemedText style={consentStyles.checkboxLabel}>
                {t(`onboarding.screens.consent.checkboxes.${item.key}`)}
              </ThemedText>
              {item.link && (
                <Pressable testID={`consent-link-${item.key}`} onPress={item.link}>
                  <ThemedText style={consentStyles.linkText}>
                    {t(`onboarding.screens.consent.links.${item.key === 'privacy' ? 'privacyPolicy' : 'termsConditions'}`)}
                  </ThemedText>
                </Pressable>
              )}
            </View>
            <View style={[consentStyles.checkbox, item.checked && consentStyles.checkboxChecked]}>
              {item.checked && <Ionicons name="checkmark" size={16} color={NIGHT_BASE} />}
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const stepContent: Record<StepId, { title: string; body?: string; content: React.ReactNode; buttonLabel: string }> = {
    together: {
      title: t('onboardingV2.together.title'),
      content: <TogetherPage />,
      buttonLabel: t('onboarding.screens.welcome.button'),
    },
    safe: {
      title: t('onboardingV2.safe.title'),
      content: <SafetyPage />,
      buttonLabel: t('onboarding.screens.welcome.button'),
    },
    ready: {
      title: t('onboardingV2.ready.title'),
      content: <ReadyPage />,
      buttonLabel: t('onboarding.screens.welcome.button'),
    },
    consent: {
      title: t('onboarding.screens.consent.title'),
      body: t('onboarding.screens.consent.body'),
      content: renderConsentContent(),
      buttonLabel: t('onboarding.screens.consent.button'),
    },
    profile: {
      title: t('onboardingV2.profile.title'),
      content: (
        <ProfilePage
          nickname={nickname}
          onNicknameChange={setNickname}
          avatarKey={avatarKey}
          onAvatarKeyChange={setAvatarKey}
          ageMonths={ageMonths}
          onAgeChange={setAgeMonths}
        />
      ),
      // a plain label: interpolating the nickname grew the button past the
      // edge of the screen on longer names
      buttonLabel: t('onboardingV2.profile.continue'),
    },
  };

  const current = stepContent[stepId];

  return (
    <View style={{ flex: 1 }}>
      <OnboardingScreen
        title={current.title}
        body={current.body}
        buttonLabel={current.buttonLabel}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={isConsentStep || isProfileStep ? undefined : handleSkip}
        currentStep={currentStep + 1}
        totalSteps={STEP_ORDER.length}
        isTransitioning={isTransitioning}
        customContent={current.content}
        isNextDisabled={(isConsentStep && !allConsentsChecked) || (isProfileStep && !hasNickname)}
        backdrop={STEP_BACKDROPS[stepId]}
      />

      {legalViewVisible && (
        <Animated.View style={[consentStyles.legalOverlay, legalOverlayStyle]}>
          <View style={[consentStyles.legalOverlayInner, { paddingTop: insets.top }]}>
            <View style={consentStyles.legalHeader}>
              <ThemedText style={consentStyles.legalTitle}>
                {legalView === 'privacy'
                  ? t('onboarding.screens.consent.links.privacyPolicy')
                  : t('onboarding.screens.consent.links.termsConditions')}
              </ThemedText>
            </View>

            <View style={{ flex: 1 }}>
              {legalView === 'privacy' && <PrivacyPolicyContent paddingTop={0} />}
              {legalView === 'terms' && <TermsConditionsContent paddingTop={0} />}
            </View>

            <View style={[consentStyles.legalFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <Pressable
                testID="legal-modal-close"
                style={consentStyles.legalCloseButton}
                onPress={closeLegalView}
              >
                <Ionicons name="close-outline" size={20} color={NIGHT_BASE} style={{ marginRight: 6 }} />
                <ThemedText style={consentStyles.legalCloseText}>
                  {t('onboarding.screens.consent.closeLabel', 'Close')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const consentStyles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: 12,
  },
  summaryContainer: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
  // the discs carry their own field and rim, so no container styling here
  rowIcon: {
    width: 54,
    height: 54,
  },
  summaryHeaderText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryItemIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  summaryItem: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    padding: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  linkText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  legalOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  legalOverlayInner: {
    flex: 1,
    backgroundColor: NIGHT_BASE,
  },
  legalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  legalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  legalFooter: {
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: NIGHT_BASE,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  legalCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 160,
  },
  legalCloseText: {
    color: NIGHT_BASE,
    fontSize: 16,
    fontWeight: '600',
  },
});
