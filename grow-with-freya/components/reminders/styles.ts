import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 50, // Higher than moon image (z-index 1)
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 50, // Higher than moon image
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 70, // Above all other content
  },

  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 40,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 8,
  },

  statItem: {
    alignItems: 'center',
    minWidth: 70,
    flex: 1,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(78, 205, 196, 1.0)',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  createFirstButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },

  createFirstButtonText: {
    color: 'rgba(78, 205, 196, 1.0)',
    fontSize: 16,
    fontWeight: '600',
  },

  // Reminders
  remindersContainer: {
    paddingBottom: 20,
    zIndex: 60, // Higher than container
  },

  daySection: {
    marginBottom: 24,
  },

  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    paddingLeft: 4,
  },

  reminderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 55, // Above background elements
  },

  reminderContent: {
    padding: 16,
  },

  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
    marginRight: 12,
  },

  reminderTime: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(78, 205, 196, 1.0)',
  },

  reminderMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },

  reminderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },

  toggleButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },

  toggleButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },

  toggleButtonTextActive: {
    color: '#4CAF50',
  },

  toggleButtonTextInactive: {
    color: 'rgba(255, 255, 255, 0.5)',
  },

  deleteButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },

  // Create Reminder Form
  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },

  // Templates
  templatesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },

  templateCard: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },

  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(78, 205, 196, 1.0)',
    marginBottom: 6,
  },

  templateMessage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },

  // Form Inputs
  inputGroup: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },

  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Day Selector
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  dayButtonSelected: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderColor: 'rgba(78, 205, 196, 0.4)',
  },

  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },

  dayButtonTextSelected: {
    color: 'rgba(78, 205, 196, 1.0)',
    fontWeight: '600',
  },

  // Time Button
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  timeButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    flex: 1,
  },

  timeOptionsContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  timeOptionButton: {
    width: '23%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  timeOptionButtonSelected: {
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
    borderColor: 'rgba(78, 205, 196, 0.6)',
  },

  timeOptionButtonConflict: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
    borderColor: 'rgba(255, 99, 71, 0.5)',
  },

  timeOptionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },

  timeOptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },

  timeOptionTextSelected: {
    color: 'rgba(78, 205, 196, 1)',
    fontWeight: 'bold',
  },

  timeOptionTextConflict: {
    color: 'rgba(255, 99, 71, 1)',
  },

  timeOptionTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },

  activityIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(78, 205, 196, 1)',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  conflictHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  customTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Create Button
  createButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.8)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 1.0)',
    shadowColor: 'rgba(78, 205, 196, 0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100, // Highest priority - always clickable
  },

  createButtonDisabled: {
    opacity: 0.5,
  },

  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
