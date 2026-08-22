import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Svg, {
  Circle,
  Polyline,
  Polygon,
  Line,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

import { useAppStore } from '../../store/app-store';
import { useAccessibility } from '@/hooks/use-accessibility';
import { AVATAR_OPTIONS } from '../onboarding/onboarding-pages';
import { formatDurationCompact } from '../../utils/time-formatting';
import { Fonts } from '@/constants/theme';

/** Palette for the parent dashboard cards, shared with the design mock. */
const TEAL = '#4ECDC4';
const PURPLE = '#6D5DF5';
const CARD_BG = 'rgba(255, 255, 255, 0.05)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.10)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.65)';
const TEXT_FAINT = 'rgba(255, 255, 255, 0.45)';
const ACTIVE_GREEN = '#2EE6A8';

// the two stat cards sit side by side as in the design, so the ring and chart
// are sized for a half-width card on a phone
const RING_SIZE = 82;
const RING_STROKE = 9;
const CHART_HEIGHT = 88;

// the cut-out planet art (560x465) floats top-right: full top visible, right
// edge bled off-screen, base ending behind the opaque child chip
const EARTH_WIDTH = 226;
const EARTH_HEIGHT = Math.round(EARTH_WIDTH * (465 / 560));

export interface DailyTotalPoint {
  /** YYYY-MM-DD */
  date: string;
  seconds: number;
}

export interface UsageOverviewProps {
  todayUsageSeconds: number;
  dailyLimitSeconds: number;
  /** Per-day totals, oldest first, ending today; at least 30 entries. */
  dailyTotals: DailyTotalPoint[];
  /** Short day names indexed Sunday-first, already translated. */
  dayNames: string[];
}

const RANGES = [
  { days: 7, labelKey: 'screenTime.sevenDay' },
  { days: 14, labelKey: 'screenTime.fourteenDay' },
  { days: 30, labelKey: 'screenTime.thirtyDay' },
] as const;

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * The parent-facing screen-time dashboard hero: greeting with the earth art,
 * child chip, today's usage ring, the 7-day trend line and an encouragement
 * banner. Laid out like the design mock: the two stat cards share a row.
 */
export function UsageOverview({
  todayUsageSeconds,
  dailyLimitSeconds,
  dailyTotals,
  dayNames,
}: UsageOverviewProps) {
  const { t, i18n } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const { userNickname, userAvatarId } = useAppStore();

  const avatar =
    AVATAR_OPTIONS.find((a) => a.key === userAvatarId) ?? AVATAR_OPTIONS[0];
  const childName = userNickname?.trim() || '';

  const remaining = Math.max(dailyLimitSeconds - todayUsageSeconds, 0);
  const withinLimit = todayUsageSeconds < dailyLimitSeconds;
  const progress =
    dailyLimitSeconds > 0
      ? Math.min(todayUsageSeconds / dailyLimitSeconds, 1)
      : 0;

  // ring geometry
  const r = (RING_SIZE - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;

  // trend chart: a per-date series over the selected range, ending today
  const [chartWidth, setChartWidth] = useState(0);
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const trend = useMemo(() => {
    // label cadence widens with the range so "30 Jul"-style labels never crowd
    const labelEvery = rangeDays === 7 ? 1 : rangeDays === 14 ? 4 : 7;
    const dotEvery = rangeDays === 7 ? 1 : rangeDays === 14 ? 2 : 5;
    let formatDate = (d: Date) => `${d.getDate()}`;
    try {
      const fmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });
      formatDate = (d: Date) => fmt.format(d);
    } catch {
      // fall back to plain day numbers if the locale data is unavailable
    }
    const slice = dailyTotals.slice(-rangeDays);
    return slice.map((p, i) => {
      const d = new Date(`${p.date}T12:00:00`);
      const fromEnd = slice.length - 1 - i;
      const isToday = fromEnd === 0;
      return {
        date: p.date,
        label:
          fromEnd % labelEvery !== 0
            ? ''
            : rangeDays === 7
              ? dayNames[d.getDay()] ?? ''
              : formatDate(d),
        dot: fromEnd % dotEvery === 0,
        // the stored sessions lag the live session, so today mirrors the ring
        usage: isToday ? Math.max(p.seconds, todayUsageSeconds) : p.seconds,
      };
    });
  }, [dailyTotals, dayNames, rangeDays, todayUsageSeconds, i18n.language]);

  const peak = Math.max(...trend.map((p) => p.usage), dailyLimitSeconds, 1);
  // round the axis top up to a whole hour so gridlines land on friendly ticks
  const axisTop = Math.max(Math.ceil(peak / 3600), 1) * 3600;

  const points = useMemo(() => {
    if (chartWidth <= 0 || trend.length < 2) return [];
    const stepX = chartWidth / (trend.length - 1);
    return trend.map((p, i) => ({
      x: i * stepX,
      y: CHART_HEIGHT - (p.usage / axisTop) * CHART_HEIGHT,
    }));
  }, [trend, chartWidth, axisTop]);

  const activeRange = RANGES.find((r) => r.days === rangeDays) ?? RANGES[0];

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area =
    points.length > 0
      ? `0,${CHART_HEIGHT} ${polyline} ${chartWidth},${CHART_HEIGHT}`
      : '';

  const hours = axisTop / 3600;
  const axisTicks = [hours, hours / 2, 0];

  return (
    <View testID="usage-overview">
      {/* Greeting with the planet floating off the trailing edge */}
      <View style={styles.headerBlock}>
        <View style={styles.earthWrap} pointerEvents="none">
          <Image
            testID="usage-earth"
            source={require('@/assets/images/screen-time/dashboard-earth.webp')}
            style={styles.earthImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.greetingBlock}>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { fontSize: scaledFontSize(26) }]}>
              {t(`storyGarden.greeting.${greetingKey()}`)}
            </Text>
            <Image
              source={require('@/assets/images/screen-time/star-happy.webp')}
              style={styles.greetingStar}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.greetingSub, { fontSize: scaledFontSize(14) }]}>
            {childName
              ? t('screenTime.helpingStayBalanced', { name: childName })
              : t('screenTime.helpingStayBalancedGeneric')}
          </Text>
        </View>
      </View>

      {/* Child chip */}
      <View style={styles.childCard} testID="usage-child-chip">
        <Image source={avatar.art} style={styles.childAvatar} resizeMode="contain" />
        <View style={styles.childMeta}>
          <Text style={[styles.childName, { fontSize: scaledFontSize(16) }]} numberOfLines={1}>
            {childName || t('screenTime.yourChild')}
          </Text>
        </View>
        <View style={styles.activeRow}>
          <View style={styles.activeDot} />
          <Text style={[styles.activeText, { fontSize: scaledFontSize(12) }]}>
            {t('screenTime.activeNow')}
          </Text>
        </View>
      </View>

      {/* Today's Screen Time + Screen Time Trend, sharing a row per the design */}
      <View style={styles.statsRow}>
        <View style={[styles.card, styles.statCard]} testID="usage-today-card">
          <View style={styles.cardHeader}>
            <View style={[styles.iconChip, { backgroundColor: 'rgba(78, 205, 196, 0.16)' }]}>
              <Ionicons name="time-outline" size={scaledFontSize(14)} color={TEAL} />
            </View>
            <Text
              style={[styles.cardTitle, { fontSize: scaledFontSize(12) }]}
              numberOfLines={2}
            >
              {t('screenTime.todaysScreenTime')}
            </Text>
            <Ionicons
              name="information-circle-outline"
              size={scaledFontSize(14)}
              color={TEXT_FAINT}
            />
          </View>

          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} testID="usage-ring">
              <Defs>
                <SvgGradient id="usageRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={TEAL} />
                  <Stop offset="1" stopColor={PURPLE} />
                </SvgGradient>
              </Defs>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={r}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={r}
                stroke="url(#usageRing)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${c} ${c}`}
                strokeDashoffset={c * (1 - progress)}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.ringCentre} pointerEvents="none">
              <Text
                testID="usage-ring-value"
                style={[styles.ringValue, { fontSize: scaledFontSize(15) }]}
              >
                {formatDurationCompact(todayUsageSeconds)}
              </Text>
              <Text style={[styles.ringCaption, { fontSize: scaledFontSize(8) }]}>
                {t('screenTime.ofLimit', { limit: formatDurationCompact(dailyLimitSeconds) })}
              </Text>
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: TEAL }]} />
              <Text style={[styles.legendLabel, { fontSize: scaledFontSize(11) }]}>
                {t('screenTime.used')}
              </Text>
              <Text style={[styles.legendValue, { fontSize: scaledFontSize(11) }]}>
                {formatDurationCompact(todayUsageSeconds)}
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: PURPLE }]} />
              <Text style={[styles.legendLabel, { fontSize: scaledFontSize(11) }]}>
                {t('screenTime.remaining')}
              </Text>
              <Text style={[styles.legendValue, { fontSize: scaledFontSize(11) }]}>
                {formatDurationCompact(remaining)}
              </Text>
            </View>
            <View style={styles.legendRow}>
              <Text style={[styles.legendLabel, { fontSize: scaledFontSize(11) }]}>
                {t('screenTime.dailyLimitLabel')}
              </Text>
              <Text style={[styles.legendValue, { fontSize: scaledFontSize(11) }]}>
                {formatDurationCompact(dailyLimitSeconds)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.statCard]} testID="usage-trend-card">
          <View style={styles.cardHeader}>
            <View style={[styles.iconChip, { backgroundColor: 'rgba(109, 93, 245, 0.18)' }]}>
              <Ionicons name="calendar-outline" size={scaledFontSize(13)} color={PURPLE} />
            </View>
            <Text
              style={[styles.cardTitle, { fontSize: scaledFontSize(12) }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t('screenTime.screenTimeTrend')}
            </Text>
            <Pressable
              style={styles.rangePill}
              onPress={() => setRangeMenuOpen((open) => !open)}
              testID="usage-range-pill"
              accessibilityRole="button"
              accessibilityLabel={t(activeRange.labelKey)}
            >
              <Text style={[styles.rangePillText, { fontSize: scaledFontSize(10) }]}>
                {t(activeRange.labelKey)}
              </Text>
              <Ionicons
                name={rangeMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={scaledFontSize(10)}
                color={TEXT_DIM}
              />
            </Pressable>
          </View>

          {rangeMenuOpen && (
            <View style={styles.rangeMenu} testID="usage-range-menu">
              {RANGES.map((range) => (
                <Pressable
                  key={range.days}
                  style={styles.rangeOption}
                  onPress={() => {
                    setRangeDays(range.days);
                    setRangeMenuOpen(false);
                  }}
                  testID={`usage-range-${range.days}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.rangeOptionText,
                      { fontSize: scaledFontSize(11) },
                      range.days === rangeDays && styles.rangeOptionActive,
                    ]}
                  >
                    {t(range.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.chartRow}>
            <View style={styles.axis}>
              {axisTicks.map((h) => (
                <Text key={`tick-${h}`} style={[styles.axisLabel, { fontSize: scaledFontSize(9) }]}>
                  {h > 0 ? `${h}h` : '0'}
                </Text>
              ))}
            </View>
            <View
              testID="usage-chart-area"
              style={styles.chartArea}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
            >
              {chartWidth > 0 && (
                <Svg width={chartWidth} height={CHART_HEIGHT} testID="usage-trend-chart">
                  <Defs>
                    <SvgGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={TEAL} stopOpacity="0.25" />
                      <Stop offset="1" stopColor={TEAL} stopOpacity="0.02" />
                    </SvgGradient>
                  </Defs>
                  {[0.5, 1].map((f) => (
                    <Line
                      key={`grid-${f}`}
                      x1={0}
                      x2={chartWidth}
                      y1={CHART_HEIGHT * (1 - f)}
                      y2={CHART_HEIGHT * (1 - f)}
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeWidth={1}
                    />
                  ))}
                  {area ? <Polygon points={area} fill="url(#trendFill)" /> : null}
                  {polyline ? (
                    <Polyline
                      points={polyline}
                      fill="none"
                      stroke={TEAL}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {points.map((p, i) =>
                    trend[i]?.dot ? (
                      <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={rangeDays === 30 ? 2.5 : 3} fill={TEAL} />
                    ) : null
                  )}
                </Svg>
              )}
              <View style={styles.chartLabels}>
                {trend.map((p) => (
                  <Text
                    key={`day-${p.date}`}
                    style={[styles.chartLabel, { fontSize: scaledFontSize(8) }]}
                  >
                    {p.label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Encouragement banner */}
      <View
        style={[styles.banner, !withinLimit && styles.bannerOver]}
        testID="usage-banner"
      >
        <Image
          source={require('@/assets/images/screen-time/shield-check.webp')}
          style={styles.bannerShield}
          resizeMode="contain"
        />
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { fontSize: scaledFontSize(14) }]}>
            {withinLimit ? t('screenTime.withinLimitTitle') : t('screenTime.overLimitTitle')}
          </Text>
          <Text style={[styles.bannerBody, { fontSize: scaledFontSize(12) }]}>
            {withinLimit ? t('screenTime.withinLimitBody') : t('screenTime.overLimitBody')}
          </Text>
        </View>
        <Image
          source={require('@/assets/images/screen-time/star-happy.webp')}
          style={styles.bannerStar}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 14,
    minHeight: 118,
    justifyContent: 'center',
  },
  // bleeds past the scroll padding: full top visible, right edge cut by the
  // screen, base running behind the child chip
  earthWrap: {
    position: 'absolute',
    right: -46,
    top: -6,
    width: EARTH_WIDTH,
    height: EARTH_HEIGHT,
  },
  earthImage: {
    width: '100%',
    height: '100%',
  },
  greetingBlock: {
    maxWidth: '58%',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  greetingStar: {
    width: 26,
    height: 22,
  },
  greetingSub: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
    marginTop: 4,
    lineHeight: 19,
  },
  // opaque: the earth art ends behind this card, so it must cut, not glow through
  childCard: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141A3C',
    borderWidth: 1,
    borderColor: 'rgba(46, 230, 168, 0.35)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  childAvatar: {
    width: 44,
    height: 44,
  },
  childMeta: {
    flex: 1,
  },
  childName: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACTIVE_GREEN,
  },
  activeText: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 12,
  },
  statCard: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  rangePillText: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
  },
  // small opaque dropdown under the pill; the card's stacking keeps it above
  // the chart
  rangeMenu: {
    position: 'absolute',
    top: 44,
    right: 12,
    zIndex: 20,
    backgroundColor: '#141A3C',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  rangeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rangeOptionText: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
  },
  rangeOptionActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: 'center',
    marginBottom: 10,
  },
  ringCentre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ringCaption: {
    fontFamily: Fonts.rounded,
    color: TEXT_FAINT,
    marginTop: 1,
  },
  legend: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    flex: 1,
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
  },
  legendValue: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartRow: {
    flexDirection: 'row',
    gap: 5,
  },
  axis: {
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  axisLabel: {
    fontFamily: Fonts.rounded,
    color: TEXT_FAINT,
  },
  chartArea: {
    flex: 1,
    paddingRight: 14,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  chartLabel: {
    fontFamily: Fonts.rounded,
    color: TEXT_FAINT,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(46, 230, 168, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(46, 230, 168, 0.25)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  bannerOver: {
    backgroundColor: 'rgba(255, 159, 67, 0.07)',
    borderColor: 'rgba(255, 159, 67, 0.30)',
  },
  bannerShield: {
    width: 42,
    height: 45,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerBody: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
    marginTop: 2,
    lineHeight: 17,
  },
  bannerStar: {
    width: 40,
    height: 35,
  },
});
