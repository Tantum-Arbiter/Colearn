import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = StyleSheet.create({
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
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120, // Increased bottom padding
  },
  section: {
    marginBottom: 40, // Increased section spacing
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20, // Increased title spacing
  },
  
  // Usage Card Styles
  usageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24, // Increased padding
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10, // Added margin
  },
  usageHeader: {
    marginBottom: 20, // Increased spacing
  },
  usageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  usageTime: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  usageLimit: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginLeft: 8,
    flexShrink: 0,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 15, // Increased spacing
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  usagePercentage: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Age Selector Styles
  ageSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24, // Increased padding
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20, // Increased margin
  },
  currentAge: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20, // Increased spacing
    textAlign: 'center',
  },
  ageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ageButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ageButtonActive: {
    backgroundColor: 'rgba(76, 205, 196, 0.3)',
    borderColor: '#4ECDC4',
  },
  ageButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  ageButtonTextActive: {
    color: '#FFFFFF',
  },
  guidelines: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  

  dayBarFill: {
    width: '100%',
    borderRadius: 10,
    minHeight: 2,
  },
  dayLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  
  // Schedule Styles
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 18, // Increased padding
    marginBottom: 15, // Increased margin
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scheduleTime: {
    width: 60,
    alignItems: 'center',
    marginRight: 15,
  },
  scheduleTimeText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleActivity: {
    flex: 1,
  },
  scheduleActivityText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleDuration: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  scheduleNote: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  
  // Settings Styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#4ECDC4',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },

  // Chart Note
  chartNote: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20, // Changed from marginTop to marginBottom for better spacing
  },

  // Chart Container
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Heatmap Styles
  heatmapContainer: {
    marginTop: 10,
  },

  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  heatmapCorner: {
    width: 50,
    height: 25,
  },

  heatmapDayHeaderLabel: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },

  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  heatmapTimeLabel: {
    width: 50,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    paddingRight: 8,
  },

  heatmapCell: {
    flex: 1,
    height: 28,
    marginHorizontal: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  heatmapCellText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    fontWeight: 'bold',
  },

  heatmapLegend: {
    marginTop: 15,
    alignItems: 'center',
  },

  heatmapLegendTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },

  heatmapLegendContainer: {
    alignItems: 'center',
    width: '100%',
  },

  heatmapLegendScale: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    width: '100%',
  },

  heatmapLegendColorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },

  heatmapLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 4,
  },

  heatmapLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  heatmapRecommendedCell: {
    width: 24, // Bigger than normal cells (16px)
    height: 16,
  },

  // Daily Bar Chart Styles
  dailyBarChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 20,
    height: 180,
  },

  dailyBarContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },

  dailyBarLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },

  dailyBarWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: 120, // Fixed height for consistency
  },

  dailyBarBackground: {
    width: 32,
    height: 100, // Fixed container height
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Light background
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  dailyBarFill: {
    width: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 4, // Minimum visible height
  },

  dailyBarText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  heatmapLegendLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },

  heatmapLegendCell: {
    width: 16,
    height: 16,
    marginHorizontal: 1,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Enhanced Schedule Styles
  scheduleItemWarning: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  warningIcon: {
    fontSize: 12,
    marginLeft: 5,
  },
  emptySchedule: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  emptyScheduleText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  createScheduleButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  createScheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Schedule Creation Styles
  scheduleIntro: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scheduleIntroText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  recommendedTimes: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  recommendedTimesTitle: {
    color: '#81C784',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendedTimesText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 18,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  timeSlotTime: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timeSlotActivity: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    flex: 2,
    textAlign: 'right',
  },
  bedtimeWarning: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 20, // Increased padding
    marginTop: 20, // Added top margin
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  bedtimeWarningTitle: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12, // Increased spacing
  },
  bedtimeWarningText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 22, // Increased line height for better readability
  },


});
