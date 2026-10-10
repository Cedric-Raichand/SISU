
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'vaccination-reminders';

let initializationPromise = null;

function isValidDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getDueDate(nextDueDate) {
  if (!isValidDateString(nextDueDate)) {
    return null;
  }

  const [year, month, day] = nextDueDate.split('-').map(Number);

  return new Date(year, month - 1, day, 9, 0, 0, 0);
}

function isFutureDueDate(nextDueDate) {
  const dueDate = getDueDate(nextDueDate);

  return Boolean(dueDate && dueDate.getTime() > Date.now());
}

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    ANDROID_CHANNEL_ID,
    {
      name: 'Vaccination reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    }
  );
}

export async function initializeVaccinationNotifications() {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        await configureAndroidChannel();

        let settings = await Notifications.getPermissionsAsync();

        if (!settings.granted) {
          settings = await Notifications.requestPermissionsAsync();
        }

        return Boolean(settings.granted);
      } catch (error) {
        console.error(
          'Could not initialize vaccination notifications:',
          error
        );

        return false;
      }
    })();
  }

  const granted = await initializationPromise;

  // Allow another permission check if permission was not granted.
  if (!granted) {
    initializationPromise = null;
  }

  return granted;
}

async function scheduleReminderWithoutRequestingPermission({
  vaccinationId,
  petName,
  vaccineName,
  nextDueDate,
}) {
  const dueDate = getDueDate(nextDueDate);

  if (!dueDate || dueDate.getTime() <= Date.now()) {
    return null;
  }

  const identifier =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Vaccination reminder 🐾',
        body: `${petName || 'Your pet'} is due for ${
          vaccineName || 'a vaccination'
        } today.`,
        data: {
          type: 'vaccination-reminder',
          vaccinationId,
          petName,
          vaccineName,
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

export async function scheduleVaccinationReminder({
  vaccinationId,
  petName,
  vaccineName,
  nextDueDate,
}) {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!vaccinationId || !isFutureDueDate(nextDueDate)) {
    return null;
  }

  const permissionGranted =
    await initializeVaccinationNotifications();

  if (!permissionGranted) {
    return null;
  }

  try {
    return await scheduleReminderWithoutRequestingPermission({
      vaccinationId,
      petName,
      vaccineName,
      nextDueDate,
    });
  } catch (error) {
    console.error(
      'Could not schedule vaccination reminder:',
      error
    );

    return null;
  }
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

export async function cancelPetVaccinationReminders(pet) {
  if (Platform.OS === 'web' || !pet) {
    return;
  }

  const vaccinations = Array.isArray(pet.vaccinations)
    ? pet.vaccinations
    : [];

  const identifiers = [
    ...new Set(
      vaccinations
        .map((vaccination) => vaccination.notificationId)
        .filter(Boolean)
    ),
  ];

  await Promise.all(
    identifiers.map((identifier) =>
      cancelVaccinationReminder(identifier)
    )
  );
}

export async function cancelAllVaccinationReminders(pets) {
  if (Platform.OS === 'web' || !Array.isArray(pets)) {
    return;
  }

  await Promise.all(
    pets.map((pet) => cancelPetVaccinationReminders(pet))
  );
}

/**
 * Synchronizes saved vaccination records with scheduled reminders.
 *
 * This function does not request notification permission on app launch.
 * If permission has not been granted, it leaves scheduling unchanged.
 *
 * Returns the updated pets array, including notification identifiers.
 */
export async function reconcileVaccinationReminders(pets) {
  if (Platform.OS === 'web' || !Array.isArray(pets)) {
    return pets;
  }

  try {
    const settings = await Notifications.getPermissionsAsync();

    if (!settings.granted) {
      return pets;
    }

    await configureAndroidChannel();

    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    const vaccinationNotifications = scheduled.filter(
      (notification) =>
        notification.content?.data?.type ===
        'vaccination-reminder'
    );

    const records = [];

    for (const pet of pets) {
      const vaccinations = Array.isArray(pet.vaccinations)
        ? pet.vaccinations
        : [];

      for (const vaccination of vaccinations) {
        records.push({
          pet,
          vaccination,
        });
      }
    }

    const validRecords = records.filter(
      ({ vaccination }) =>
        vaccination.id &&
        isFutureDueDate(vaccination.nextDueDate)
    );

    const validIds = new Set(
      validRecords.map(({ vaccination }) => vaccination.id)
    );

    const grouped = new Map();

    for (const notification of vaccinationNotifications) {
      const data = notification.content?.data || {};
      const id = data.vaccinationId;

      if (!id || !validIds.has(id)) {
        await cancelVaccinationReminder(notification.identifier);
        continue;
      }

      if (!grouped.has(id)) {
        grouped.set(id, []);
      }

      grouped.get(id).push(notification);
    }

    const notificationIds = new Map();

    for (const { pet, vaccination } of validRecords) {
      const existing = grouped.get(vaccination.id) || [];

      const matching = existing.find(
        (notification) =>
          notification.content?.data?.nextDueDate ===
          vaccination.nextDueDate
      );

      // Keep one reminder if it matches the saved due date.
      if (matching) {
        notificationIds.set(
          vaccination.id,
          matching.identifier
        );

        for (const duplicate of existing) {
          if (duplicate.identifier !== matching.identifier) {
            await cancelVaccinationReminder(
              duplicate.identifier
            );
          }
        }

        continue;
      }

      // Cancel old reminders for this vaccination before replacing them.
      for (const notification of existing) {
        await cancelVaccinationReminder(notification.identifier);
      }

      const identifier =
        await scheduleReminderWithoutRequestingPermission({
          vaccinationId: vaccination.id,
          petName: pet.name,
          vaccineName: vaccination.vaccineName,
          nextDueDate: vaccination.nextDueDate,
        });

      if (identifier) {
        notificationIds.set(vaccination.id, identifier);
      }
    }

    return pets.map((pet) => ({
      ...pet,
      vaccinations: (pet.vaccinations || []).map(
        (vaccination) => ({
          ...vaccination,
          notificationId:
            notificationIds.get(vaccination.id) || null,
        })
      ),
    }));
  } catch (error) {
    console.error(
      'Could not synchronize vaccination reminders:',
      error
    );

    // Preserve existing data if synchronization fails.
    return pets;
  }
}
