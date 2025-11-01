import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { MoonBottomImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { MusicControl } from '@/components/ui/music-control';

interface TermsConditionsScreenProps {
  onBack: () => void;
}

export function TermsConditionsScreen({ onBack }: TermsConditionsScreenProps) {
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
            <Text style={styles.title}>Terms & Conditions</Text>
          </View>
          <MusicControl
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>End User Licence Agreement</Text>
            <Text style={styles.appInfo}>
              App: Grow with Freya{'\n'}
              Provider: Tantum Arbiter, United Kingdom{'\n'}
              Contact: support@growwithfreya.com{'\n'}
              Effective date: November 1, 2025{'\n'}
              Version: 1.0
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Who may use the app</Text>
            <Text style={styles.bodyText}>
              • The app is designed for children aged 0–6 only together with a parent or legal guardian.{'\n'}
              • A parent/guardian must create and manage the account and supervise all use.{'\n'}
              • By using the app, you confirm you are a parent/guardian and agree to these Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Licence</Text>
            <Text style={styles.bodyText}>
              We grant you a personal, non-exclusive, non-transferable licence to install and use the app on your iOS/Android devices for non-commercial purposes. We own all intellectual property in the app and its content unless stated otherwise.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Parent responsibilities</Text>
            <Text style={styles.bodyText}>
              • Complete the parental gate and provide any required consents before a child uses the app.{'\n'}
              • Review content before your child uses it and supervise use.{'\n'}
              • Keep your device secure; you are responsible for activity under your account.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Accounts & sign-in</Text>
            <Text style={styles.bodyText}>
              • You sign in using Apple or Google. We do not manage your password.{'\n'}
              • You may create multiple child profiles (name/alias + avatar). Do not use real names if you prefer anonymity.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Content and purchases</Text>
            <Text style={styles.bodyText}>
              • Some stories and media are free; additional content may be added via our content service/CMS.{'\n'}
              • No payments are available in this version of the app.{'\n'}
              • We may update, add, or remove content at any time.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Acceptable use</Text>
            <Text style={styles.bodyText}>
              You must not:{'\n'}
              • Attempt to reverse-engineer, copy, or modify the app;{'\n'}
              • Upload harmful code or misuse reporting channels;{'\n'}
              • Use the app in any unlawful or unsafe manner.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Safety & wellbeing</Text>
            <Text style={styles.bodyText}>
              The app supports co-use and short, structured sessions. It is not a substitute for real-world play or care. Follow your local pediatric guidance for screen time.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Privacy</Text>
            <Text style={styles.bodyText}>
              Our Privacy Policy explains what personal data we process and your rights. By using the app, you also agree to the Privacy Policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Availability & changes</Text>
            <Text style={styles.bodyText}>
              We aim to keep the app available but do not guarantee uninterrupted service. We may change features or these Terms. If changes are material, we will notify you in-app or by email.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Termination</Text>
            <Text style={styles.bodyText}>
              We may suspend or terminate your access if you breach these Terms or we must do so by law. You may stop using the app at any time and can request data erasure (see Privacy Policy).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Disclaimers</Text>
            <Text style={styles.bodyText}>
              The app is provided on an "as is" and "as available" basis. We do not guarantee that the app or content will meet your needs or be error-free.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Liability</Text>
            <Text style={styles.bodyText}>
              We do not exclude liability where it cannot be excluded by law (e.g., death or personal injury caused by negligence, fraud). Otherwise, to the maximum extent permitted by law, we are not liable for indirect or consequential losses. Our total liability relating to the app will not exceed £100.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Third-party services</Text>
            <Text style={styles.bodyText}>
              Apple and Google sign-in and app store terms apply in addition to these Terms. They are not responsible for support or claims relating to the app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Governing law</Text>
            <Text style={styles.bodyText}>
              These Terms are governed by the laws of England & Wales. Courts of England & Wales have exclusive jurisdiction, unless your mandatory local consumer rights require otherwise.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>15. Contact</Text>
            <Text style={styles.bodyText}>
              Questions? support@growwithfreya.com. You can also write to Tantum Arbiter, United Kingdom.
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
