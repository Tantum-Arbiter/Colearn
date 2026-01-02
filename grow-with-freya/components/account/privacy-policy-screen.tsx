import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { MusicControl } from '@/components/ui/music-control';
import { MoonBottomImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

interface PrivacyPolicyContentProps {
  paddingTop?: number;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, isTablet, contentMaxWidth } = useAccessibility();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={VISUAL_EFFECTS.GRADIENT_COLORS}
        style={styles.gradient}
      >
        {/* Moon bottom background image */}
        <View style={mainMenuStyles.bearContainer} pointerEvents="none">
          <MoonBottomImage />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
          <Pressable style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={onBack}>
            <Text style={[styles.backButtonText, { fontSize: scaledFontSize(16) }]}>← Back</Text>
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>Privacy Policy</Text>
          </View>
          <MusicControl
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Dimensions.get('window').height * 0.2 }, isTablet && { alignItems: 'center' }]}
        >
          <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>UK/EU GDPR & Child-Appropriate</Text>
            <Text style={[styles.appInfo, { fontSize: scaledFontSize(14) }]}>
              App: Grow with Freya{'\n'}
              Controller: Tantum Arbiter, United Kingdom{'\n'}
              Contact (privacy): privacy@growwithfreya.com{'\n'}
              Data Protection Officer: N/A{'\n'}
              Effective date: November 1, 2025{'\n'}
              Version: 1.0
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>1. What this policy covers</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              This explains what personal data we collect, why we collect it, how we use it, and your rights. The app is intended for children aged 0–6 used with a parent/guardian. The parent/guardian is the account holder.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>2. What data we collect</Text>
            <Text style={[styles.subsectionTitle, { fontSize: scaledFontSize(16) }]}>2.1 Data you provide</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • Parent account sign-in: Your Apple/Google account identifier (token), not your password.{'\n'}
              • Child profiles: Display name/alias and avatar selection.{'\n'}
              • Consents: Records of parent/guardian consents (terms version, consent scope, timestamp).{'\n'}
              • Device registration: Device identifier, platform, and model to keep profiles in sync.{'\n'}
              • Support: Emails or messages you send us.
            </Text>

            <Text style={[styles.subsectionTitle, { fontSize: scaledFontSize(16) }]}>2.2 Data we do not collect in MVP</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • No advertising identifiers, no third-party ads, no behavioral tracking.{'\n'}
              • No payment data.{'\n'}
              • No voice recordings (voice features are deferred).{'\n'}
              • No precise location.
            </Text>

            <Text style={[styles.subsectionTitle, { fontSize: scaledFontSize(16) }]}>2.3 Automatic data (app operations)</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • Basic diagnostic logs (timestamp, route, status, duration).{'\n'}
              • Crash data on your device if you opt in to OS crash reporting.{'\n'}
              • Pseudonymous device identifier (for security, abuse prevention, and secure access – cannot identify a person, not shared with third parties).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>3. Why we use your data (lawful bases)</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • Contract: To provide the app, sign you in, sync content, and show your profiles.{'\n'}
              • Consent: To record parental consent and any optional features that require it.{'\n'}
              • Legal obligation: To respond to data subject requests.{'\n'}
              • Legitimate interests (minimal, balanced): Security, fraud prevention, service analytics strictly necessary to operate the app. We process a pseudonymous device identifier to protect the app, prevent abuse, and ensure secure access. This identifier cannot be used to identify a person and is not shared with third parties.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>4. How we use the data</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • Authenticate the parent/guardian account via Apple/Google.{'\n'}
              • Create and manage child profiles and keep them in sync across your devices.{'\n'}
              • Record and honour consent choices.{'\n'}
              • Deliver stories and media from our content service/CMS.{'\n'}
              • Provide support and maintain service security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>5. Children&apos;s data &amp; parental consent</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • The app is used with a parent/guardian.{'\n'}
              • We only process children&apos;s data (profile alias and avatar) with verifiable parental consent collected via the in-app parental gate.{'\n'}
              • Parents can review, export, or delete children&apos;s data at any time (see Section 9).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>6. Data sharing</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              We use carefully chosen processors to run the app, for example:{'\n'}
              • Cloud hosting & object storage for content and profile data.{'\n'}
              • Apple/Google for sign-in.{'\n\n'}
              Processors act on our instructions and are bound by contracts and appropriate safeguards.{'\n\n'}
              We do not sell personal data. We do not share data with advertisers.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>7. International transfers</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              If we transfer data outside the UK/EU, we use recognised safeguards, such as UK Addendum to SCCs / EU SCCs or a valid adequacy decision. Details are available on request.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>8. Data retention</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              • Account data & profiles: kept while your account is active.{'\n'}
              • Consent records: kept for 7 years for compliance.{'\n'}
              • Diagnostics logs: up to 30 days, unless required to investigate issues.{'\n\n'}
              When you request erasure, we delete personal data without undue delay unless retention is required by law.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>9. Your rights (UK/EU)</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              You can exercise these rights by emailing privacy@growwithfreya.com:{'\n'}
              • Access (copy of your data){'\n'}
              • Rectification (fix inaccuracies){'\n'}
              • Erasure (delete data){'\n'}
              • Restriction (limit processing){'\n'}
              • Portability (get data in a machine-readable format){'\n'}
              • Objection (where we rely on legitimate interests){'\n'}
              • Withdraw consent (for consent-based features){'\n\n'}
              You also have the right to complain to the UK ICO or your local data protection authority. UK ICO: https://ico.org.uk
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>10. Security</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              We use industry-standard security, including:{'\n'}
              • Encrypted transport (HTTPS) and secure storage for private data.{'\n'}
              • Short-lived session tokens; verification on each API call.{'\n'}
              • Principle of least privilege for staff and systems.{'\n\n'}
              No system is 100% secure. If we learn of a breach impacting your data, we will notify you and authorities where required.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>11. Cookies & tracking</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              The mobile app does not use third-party tracking cookies. If a future web dashboard uses cookies, we will present a separate cookie notice and choices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>12. Third-party sign-in (Apple/Google)</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              When you choose Apple/Google to sign in, they process your data under their own privacy policies. We receive only what&apos;s necessary to authenticate you (an ID token) and do not receive your password.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>13. Changes to this policy</Text>
            <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
              We may update this policy. We will post updates in-app and revise the Effective date. For significant changes, we will give you reasonable notice.
            </Text>
          </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  appInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  bodyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
});

