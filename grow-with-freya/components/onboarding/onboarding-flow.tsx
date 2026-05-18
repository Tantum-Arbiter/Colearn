import React, { useState, useRef, useEffect } from 'react';
import { Alert, View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { OnboardingScreen } from './onboarding-screen';
import { useAppStore } from '@/store/app-store';
import { preloadOnboardingImages } from '@/services/image-preloader';
import { ThemedText } from '../themed-text';
import { PrivacyPolicyContent } from '@/components/account/privacy-policy-screen';
import { TermsConditionsContent } from '@/components/account/terms-conditions-screen';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [legalView, setLegalView] = useState<'none' | 'privacy' | 'terms'>('none');
  const [legalViewVisible, setLegalViewVisible] = useState(false);
  const [dataSummaryExpanded, setDataSummaryExpanded] = useState(false);
  const { setOnboardingComplete, setCrashReportingEnabled, setConsent } = useAppStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Slide-in animation for legal overlay
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

  // Timeout cleanup refs
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onboardingScreens = [
    {
      title: t('onboarding.screens.welcome.title'),
      body: t('onboarding.screens.welcome.body'),
      illustration: 'family reading together',
      buttonLabel: t('onboarding.screens.welcome.button'),
    },
    {
      title: t('onboarding.screens.howItWorks.title'),
      body: t('onboarding.screens.howItWorks.body'),
      illustration: 'how-it-works',
      buttonLabel: t('onboarding.screens.howItWorks.button'),
    },
    {
      title: t('onboarding.screens.family.title'),
      body: t('onboarding.screens.family.body'),
      illustration: 'parent hugging child',
      buttonLabel: t('onboarding.screens.family.button'),
    },
    {
      title: t('onboarding.screens.consent.title'),
      body: t('onboarding.screens.consent.body'),
      illustration: 'consent',
      buttonLabel: t('onboarding.screens.consent.button'),
      showCrashReportingDialog: true,
    },
  ];

  const allConsentsChecked = consentPrivacy && consentTerms && consentData;
  const isConsentStep = currentStep === onboardingScreens.length - 1;

  // Proceed to next step (or complete onboarding)
  const proceedToNext = () => {
    setIsTransitioning(true);
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
    }
    nextTimeoutRef.current = setTimeout(() => {
      if (currentStep < onboardingScreens.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Store parental consent before completing
        const policyVersion = t('onboarding.screens.consent.policyVersion');
        setConsent(policyVersion);
        setOnboardingComplete(true);
        onComplete();
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleNext = () => {
    const currentScreenData = onboardingScreens[currentStep];

    // Show crash reporting consent dialog on that specific screen
    if (currentScreenData.showCrashReportingDialog) {
      Alert.alert(
        t('onboarding.crashReportingDialog.title'),
        t('onboarding.crashReportingDialog.body'),
        [
          {
            text: t('onboarding.crashReportingDialog.noThanks'),
            style: 'cancel',
            onPress: () => {
              setCrashReportingEnabled(false);
              // User declined crash reporting
              proceedToNext();
            },
          },
          {
            text: t('onboarding.crashReportingDialog.enable'),
            style: 'default',
            onPress: () => {
              setCrashReportingEnabled(true);
              // User enabled crash reporting
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
      }, 300);
    }
  };

  // Preload onboarding images when component mounts
  useEffect(() => {
    const loadOnboardingImages = async () => {
      try {
        const result = await preloadOnboardingImages();
        // Onboarding images preloaded
      } catch (error) {
        // Non-critical: images will load on demand
      }
    };

    loadOnboardingImages();
  }, []);

  // Cleanup timeouts on unmount
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

  const currentScreen = onboardingScreens[currentStep];

  // Data summary items with icon names
  const summaryItems: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
    { icon: 'person-outline', key: 'profile' },
    { icon: 'book-outline', key: 'reading' },
    { icon: 'time-outline', key: 'screenTime' },
    { icon: 'phone-portrait-outline', key: 'device' },
    { icon: 'shield-checkmark-outline', key: 'noSell' },
  ];

  // Render the collapsible data summary
  const renderDataSummary = () => (
    <View style={consentStyles.summaryContainer}>
      <Pressable
        testID="data-summary-toggle"
        style={consentStyles.summaryHeader}
        onPress={() => setDataSummaryExpanded(!dataSummaryExpanded)}
      >
        <View style={consentStyles.summaryHeaderRow}>
          <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" style={consentStyles.summaryHeaderIcon} />
          <ThemedText style={consentStyles.summaryHeaderText}>
            {t('onboarding.screens.consent.dataSummary.title')}
          </ThemedText>
        </View>
        <Ionicons name={dataSummaryExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#FFFFFF" />
      </Pressable>
      {dataSummaryExpanded && (
        <View style={consentStyles.summaryBody}>
          {summaryItems.map((item) => (
            <View key={item.key} style={consentStyles.summaryItemRow}>
              <Ionicons name={item.icon} size={15} color="#FFFFFF" style={consentStyles.summaryItemIcon} />
              <ThemedText style={consentStyles.summaryItem}>
                {t(`onboarding.screens.consent.dataSummary.${item.key}`)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Render consent checkboxes for the final screen
  const renderConsentContent = () => {
    const checkboxItems = [
      { key: 'privacy' as const, checked: consentPrivacy, toggle: () => setConsentPrivacy(!consentPrivacy), link: () => openLegalView('privacy') },
      { key: 'terms' as const, checked: consentTerms, toggle: () => setConsentTerms(!consentTerms), link: () => openLegalView('terms') },
      { key: 'data' as const, checked: consentData, toggle: () => setConsentData(!consentData) },
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
            <View style={[consentStyles.checkbox, item.checked && consentStyles.checkboxChecked]}>
              {item.checked && <ThemedText style={consentStyles.checkmark}>✓</ThemedText>}
            </View>
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
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <OnboardingScreen
        title={currentScreen.title}
        body={currentScreen.body}
        illustration={currentScreen.illustration}
        buttonLabel={currentScreen.buttonLabel}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentStep={currentStep + 1}
        totalSteps={onboardingScreens.length}
        isTransitioning={isTransitioning}
        customContent={isConsentStep ? renderConsentContent() : undefined}
        isNextDisabled={isConsentStep && !allConsentsChecked}
      />

      {/* Legal document overlay -slides in from top */}
      {legalViewVisible && (
        <Animated.View
          style={[
            consentStyles.legalOverlay,
            legalOverlayStyle,
          ]}
        >
          <View style={[consentStyles.legalOverlayInner, { paddingTop: insets.top }]}>
            {/* Title header */}
            <View style={consentStyles.legalHeader}>
              <ThemedText style={consentStyles.legalTitle}>
                {legalView === 'privacy'
                  ? t('onboarding.screens.consent.links.privacyPolicy')
                  : t('onboarding.screens.consent.links.termsConditions')}
              </ThemedText>
            </View>

            {/* Scrollable legal content */}
            <View style={{ flex: 1 }}>
              {legalView === 'privacy' && <PrivacyPolicyContent paddingTop={0} />}
              {legalView === 'terms' && <TermsConditionsContent paddingTop={0} />}
            </View>

            {/* Close button at the bottom */}
            <View style={[consentStyles.legalFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <Pressable
                testID="legal-modal-close"
                style={consentStyles.legalCloseButton}
                onPress={closeLegalView}
              >
                <Ionicons name="close-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
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
    marginTop: 16,
    gap: 14,
    paddingHorizontal: 4,
  },

  // --- Collapsible data summary ---
  summaryContainer: {
    backgroundColor: '#2E8B8B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryHeaderIcon: {
    marginRight: 8,
  },
  summaryHeaderText: {
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // --- Checkbox rows ---
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
    padding: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    color: '#2A2A2A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  linkText: {
    color: '#1A7A7A',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 4,
  },

  // --- Legal document overlay (slides from top) ---
  legalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  legalOverlayInner: {
    flex: 1,
    backgroundColor: '#0F1D45',
  },
  legalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: '#0F1D45',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  legalCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 160,
  },
  legalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
