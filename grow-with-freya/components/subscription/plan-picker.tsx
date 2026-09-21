import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import type { PlanPricing } from '@/services/subscription-service';
import { fallbackAnnualOriginal, fallbackPrices, type PlanId } from '@/constants/fallback-prices';

export type { PlanId } from '@/constants/fallback-prices';

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  details: string[];
  exclusions?: string[];
  badge?: string;
  originalPrice?: string;
  hasTrial?: boolean;
}

export type LivePrices = Record<string, PlanPricing | null> | null;

export function buildPlans(t: (key: string) => string, livePrices: LivePrices): Plan[] {
  const fallback = fallbackPrices();
  const basicPrice = livePrices?.monthly_basic?.priceString ?? fallback.monthly_basic;
  const premiumPrice = livePrices?.monthly_premium?.priceString ?? fallback.monthly_premium;
  const annualPrice = livePrices?.yearly?.priceString ?? fallback.yearly;

  return [
    { id: 'monthly_basic', name: t('subscription.planBasic'), price: basicPrice, period: t('subscription.perMonth'), hasTrial: true,
      details: [t('subscription.detail50Stories'), t('subscription.detailAllLearning'), t('subscription.detailLimitedSongs'), t('subscription.detailSyncDevices')],
      exclusions: [t('subscription.detailAllSongs'), t('subscription.detailAllInstruments')] },
    { id: 'monthly_premium', name: t('subscription.planPremium'), price: premiumPrice, period: t('subscription.perMonth'), badge: t('subscription.mostPopular'),
      details: [t('subscription.detailAllStories'), t('subscription.detailDownload100'), t('subscription.detailAllSongs'), t('subscription.detailAllInstruments')] },
    { id: 'yearly', name: t('subscription.planAnnual'), price: annualPrice, period: t('subscription.perYear'), badge: t('subscription.percentOff'), originalPrice: fallbackAnnualOriginal(),
      details: [t('subscription.detailEverythingPremium'), t('subscription.detailSave25')] },
  ];
}

export interface PlanPickerProps {
  planIds: PlanId[];
  selectedPlan: PlanId;
  onSelect: (planId: PlanId) => void;
  livePrices: LivePrices;
  showTrialNote?: boolean;
  /**
   * Whether selecting a plan opens its feature list. Off where the screen
   * already spells the features out above the picker, which would otherwise
   * print the same four lines twice.
   */
  showDetails?: boolean;
}

/**
 * The three-plan price list, lifted out of the trial screen so the end-of-trial
 * upgrade offer can show the same cards without the two drifting apart.
 */
export const PlanPicker = React.memo(function PlanPicker({
  planIds,
  selectedPlan,
  onSelect,
  livePrices,
  showTrialNote = true,
  showDetails = true,
}: PlanPickerProps) {
  const { t } = useTranslation();
  const plans = React.useMemo(() => buildPlans(t, livePrices), [t, livePrices]);

  return (
    <>
      {plans
        .filter((plan) => planIds.includes(plan.id))
        .map((plan) => {
          const sel = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              testID={`plan-card-${plan.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              onPress={() => onSelect(plan.id)}
              style={[st.planCard, sel && st.planCardSel]}
            >
              {plan.badge ? (
                <View style={[st.badge, plan.id === 'yearly' ? st.badgeGreen : st.badgeAmber]}>
                  <Text style={st.badgeText}>{plan.badge}</Text>
                </View>
              ) : null}
              <View style={st.planRow}>
                <View style={[st.radio, sel && st.radioSel]}>{sel ? <View style={st.radioDot} /> : null}</View>
                <View style={{ flex: 1 }}>
                  <View style={st.planNameRow} testID={`plan-name-row-${plan.id}`}>
                    <Text style={st.planName}>{plan.name}</Text>
                    {plan.hasTrial && showTrialNote ? (
                      <Text style={st.planTrialNote} testID={`plan-trial-note-${plan.id}`}>
                        {t('subscription.trial.includesTrial')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={st.priceRow}>
                    <Text style={st.planPrice}>{plan.price}<Text style={st.planPeriod}>{plan.period}</Text></Text>
                    {plan.originalPrice ? <Text style={st.planOrigPrice}>{plan.originalPrice}</Text> : null}
                  </View>
                </View>
              </View>
              {sel && showDetails ? (
                <View style={st.planDetails}>
                  {plan.details.map((d, i) => (
                    <View key={i} style={st.detailRow}>
                      <Ionicons name="checkmark" size={15} color="#fff" style={st.detailIcon} />
                      <Text style={st.detailText}>{d}</Text>
                    </View>
                  ))}
                  {plan.exclusions?.map((d, i) => (
                    <View key={`x${i}`} style={st.detailRow} testID={`plan-exclusion-${plan.id}-${i}`}>
                      <Ionicons name="close" size={15} color="#F98A8A" style={st.detailIcon} />
                      <Text style={[st.detailText, st.detailTextExcluded]}>{d}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
    </>
  );
});

const st = StyleSheet.create({
  // opaque enough to read over the paywall's background artwork, which the
  // old near-transparent fills let straight through the price
  planCard: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: 'rgba(10,10,35,0.62)' },
  planCardSel: { borderColor: '#F59E0B', backgroundColor: 'rgba(74,48,6,0.66)' },
  badge: { position: 'absolute', top: -10, right: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeAmber: { backgroundColor: '#F59E0B' },
  badgeGreen: { backgroundColor: '#10B981' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: Fonts.rounded },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: '#F59E0B' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B' },
  planName: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: Fonts.rounded, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  planTrialNote: { fontSize: 12, fontWeight: '600', color: '#8FE3B0', fontFamily: Fonts.rounded },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#FFD700', fontFamily: Fonts.rounded, marginTop: 2 },
  planOrigPrice: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.rounded, textDecorationLine: 'line-through', marginTop: 2 },
  planPeriod: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  planDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailIcon: { marginRight: 6, marginTop: 1 },
  detailText: { fontSize: 13, color: '#fff', fontFamily: Fonts.sans, flex: 1 },
  detailTextExcluded: { color: 'rgba(255,255,255,0.55)' },
});
