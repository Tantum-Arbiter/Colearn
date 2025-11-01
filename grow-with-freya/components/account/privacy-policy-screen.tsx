import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { MoonBottomImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { MusicControl } from '@/components/ui/music-control';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  const insets = useSafeAreaInsets();

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
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Privacy Policy</Text>
          </View>
          <MusicControl
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UK/EU GDPR & Child-Appropriate</Text>
            <Text style={styles.appInfo}>
              App: Grow with Freya{'\n'}
              Controller: Tantum Arbiter, United Kingdom{'\n'}
              Contact (privacy): privacy@growwithfreya.com{'\n'}
              Data Protection Officer: N/A{'\n'}
              Effective date: November 1, 2025{'\n'}
              Version: 1.0
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. What this policy covers</Text>
            <Text style={styles.bodyText}>
              This explains what personal data we collect, why we collect it, how we use it, and your rights. The app is intended for children aged 0–6 used with a parent/guardian. The parent/guardian is the account holder.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. What data we collect</Text>
            <Text style={styles.subsectionTitle}>2.1 Data you provide</Text>
            <Text style={styles.bodyText}>
              • Parent account sign-in: Your Apple/Google account identifier (token), not your password.{'\n'}
              • Child profiles: Display name/alias and avatar selection.{'\n'}
              • Consents: Records of parent/guardian consents (terms version, consent scope, timestamp).{'\n'}
              • Device registration: Device identifier, platform, and model to keep profiles in sync.{'\n'}
              • Support: Emails or messages you send us.
            </Text>
            
            <Text style={styles.subsectionTitle}>2.2 Data we do not collect in MVP</Text>
            <Text style={styles.bodyText}>
              • No advertising identifiers, no third-party ads, no behavioral tracking.{'\n'}
              • No payment data.{'\n'}
              • No voice recordings (voice features are deferred).{'\n'}
              • No precise location.
            </Text>

            <Text style={styles.subsectionTitle}>2.3 Automatic data (app operations)</Text>
            <Text style={styles.bodyText}>
              • Basic diagnostic logs (timestamp, route, status, duration).{'\n'}
              • Crash data on your device if you opt in to OS crash reporting.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Why we use your data (lawful bases)</Text>
            <Text style={styles.bodyText}>
              • Contract: To provide the app, sign you in, sync content, and show your profiles.{'\n'}
              • Consent: To record parental consent and any optional features that require it.{'\n'}
              • Legal obligation: To respond to data subject requests.{'\n'}
              • Legitimate interests (minimal, balanced): Security, fraud prevention, service analytics strictly necessary to operate the app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. How we use the data</Text>
            <Text style={styles.bodyText}>
              • Authenticate the parent/guardian account via Apple/Google.{'\n'}
              • Create and manage child profiles and keep them in sync across your devices.{'\n'}
              • Record and honour consent choices.{'\n'}
              • Deliver stories and media from our content service/CMS.{'\n'}
              • Provide support and maintain service security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Children's data & parental consent</Text>
            <Text style={styles.bodyText}>
              • The app is used with a parent/guardian.{'\n'}
              • We only process children's data (profile alias and avatar) with verifiable parental consent collected via the in-app parental gate.{'\n'}
              • Parents can review, export, or delete children's data at any time (see Section 9).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Data sharing</Text>
            <Text style={styles.bodyText}>
              We use carefully chosen processors to run the app, for example:{'\n'}
              • Cloud hosting & object storage for content and profile data.{'\n'}
              • Apple/Google for sign-in.{'\n\n'}
              Processors act on our instructions and are bound by contracts and appropriate safeguards.{'\n\n'}
              We do not sell personal data. We do not share data with advertisers.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. International transfers</Text>
            <Text style={styles.bodyText}>
              If we transfer data outside the UK/EU, we use recognised safeguards, such as UK Addendum to SCCs / EU SCCs or a valid adequacy decision. Details are available on request.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Data retention</Text>
            <Text style={styles.bodyText}>
              • Account data & profiles: kept while your account is active.{'\n'}
              • Consent records: kept for 7 years for compliance.{'\n'}
              • Diagnostics logs: up to 30 days, unless required to investigate issues.{'\n\n'}
              When you request erasure, we delete personal data without undue delay unless retention is required by law.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Your rights (UK/EU)</Text>
            <Text style={styles.bodyText}>
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
            <Text style={styles.sectionTitle}>10. Security</Text>
            <Text style={styles.bodyText}>
              We use industry-standard security, including:{'\n'}
              • Encrypted transport (HTTPS) and secure storage for private data.{'\n'}
              • Short-lived session tokens; verification on each API call.{'\n'}
              • Principle of least privilege for staff and systems.{'\n\n'}
              No system is 100% secure. If we learn of a breach impacting your data, we will notify you and authorities where required.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Cookies & tracking</Text>
            <Text style={styles.bodyText}>
              The mobile app does not use third-party tracking cookies. If a future web dashboard uses cookies, we will present a separate cookie notice and choices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Third-party sign-in (Apple/Google)</Text>
            <Text style={styles.bodyText}>
              When you choose Apple/Google to sign in, they process your data under their own privacy policies. We receive only what's necessary to authenticate you (an ID token) and do not receive your password.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Changes to this policy</Text>
            <Text style={styles.bodyText}>
              We may update this policy. We will post updates in-app and revise the Effective date. For significant changes, we will give you reasonable notice.
            </Text>
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
    padding: 8,
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
    textShadowRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
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
    textShadowRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
