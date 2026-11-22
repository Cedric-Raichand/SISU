import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const ANDROID_CHANNEL_ID = 'vaccination-reminders';

// Android Expo Go (SDK 53+) throws when expo-notifications is imported,
// so only load it on web-free, non-Expo-Go environments (e.g. a
// development build). In Expo Go the app works, but reminders are off.
const isAndroidExpoGo =
  Platform.OS === 'android' &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Notifications =
  Platform.OS === 'web' || isAndroidExpoGo
    ? null
    : require('expo-notifications');

const notificationsSupported = Boolean(Notifications);

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
  if (!notificationsSupported || Platform.OS !== 'android') {
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
  if (!notificationsSupported) {
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
  if (!notificationsSupported) {
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
  if (!notificationsSupported || !identifier) {
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

// Schedules a reminder 1 hour before an appointment.
// date is YYYY-MM-DD and time24 is HH:MM (24-hour).
// Returns the notification id, or null if nothing was scheduled.
export async function scheduleAppointmentReminder({
  appointmentId,
  petName,
  clinicName,
  date,
  time24,
}) {
  if (!notificationsSupported) {
    return null;
  }

  if (
    !appointmentId ||
    !isValidDateString(date) ||
    !/^\d{2}:\d{2}$/.test(time24 || '')
  ) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time24.split(':').map(Number);

  const appointmentTime = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );
  const reminderTime = new Date(
    appointmentTime.getTime() - 60 * 60 * 1000
  );

  // Don't schedule a reminder that is already in the past.
  if (reminderTime.getTime() <= Date.now()) {
    return null;
  }

  const permissionGranted =
    await initializeVaccinationNotifications();

  if (!permissionGranted) {
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Appointment reminder 🐾',
        body: `${petName || 'Your pet'} has a visit at ${
          clinicName || 'the clinic'
        } in 1 hour.`,
        data: {
          type: 'appointment-reminder',
          appointmentId,
          date,
          time24,
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
        ...(Platform.OS === 'android'
          ? { channelId: ANDROID_CHANNEL_ID }
          : {}),
      },
    });
  } catch (error) {
    console.error(
      'Could not schedule appointment reminder:',
      error
    );

    return null;
  }
}

export async function cancelAppointmentReminder(identifier) {
  await cancelVaccinationReminder(identifier);
}

export async function cancelAppointmentReminders(appointments) {
  if (!notificationsSupported || !Array.isArray(appointments)) {
    return;
  }

  await Promise.all(
    appointments.map((appointment) =>
      cancelVaccinationReminder(appointment.notificationId)
    )
  );
}

export async function cancelPetVaccinationReminders(pet) {
  if (!notificationsSupported || !pet) {
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
  if (!notificationsSupported || !Array.isArray(pets)) {
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
  if (!notificationsSupported || !Array.isArray(pets)) {
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