// Content-only component for embedding in horizontal scroll
export function PrivacyPolicyContent({ paddingTop = 0 }: PrivacyPolicyContentProps) {
  const { scaledFontSize, isTablet, contentMaxWidth } = useAccessibility();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Dimensions.get('window').height * 0.2, paddingTop },
        isTablet && { alignItems: 'center' }
      ]}
    >
      <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>UK/EU GDPR & Child-Appropriate</Text>
          <Text style={[styles.appInfo, { fontSize: scaledFontSize(14) }]}>
            App: Grow with Freya{'\n'}
            Controller: Tantum Arbiter, United Kingdom{'\n'}
            Contact (privacy): privacy@growwithfreya.com{'\n'}
            Data Protection Officer: N/A{'\n'}
            Effective date: November 1, 2025{'\n'}
            Version: 1.0
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>1. What this policy covers</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            This explains what personal data we collect, why we collect it, how we use it, and your rights. The app is intended for children aged 0–6 used with a parent/guardian. The parent/guardian is the account holder.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>2. What data we collect</Text>
          <Text style={[styles.subsectionTitle, { fontSize: scaledFontSize(16) }]}>2.1 Data you provide</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • Parent account sign-in: Your Apple/Google account identifier (token), not your password.{'\n'}
            • Child profiles: Display name/alias and avatar selection.{'\n'}
            • Consents: Records of parent/guardian consents (terms version, consent scope, timestamp).{'\n'}
            • Device registration: Device identifier, platform, and model to keep profiles in sync.{'\n'}
            • Support: Emails or messages you send us.
          </Text>

          <Text style={[styles.subsectionTitle, { fontSize: scaledFontSize(16) }]}>2.2 Data we do not collect in MVP</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • No advertising identifiers, no third-party ads, no behavioral tracking.{'\n'}
            • No payment data.{'\n'}
            • No voice recordings (voice features are deferred).{'\n'}
            • No precise location.
          </Text>

          <Text style={[styles.subsectionTitle, { fontSize: scaledFontSize(16) }]}>2.3 Automatic data (app operations)</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • Basic diagnostic logs (timestamp, route, status, duration).{'\n'}
            • Crash data on your device if you opt in to OS crash reporting.{'\n'}
            • Pseudonymous device identifier (for security, abuse prevention, and secure access – cannot identify a person, not shared with third parties).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>3. Why we use your data (lawful bases)</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • Contract: To provide the app, sign you in, sync content, and show your profiles.{'\n'}
            • Consent: To record parental consent and any optional features that require it.{'\n'}
            • Legal obligation: To respond to data subject requests.{'\n'}
            • Legitimate interests (minimal, balanced): Security, fraud prevention, service analytics strictly necessary to operate the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>4. How we use the data</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • Authenticate the parent/guardian account via Apple/Google.{'\n'}
            • Create and manage child profiles and keep them in sync across your devices.{'\n'}
            • Record and honour consent choices.{'\n'}
            • Deliver stories and media from our content service/CMS.{'\n'}
            • Provide support and maintain service security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>5. Children&apos;s data &amp; parental consent</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • The app is used with a parent/guardian.{'\n'}
            • We only process children&apos;s data (profile alias and avatar) with verifiable parental consent.{'\n'}
            • Parents can review, export, or delete children&apos;s data at any time (see Section 9).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>6. Data sharing</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            We use carefully chosen processors to run the app:{'\n'}
            • Cloud hosting & object storage for content and profile data.{'\n'}
            • Apple/Google for sign-in.{'\n\n'}
            We do not sell personal data. We do not share data with advertisers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>7. International transfers</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            If we transfer data outside the UK/EU, we use recognised safeguards, such as UK Addendum to SCCs / EU SCCs or a valid adequacy decision.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>8. Data retention</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            • Account data & profiles: kept while your account is active.{'\n'}
            • Consent records: kept for 7 years for compliance.{'\n'}
            • Diagnostics logs: up to 30 days.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>9. Your rights (UK/EU)</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            You can exercise these rights by emailing privacy@growwithfreya.com:{'\n'}
            • Access, Rectification, Erasure, Restriction, Portability, Objection, Withdraw consent{'\n\n'}
            You also have the right to complain to the UK ICO or your local data protection authority.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>10. Security</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            We use industry-standard security, including encrypted transport (HTTPS) and secure storage.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>11. Contact</Text>
          <Text style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}>
            Questions? privacy@growwithfreya.com
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
