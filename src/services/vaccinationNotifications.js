import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'vaccination-reminders';

let initializationPromise;

export async function initializeVaccinationNotifications() {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(
            ANDROID_CHANNEL_ID,
            {
              name: 'Vaccination reminders',
              importance: Notifications.AndroidImportance.HIGH,
              sound: 'default',
            }
          );
        }

        const settings =
          await Notifications.getPermissionsAsync();

        let granted = settings.granted;

        if (!granted) {
          const requested =
            await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }

        return granted;
      } catch (error) {
        console.error(
          'Could not initialize vaccination notifications:',
          error
        );
        return false;
      }
    })();
  }

  const result = await initializationPromise;

  if (!result) {
    initializationPromise = null;
  }

  return result;
}

export async function scheduleVaccinationReminder({
  vaccinationId,
  petName,
  vaccineName,
  nextDueDate,
}) {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!nextDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
    return null;
  }

  const [year, month, day] = nextDueDate.split('-').map(Number);
  const dueDate = new Date(year, month - 1, day, 9, 0, 0, 0);

  if (
    dueDate.getFullYear() !== year ||
    dueDate.getMonth() !== month - 1 ||
    dueDate.getDate() !== day
  ) {
    return null;
  }

  // Don't schedule a notification for a date that has passed.
  if (dueDate.getTime() <= Date.now()) {
    return null;
  }

  const permissionGranted =
    await initializeVaccinationNotifications();

  if (!permissionGranted) {
    return null;
  }

  const identifier =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Vaccination reminder 🐾',
        body: `${petName} is due for ${vaccineName} today.`,
        data: {
          vaccinationId,
          petName,
          nextDueDate,
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dueDate,
        ...(Platform.OS === 'android'
          ? { channelId: ANDROID_CHANNEL_ID }
          : {}),
      },
    });

  return identifier;
}

export async function cancelVaccinationReminder(identifier) {
  if (Platform.OS === 'web' || !identifier) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(
      identifier
    );
  } catch (error) {
    console.error(
      'Could not cancel vaccination reminder:',
      error
    );
  }
}