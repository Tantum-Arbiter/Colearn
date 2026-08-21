const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  })
);

const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  })
);

const scheduleNotificationAsync = jest.fn(() =>
  Promise.resolve('notification-id-123')
);

const cancelScheduledNotificationAsync = jest.fn(() =>
  Promise.resolve()
);

const cancelAllScheduledNotificationsAsync = jest.fn(() =>
  Promise.resolve()
);

const getAllScheduledNotificationsAsync = jest.fn(() =>
  Promise.resolve([])
);

const setNotificationHandler = jest.fn();

const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

const removeNotificationSubscription = jest.fn();

const NotificationTriggerInput = {};

const AndroidImportance = {
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

const AndroidNotificationVisibility = {
  UNKNOWN: 0,
  PUBLIC: 1,
  PRIVATE: 0,
  SECRET: -1,
};

const IosAuthorizationStatus = {
  NOT_DETERMINED: 0,
  DENIED: 1,
  AUTHORIZED: 2,
  PROVISIONAL: 3,
  EPHEMERAL: 4,
};

const IosAlertStyle = {
  NONE: 0,
  BANNER: 1,
  ALERT: 2,
};

// Trigger kinds used by reminder scheduling. Without these,
// SchedulableTriggerInputTypes.TIME_INTERVAL throws inside the service's own
// try/catch and every reminder silently fails to schedule.
const SchedulableTriggerInputTypes = {
  CALENDAR: 'calendar',
  DAILY: 'daily',
  DATE: 'date',
  MONTHLY: 'monthly',
  TIME_INTERVAL: 'timeInterval',
  WEEKLY: 'weekly',
  YEARLY: 'yearly',
};

module.exports = {
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
  NotificationTriggerInput,
  AndroidImportance,
  AndroidNotificationVisibility,
  IosAuthorizationStatus,
  IosAlertStyle,
};
