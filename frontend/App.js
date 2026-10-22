import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Alert,
  Linking,
  TextInput,
  Platform,
} from 'react-native';
import FeatureCard from './src/components/common/FeatureCard';
import ProfileDetail from './src/components/pets/ProfileDetail';
import RecordDetail from './src/components/health/RecordDetail';
import PetCard from './src/components/pets/PetCard';
import ReminderCard from './src/components/reminders/ReminderCard';
import AppButton from './src/components/common/AppButton';
import AppInput from './src/components/common/AppInput';
import AppHeader from './src/components/common/AppHeader';
import LoadingIndicator from './src/components/common/LoadingIndicator';
import VaccinationCard from './src/components/health/VaccinationCard';
import * as Location from 'expo-location';
import * as dataApi from './src/services/dataApi';
import useSession from './src/hooks/useSession';
import AuthScreen from './src/components/auth/AuthScreen';
import RoleHomeScreen from './src/components/auth/RoleHomeScreen';
import {
  scheduleVaccinationReminder,
  cancelVaccinationReminder,
  cancelPetVaccinationReminders,
  cancelAllVaccinationReminders,
  reconcileVaccinationReminders,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
  cancelAppointmentReminders,
} from './src/services/vaccinationNotifications';

const EMPTY_PET_FORM = {
  name: '',
  species: '',
  breed: '',
  age: '',
  dateOfBirth: '',
  sex: 'Unknown',
  weight: '',
  color: '',
};

const EMPTY_HEALTH_FORM = {
  date: '',
  reason: '',
  diagnosis: '',
  treatment: '',
  medication: '',
  veterinarian: '',
  notes: '',
};

const EMPTY_VACCINATION_FORM = {
  vaccineName: '',
  dateGiven: '',
  nextDueDate: '',
  veterinarian: '',
  notes: '',
};

const EMPTY_APPOINTMENT_FORM = {
  petId: '',
  clinicName: '',
  date: '',
  time: '',
  reason: '',
};

// Screens where the bottom navigation is hidden (add / edit forms)
const FORM_SCREENS = [
  'addPet',
  'editPet',
  'addHealthRecord',
  'editHealthRecord',
  'addVaccination',
  'editVaccination',
  'bookAppointment',
];

const NAV_ITEMS = [
  { key: 'home', label: 'Home', emoji: '🏠' },
  { key: 'pets', label: 'My Pets', emoji: '🐾' },
  { key: 'reminders', label: 'Reminders', emoji: '🔔' },
  { key: 'settings', label: 'Settings', emoji: '⚙️' },
];

// Which bottom tab should be highlighted for a given screen
function getActiveTab(screen) {
  switch (screen) {
    case 'home':
      return 'home';
    case 'reminders':
      return 'reminders';
    case 'settings':
      return 'settings';
    default:
      // pets, profile, healthRecords, vaccinations, etc.
      return 'pets';
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Shows a message. Alert.alert does nothing useful on the web, so use
// the browser's own alert there.
function notify(title, message) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }

    return;
  }

  Alert.alert(title, message);
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidDate(value) {
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

// ---- Appointment helpers ----

function padTwo(value) {
  return String(value).padStart(2, '0');
}

// Accepts "10:30 AM", "10:30am", "10am", or a 24-hour time like "14:30".
// Returns { time24: 'HH:MM', display: 'h:MM AM' }, or null if invalid.
function parseTimeInput(value) {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '');

  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const period = match[3];

  if (minutes > 59) {
    return null;
  }

  if (period) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    }

    if (period === 'am' && hours === 12) {
      hours = 0;
    }
  } else if (!match[2] || hours > 23) {
    // Without AM/PM, only a 24-hour time such as 14:30 is accepted.
    return null;
  }

  const displayHours = hours % 12 === 0 ? 12 : hours % 12;

  return {
    time24: `${padTwo(hours)}:${padTwo(minutes)}`,
    display: `${displayHours}:${padTwo(minutes)} ${
      hours >= 12 ? 'PM' : 'AM'
    }`,
  };
}

// Combines an appointment's date and 24-hour time into a Date.
function getAppointmentDateTime(appointment) {
  if (!appointment || !isValidDate(appointment.date || '')) {
    return null;
  }

  const [year, month, day] = appointment.date.split('-').map(Number);
  const [hours, minutes] = /^\d{2}:\d{2}$/.test(
    appointment.time24 || ''
  )
    ? appointment.time24.split(':').map(Number)
    : [0, 0];

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

// Sorts by date first, then by time of day.
function compareAppointments(a, b) {
  const keyA = `${a.date || ''} ${a.time24 || '00:00'}`;
  const keyB = `${b.date || ''} ${b.time24 || '00:00'}`;

  return keyA.localeCompare(keyB);
}

// Upgrades appointments saved by earlier versions of the app.
function normalizeAppointment(appointment) {
  const parsed = appointment.time24
    ? null
    : parseTimeInput(appointment.time);

  return {
    ...appointment,
    time: parsed ? parsed.display : appointment.time || '',
    time24: appointment.time24 || (parsed ? parsed.time24 : ''),
    status: appointment.status || 'Scheduled',
    notificationId: appointment.notificationId || null,
  };
}

// 'Cancelled', 'Past', or 'Scheduled'
function getAppointmentState(appointment) {
  if (appointment.status === 'Cancelled') {
    return 'Cancelled';
  }

  const when = getAppointmentDateTime(appointment);

  if (when && when.getTime() < Date.now()) {
    return 'Past';
  }

  return 'Scheduled';
}

// Alert.alert with buttons does not show on web, so use the
// browser's confirm dialog there.
function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
}) {
  if (Platform.OS === 'web') {
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(`${title}\n\n${message}`);

    if (confirmed) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

function getVaccinationStatus(nextDueDate) {
  if (!nextDueDate) {
    return 'No due date set';
  }

  if (!isValidDate(nextDueDate)) {
    return 'Check due date';
  }

  const today = getTodayString();

  if (nextDueDate < today) {
    return 'Overdue';
  }

  if (nextDueDate === today) {
    return 'Due today';
  }

  return 'Upcoming';
}

function getVaccinationStatusColor(status) {
  if (status === 'Overdue') {
    return '#B42318';
  }

  if (status === 'Due today') {
    return '#B54708';
  }

  if (status === 'Upcoming') {
    return '#027A48';
  }

  return '#667085';
}

function normalizePet(pet) {
  const vaccinations = Array.isArray(pet.vaccinations)
    ? pet.vaccinations.map((vaccination) => ({
        ...vaccination,
        id: vaccination.id || createId(),
        vaccineName: vaccination.vaccineName || '',
        dateGiven: vaccination.dateGiven || '',
        nextDueDate: vaccination.nextDueDate || '',
        veterinarian: vaccination.veterinarian || '',
        notes: vaccination.notes || '',
        notificationId: vaccination.notificationId || null,
      }))
    : [];

  return {
    id: pet.id || createId(),
    name: pet.name || '',
    species: pet.species || '',
    breed: pet.breed || '',
    age: pet.age || '',
    dateOfBirth: pet.dateOfBirth || '',
    sex: pet.sex || 'Unknown',
    weight: pet.weight || '',
    color: pet.color || '',
    healthRecords: Array.isArray(pet.healthRecords)
      ? pet.healthRecords
      : [],
    vaccinations,
  };
}

// The pet-owner app. It only mounts after the user has signed in.
function MainApp({ user, onSignOut }) {
  const [screen, setScreen] = useState('home');
  const [clinics, setClinics] = useState([]);
const [clinicLoading, setClinicLoading] = useState(false);
const [clinicError, setClinicError] = useState('');
const [clinicSearchLocation, setClinicSearchLocation] = useState(null);
  const [pets, setPets] = useState([]);
  const [petsLoaded, setPetsLoaded] = useState(false);

  const [selectedPetId, setSelectedPetId] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [selectedVaccinationId, setSelectedVaccinationId] =
    useState(null);

  const [petForm, setPetForm] = useState({ ...EMPTY_PET_FORM });
  const [healthForm, setHealthForm] = useState({
    ...EMPTY_HEALTH_FORM,
  });
  const [vaccinationForm, setVaccinationForm] = useState({
    ...EMPTY_VACCINATION_FORM,
  });

  const [editingPetId, setEditingPetId] = useState(null);

  const [appointments, setAppointments] = useState([]);
  const [appointmentForm, setAppointmentForm] = useState({
    ...EMPTY_APPOINTMENT_FORM,
  });
  const [editingAppointmentId, setEditingAppointmentId] =
    useState(null);

  const [loadError, setLoadError] = useState('');
  const [legacyCounts, setLegacyCounts] = useState({ total: 0 });

  // Stops a second tap from sending the same save twice.
  const savingRef = useRef(false);

  async function runGuarded(action) {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;

    try {
      await action();
    } finally {
      savingRef.current = false;
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Loads pets, records, vaccinations and appointments from the server.
  async function loadAll() {
    setLoadError('');

    try {
      const loadedPets = await dataApi.loadPets();

      // Repair missing, outdated, or duplicate vaccination reminders.
      // This does not request notification permission on app launch.
      const synchronizedPets =
        await reconcileVaccinationReminders(loadedPets);

      await dataApi.rememberVaccinationNotificationIds(synchronizedPets);

      const loadedAppointments = await dataApi.loadAppointments(
        synchronizedPets
      );

      await rescheduleMissingAppointmentReminders(loadedAppointments);

      setPets(synchronizedPets);
      setAppointments(loadedAppointments.sort(compareAppointments));
      setPetsLoaded(true);

      offerLocalDataImport();
    } catch (error) {
      console.error('Could not load data:', error);
      setLoadError(
        error.message || 'We could not load your data. Please try again.'
      );
      setPetsLoaded(true);
    }
  }

  // Local reminders live on this phone only. After signing in again (or on a
  // new phone) upcoming appointments may have no reminder, so schedule one.
  async function rescheduleMissingAppointmentReminders(list) {
    for (const item of list) {
      const when = getAppointmentDateTime(item);

      if (
        item.status !== 'Scheduled' ||
        item.notificationId ||
        !when ||
        when.getTime() <= Date.now()
      ) {
        continue;
      }

      try {
        const notificationId = await scheduleAppointmentReminder({
          appointmentId: item.id,
          petName: item.petName,
          clinicName: item.clinicName,
          date: item.date,
          time24: item.time24,
        });

        if (notificationId) {
          item.notificationId = notificationId;
          await dataApi.rememberNotificationId(
            'appointment',
            item.id,
            notificationId
          );
        }
      } catch (error) {
        console.error('Could not schedule appointment reminder:', error);
      }
    }
  }

  function retryLoad() {
    setPetsLoaded(false);
    loadAll();
  }

  // Data saved on this phone by earlier versions of the app can be moved
  // into the account once.
  async function offerLocalDataImport() {
    try {
      const counts = await dataApi.countLegacyData();

      setLegacyCounts(counts);

      if (counts.total > 0) {
        confirmAction({
          title: 'Move your saved data?',
          message: `Sisu found ${counts.pets} pet(s) and ${counts.appointments} appointment(s) saved on this phone. Move them to your account?`,
          confirmLabel: 'Move to my account',
          cancelLabel: 'Not now',
          onConfirm: importLocalData,
        });
      }
    } catch (error) {
      console.error('Could not check for local data:', error);
    }
  }

  async function importLocalData() {
    await runGuarded(async () => {
      try {
        const summary = await dataApi.importLegacyData();

        // Reminders for the old local appointments are replaced below.
        await cancelAppointmentReminders(
          summary.oldAppointmentReminderIds.map((id) => ({
            notificationId: id,
          }))
        );

        const loadedPets = await dataApi.loadPets();
        const synchronizedPets =
          await reconcileVaccinationReminders(loadedPets);

        await dataApi.rememberVaccinationNotificationIds(synchronizedPets);

        const loadedAppointments = (
          await dataApi.loadAppointments(synchronizedPets)
        ).sort(compareAppointments);

        // Give the moved upcoming appointments their reminders again.
        await rescheduleMissingAppointmentReminders(loadedAppointments);

        setPets(synchronizedPets);
        setAppointments(loadedAppointments);
        setLegacyCounts(await dataApi.countLegacyData());

        notify(
          'Data moved',
          `Moved ${summary.pets} pet(s), ${summary.records} health record(s), ${summary.vaccinations} vaccination(s) and ${summary.appointments} appointment(s).` +
            (summary.skipped
              ? ` ${summary.skipped} item(s) could not be moved because their data was invalid.`
              : '')
        );
      } catch (error) {
        notify(
          'Could not move your data',
          `${error.message} Nothing was lost; you can try again from Settings.`
        );
      }
    });
  }

  function updateAppointmentForm(field, value) {
    setAppointmentForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openAppointmentForm(clinicName = '') {
    setEditingAppointmentId(null);
    setAppointmentForm({
      ...EMPTY_APPOINTMENT_FORM,
      petId: pets.length === 1 ? pets[0].id : '',
      clinicName,
    });
    setScreen('bookAppointment');
  }

  function openEditAppointment(appointment) {
    setEditingAppointmentId(appointment.id);
    setAppointmentForm({
      petId: appointment.petId || '',
      clinicName: appointment.clinicName || '',
      date: appointment.date || '',
      time: appointment.time || '',
      reason: appointment.reason || '',
    });
    setScreen('bookAppointment');
  }

  // Creates a new appointment, or saves changes when editing one.
  function bookAppointment() {
    return runGuarded(performBookAppointment);
  }

  async function performBookAppointment() {
    const existing = editingAppointmentId
      ? appointments.find((item) => item.id === editingAppointmentId)
      : null;

    if (editingAppointmentId && !existing) {
      Alert.alert(
        'Appointment not found',
        'This appointment no longer exists.'
      );
      setEditingAppointmentId(null);
      setScreen('appointments');
      return;
    }

    const pet = pets.find((item) => item.id === appointmentForm.petId);
    const clinicName = appointmentForm.clinicName.trim();
    const date = appointmentForm.date.trim();
    const reason = appointmentForm.reason.trim();

    if (!pet) {
      Alert.alert('Choose a pet', 'Please select a pet for this visit.');
      return;
    }

    if (!clinicName) {
      Alert.alert(
        'Missing information',
        'Please enter the clinic name.'
      );
      return;
    }

    if (!date || !isValidDate(date)) {
      Alert.alert(
        'Invalid date',
        'Enter a valid date using YYYY-MM-DD, for example 2026-10-20.'
      );
      return;
    }

    if (!appointmentForm.time.trim()) {
      Alert.alert('Missing information', 'Please enter a time.');
      return;
    }

    const parsedTime = parseTimeInput(appointmentForm.time);

    if (!parsedTime) {
      Alert.alert(
        'Invalid time',
        'Enter a time like 10:30 AM or 14:30.'
      );
      return;
    }

    const appointmentTime = getAppointmentDateTime({
      date,
      time24: parsedTime.time24,
    });

    if (appointmentTime.getTime() <= Date.now()) {
      Alert.alert(
        'Check the date and time',
        'That date and time have already passed.'
      );
      return;
    }

    if (!reason) {
      Alert.alert(
        'Missing information',
        'Please enter the reason for the visit.'
      );
      return;
    }

    // Save on the server first: its ID is needed for the reminder.
    let saved;

    try {
      saved = await dataApi.saveAppointment(
        pet.id,
        existing && existing.petId === pet.id ? existing.id : null,
        {
          clinicName,
          date,
          time24: parsedTime.time24,
          reason,
        },
        pet.name
      );

      // Changing the pet creates the visit under the new pet.
      if (existing && existing.petId !== pet.id) {
        try {
          await dataApi.deleteAppointment(existing);
        } catch (deleteError) {
          console.error('Could not remove the old appointment:', deleteError);
        }
      }
    } catch (error) {
      notify('Could not save appointment', error.message);
      return;
    }

    const appointmentId = saved.id;
    const oldNotificationId = existing?.notificationId || null;

    const scheduleUnchanged =
      Boolean(existing) &&
      existing.id === appointmentId &&
      existing.date === date &&
      existing.time24 === parsedTime.time24;

    // Schedule the new reminder (1 hour before the visit).
    let newNotificationId = null;

    try {
      newNotificationId = await scheduleAppointmentReminder({
        appointmentId,
        petName: pet.name,
        clinicName,
        date,
        time24: parsedTime.time24,
      });
    } catch (error) {
      console.error('Could not schedule appointment reminder:', error);
    }

    // If scheduling fails but the date and time have not changed,
    // keep the existing reminder.
    if (!newNotificationId && scheduleUnchanged && oldNotificationId) {
      newNotificationId = oldNotificationId;
    }

    // The old reminder is replaced when the date, time or pet changed.
    if (oldNotificationId && oldNotificationId !== newNotificationId) {
      await cancelAppointmentReminder(oldNotificationId);
    }

    if (existing && existing.id !== appointmentId) {
      await dataApi.rememberNotificationId('appointment', existing.id, null);
    }

    await dataApi.rememberNotificationId(
      'appointment',
      appointmentId,
      newNotificationId
    );

    const appointment = { ...saved, notificationId: newNotificationId };

    setAppointments(
      [
        ...appointments.filter(
          (item) =>
            item.id !== appointmentId && (!existing || item.id !== existing.id)
        ),
        appointment,
      ].sort(compareAppointments)
    );

    setAppointmentForm({ ...EMPTY_APPOINTMENT_FORM });
    setEditingAppointmentId(null);
    setScreen('appointments');
  }

  // Marks an appointment as cancelled and removes its reminder.
  function cancelAppointment(appointment) {
    confirmAction({
      title: 'Cancel appointment',
      message: `Cancel ${appointment.petName}’s visit to ${appointment.clinicName} on ${appointment.date} at ${appointment.time}? Its reminder will be removed.`,
      confirmLabel: 'Cancel appointment',
      cancelLabel: 'Keep it',
      onConfirm: async () => {
        try {
          await dataApi.cancelAppointment(appointment);
        } catch (error) {
          notify('Could not cancel appointment', error.message);
          return;
        }

        setAppointments((previous) =>
          previous.map((item) =>
            item.id === appointment.id
              ? { ...item, status: 'Cancelled', notificationId: null }
              : item
          )
        );

        await cancelAppointmentReminder(appointment.notificationId);
        await dataApi.rememberNotificationId(
          'appointment',
          appointment.id,
          null
        );
      },
    });
  }

  // Permanently removes an appointment and its reminder.
  function deleteAppointment(appointment) {
    confirmAction({
      title: 'Delete appointment',
      message: `Delete ${appointment.petName}’s visit to ${appointment.clinicName} on ${appointment.date}? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await dataApi.deleteAppointment(appointment);
        } catch (error) {
          notify('Could not delete appointment', error.message);
          return;
        }

        setAppointments((previous) =>
          previous.filter((item) => item.id !== appointment.id)
        );

        await cancelAppointmentReminder(appointment.notificationId);
        await dataApi.rememberNotificationId(
          'appointment',
          appointment.id,
          null
        );
      },
    });
  }

  const selectedPet = pets.find(
    (pet) => pet.id === selectedPetId
  );

  function updatePetForm(field, value) {
    setPetForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateHealthForm(field, value) {
    setHealthForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateVaccinationForm(field, value) {
    setVaccinationForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openAddPet() {
    setEditingPetId(null);
    setPetForm({ ...EMPTY_PET_FORM });
    setScreen('addPet');
  }

  function openEditPet(pet) {
    setEditingPetId(pet.id);
    setPetForm({
      name: pet.name || '',
      species: pet.species || '',
      breed: pet.breed || '',
      age: String(pet.age || ''),
      dateOfBirth: pet.dateOfBirth || '',
      sex: pet.sex || 'Unknown',
      weight: String(pet.weight || ''),
      color: pet.color || '',
    });
    setSelectedPetId(pet.id);
    setScreen('editPet');
  }

  function savePet() {
    return runGuarded(performSavePet);
  }

  async function performSavePet() {
    if (!petForm.name.trim() || !petForm.species.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your pet’s name and species.'
      );
      return;
    }

    if (
      petForm.dateOfBirth.trim() &&
      !isValidDate(petForm.dateOfBirth.trim())
    ) {
      Alert.alert(
        'Invalid date',
        'Date of birth must use YYYY-MM-DD, for example 2024-06-15.'
      );
      return;
    }

    try {
      if (editingPetId) {
        const updated = await dataApi.updatePet(editingPetId, petForm);

        setPets((previous) =>
          previous.map((pet) =>
            pet.id === editingPetId
              ? {
                  ...updated,
                  healthRecords: pet.healthRecords,
                  vaccinations: pet.vaccinations,
                }
              : pet
          )
        );

        setAppointments((previous) =>
          previous.map((item) =>
            item.petId === editingPetId
              ? { ...item, petName: updated.name }
              : item
          )
        );

        setSelectedPetId(editingPetId);
        setScreen('profile');
        return;
      }

      const newPet = await dataApi.createPet(petForm);

      setPets((previous) => [...previous, newPet]);
      setSelectedPetId(newPet.id);
      setPetForm({ ...EMPTY_PET_FORM });
      setScreen('profile');
    } catch (error) {
      notify('Could not save pet', error.message);
    }
  }

  function openProfile(pet) {
    setSelectedPetId(pet.id);
    setScreen('profile');
  }

  function deletePet(petId) {
    confirmAction({
      title: 'Delete pet',
      message:
        'Are you sure you want to delete this pet and its associated records and appointments?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          // The server also deletes the pet's records and appointments.
          await dataApi.deletePet(petId);
        } catch (error) {
          notify('Could not delete pet', error.message);
          return;
        }

        const petToDelete = pets.find((pet) => pet.id === petId);

        // Cancel every saved vaccination reminder for this pet.
        await cancelPetVaccinationReminders(petToDelete);

        // Remove this pet's appointments and their reminders.
        const petAppointments = appointments.filter(
          (item) => item.petId === petId
        );

        await cancelAppointmentReminders(petAppointments);

        setAppointments((previous) =>
          previous.filter((item) => item.petId !== petId)
        );

        setPets((previous) => previous.filter((pet) => pet.id !== petId));

        if (selectedPetId === petId) {
          setSelectedPetId(null);
        }

        setScreen('home');
      },
    });
  }

  function openHealthRecords(pet) {
    setSelectedPetId(pet.id);
    setScreen('healthRecords');
  }

  function openAddHealthRecord() {
    setSelectedRecordId(null);
    setHealthForm({
      ...EMPTY_HEALTH_FORM,
      date: getTodayString(),
    });
    setScreen('addHealthRecord');
  }

  function openEditHealthRecord(record) {
    setSelectedRecordId(record.id);
    setHealthForm({
      date: record.date || '',
      reason: record.reason || '',
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      medication: record.medication || '',
      veterinarian: record.veterinarian || '',
      notes: record.notes || '',
    });
    setScreen('editHealthRecord');
  }

  function saveHealthRecord() {
    return runGuarded(performSaveHealthRecord);
  }

  async function performSaveHealthRecord() {
    if (!selectedPet) {
      Alert.alert('Error', 'Please select a pet first.');
      return;
    }

    if (
      !healthForm.date.trim() ||
      !isValidDate(healthForm.date.trim())
    ) {
      Alert.alert(
        'Invalid date',
        'Enter a valid date using YYYY-MM-DD.'
      );
      return;
    }

    if (!healthForm.reason.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter the reason for the visit.'
      );
      return;
    }

    let record;

    try {
      record = await dataApi.saveHealthRecord(
        selectedPetId,
        selectedRecordId,
        healthForm
      );
    } catch (error) {
      notify('Could not save health record', error.message);
      return;
    }

    setPets((previous) =>
      previous.map((pet) => {
        if (pet.id !== selectedPetId) {
          return pet;
        }

        const currentRecords = Array.isArray(pet.healthRecords)
          ? pet.healthRecords
          : [];

        if (selectedRecordId) {
          return {
            ...pet,
            healthRecords: currentRecords.map((item) =>
              item.id === selectedRecordId ? record : item
            ),
          };
        }

        return {
          ...pet,
          healthRecords: [...currentRecords, record],
        };
      })
    );

    setScreen('healthRecords');
  }

  function deleteHealthRecord(recordId) {
    confirmAction({
      title: 'Delete health record',
      message: 'Are you sure you want to delete this medical record?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await dataApi.deleteHealthRecord(selectedPetId, recordId);
        } catch (error) {
          notify('Could not delete health record', error.message);
          return;
        }

        setPets((previous) =>
          previous.map((pet) =>
            pet.id === selectedPetId
              ? {
                  ...pet,
                  healthRecords: pet.healthRecords.filter(
                    (record) => record.id !== recordId
                  ),
                }
              : pet
          )
        );
      },
    });
  }

  function openVaccinations(pet) {
    setSelectedPetId(pet.id);
    setScreen('vaccinations');
  }

  function openAddVaccination() {
    setSelectedVaccinationId(null);
    setVaccinationForm({
      ...EMPTY_VACCINATION_FORM,
      dateGiven: getTodayString(),
    });
    setScreen('addVaccination');
  }

  function openEditVaccination(vaccination) {
    setSelectedVaccinationId(vaccination.id);
    setVaccinationForm({
      vaccineName: vaccination.vaccineName || '',
      dateGiven: vaccination.dateGiven || '',
      nextDueDate: vaccination.nextDueDate || '',
      veterinarian: vaccination.veterinarian || '',
      notes: vaccination.notes || '',
    });
    setScreen('editVaccination');
  }

  function saveVaccination() {
    return runGuarded(performSaveVaccination);
  }

  async function performSaveVaccination() {
    if (!selectedPet) {
      Alert.alert('Error', 'Please select a pet first.');
      return;
    }

    const vaccineName = vaccinationForm.vaccineName.trim();
    const dateGiven = vaccinationForm.dateGiven.trim();
    const nextDueDate = vaccinationForm.nextDueDate.trim();

    if (!vaccineName) {
      Alert.alert(
        'Missing information',
        'Please enter the vaccine name.'
      );
      return;
    }

    if (!dateGiven || !isValidDate(dateGiven)) {
      Alert.alert(
        'Invalid vaccination date',
        'Enter a valid date using YYYY-MM-DD, for example 2026-10-09.'
      );
      return;
    }

    if (nextDueDate && !isValidDate(nextDueDate)) {
      Alert.alert(
        'Invalid due date',
        'Enter a valid next due date using YYYY-MM-DD, or leave it empty.'
      );
      return;
    }

    if (nextDueDate && nextDueDate < dateGiven) {
      Alert.alert(
        'Check the dates',
        'The next due date cannot be earlier than the date the vaccine was given.'
      );
      return;
    }

    const currentPet = pets.find((pet) => pet.id === selectedPetId);

    if (!currentPet) {
      Alert.alert('Error', 'The selected pet could not be found.');
      return;
    }

    const currentVaccinations = Array.isArray(currentPet.vaccinations)
      ? currentPet.vaccinations
      : [];

    const existingVaccination = selectedVaccinationId
      ? currentVaccinations.find(
          (item) => item.id === selectedVaccinationId
        )
      : null;

    // Save on the server first: its ID is needed for the reminder.
    let savedVaccination;

    try {
      savedVaccination = await dataApi.saveVaccination(
        selectedPetId,
        selectedVaccinationId,
        {
          vaccineName,
          dateGiven,
          nextDueDate,
          veterinarian: vaccinationForm.veterinarian.trim(),
          notes: vaccinationForm.notes.trim(),
        }
      );
    } catch (error) {
      notify('Could not save vaccination', error.message);
      return;
    }

    const vaccinationId = savedVaccination.id;

    const oldNotificationId =
      existingVaccination?.notificationId || null;

    const dueDateUnchanged =
      Boolean(existingVaccination) &&
      existingVaccination.nextDueDate === nextDueDate;

    let newNotificationId = null;

    if (nextDueDate) {
      try {
        newNotificationId = await scheduleVaccinationReminder({
          vaccinationId,
          petName: currentPet.name,
          vaccineName,
          nextDueDate,
        });
      } catch (error) {
        console.error(
          'Could not schedule vaccination reminder:',
          error
        );
      }
    }

    // If scheduling fails but the due date has not changed,
    // preserve the existing reminder identifier.
    if (
      !newNotificationId &&
      dueDateUnchanged &&
      oldNotificationId
    ) {
      newNotificationId = oldNotificationId;
    }

    // Cancel the previous reminder only if it is being replaced
    // or the due date has changed.
    if (
      oldNotificationId &&
      oldNotificationId !== newNotificationId
    ) {
      await cancelVaccinationReminder(oldNotificationId);
    }

    await dataApi.rememberNotificationId(
      'vaccination',
      vaccinationId,
      newNotificationId
    );

    const vaccination = {
      ...savedVaccination,
      notificationId: newNotificationId,
    };

    setPets((previous) =>
      previous.map((pet) => {
        if (pet.id !== selectedPetId) {
          return pet;
        }

        const currentVaccinations = Array.isArray(pet.vaccinations)
          ? pet.vaccinations
          : [];

        if (selectedVaccinationId) {
          return {
            ...pet,
            vaccinations: currentVaccinations.map((item) =>
              item.id === selectedVaccinationId
                ? vaccination
                : item
            ),
          };
        }

        return {
          ...pet,
          vaccinations: [...currentVaccinations, vaccination],
        };
      })
    );

    setScreen('vaccinations');
  }

  function deleteVaccination(vaccinationId) {
    confirmAction({
      title: 'Delete vaccination',
      message: 'Are you sure you want to delete this vaccination record?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const pet = pets.find((item) => item.id === selectedPetId);
        const vaccination = pet?.vaccinations?.find(
          (item) => item.id === vaccinationId
        );

        try {
          await dataApi.deleteVaccination(selectedPetId, vaccinationId);
        } catch (error) {
          notify('Could not delete vaccination', error.message);
          return;
        }

        if (vaccination?.notificationId) {
          await cancelVaccinationReminder(vaccination.notificationId);
        }

        await dataApi.rememberNotificationId(
          'vaccination',
          vaccinationId,
          null
        );

        setPets((previous) =>
          previous.map((item) =>
            item.id === selectedPetId
              ? {
                  ...item,
                  vaccinations: item.vaccinations.filter(
                    (entry) => entry.id !== vaccinationId
                  ),
                }
              : item
          )
        );
      },
    });
  }

  function getAllVaccinationReminders() {
    const reminders = [];

    pets.forEach((pet) => {
      (pet.vaccinations || []).forEach((vaccination) => {
        const status = getVaccinationStatus(
          vaccination.nextDueDate
        );

        if (
          status === 'Overdue' ||
          status === 'Due today' ||
          status === 'Upcoming'
        ) {
          reminders.push({
            ...vaccination,
            petId: pet.id,
            petName: pet.name,
            status,
          });
        }
      });
    });

    return reminders.sort((a, b) => {
      if (a.nextDueDate !== b.nextDueDate) {
        return a.nextDueDate.localeCompare(b.nextDueDate);
      }

      return a.petName.localeCompare(b.petName);
    });
  }

  // ---- Settings actions ----

  function clearAllData() {
    confirmAction({
      title: 'Delete all my data',
      message:
        'This permanently deletes every pet, medical record, vaccination, and appointment in your Sisu account.',
      confirmLabel: 'Delete everything',
      onConfirm: async () => {
        try {
          for (const pet of pets) {
            await dataApi.deletePet(pet.id);
          }
        } catch (error) {
          notify('Could not delete everything', error.message);

          // Show what is left on the server.
          retryLoad();
          return;
        }

        await cancelAllVaccinationReminders(pets);
        await cancelAppointmentReminders(appointments);
        await dataApi.clearNotificationIds();

        setPets([]);
        setAppointments([]);
        setSelectedPetId(null);
        setSelectedRecordId(null);
        setSelectedVaccinationId(null);
        setScreen('home');
      },
    });
  }

  function renderButton(
    label,
    onPress,
    variant = 'primary',
    extraStyle = {}
  ) {
    return (
      <AppButton
        label={label}
        onPress={onPress}
        variant={variant}
        style={extraStyle}
      />
    );
  }

  function renderPetInput(
    label,
    field,
    placeholder,
    keyboardType = 'default'
  ) {
    return (
      <AppInput
        key={field}
        label={label}
        value={petForm[field]}
        onChangeText={(value) => updatePetForm(field, value)}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
    );
  }

  function renderHealthInput(
    label,
    field,
    placeholder,
    multiline = false
  ) {
    return (
      <AppInput
        key={field}
        label={label}
        value={healthForm[field]}
        onChangeText={(value) => updateHealthForm(field, value)}
        placeholder={placeholder}
        multiline={multiline}
      />
    );
  }

  function renderVaccinationInput(
    label,
    field,
    placeholder,
    multiline = false
  ) {
    return (
      <AppInput
        key={field}
        label={label}
        value={vaccinationForm[field]}
        onChangeText={(value) =>
          updateVaccinationForm(field, value)
        }
        placeholder={placeholder}
        multiline={multiline}
      />
    );
  }

  function petEmoji(species) {
    const value = (species || '').toLowerCase();

    if (value.includes('dog')) return '🐕';
    if (value.includes('cat')) return '🐈';
    if (value.includes('bird')) return '🐦';
    if (value.includes('rabbit')) return '🐇';
    if (value.includes('fish')) return '🐠';
    if (value.includes('horse')) return '🐎';

    return '🐾';
  }

  function renderHeader(title, subtitle = '') {
    return <AppHeader title={title} subtitle={subtitle} />;
  }

  function renderPetForm() {
    const editing = screen === 'editPet';

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader(
          editing ? 'Edit Pet Profile' : 'Add a Pet',
          'Keep your pet’s important information in one place.'
        )}

        <View style={styles.card}>
          {renderPetInput('Pet name *', 'name', 'e.g. Buddy')}
          {renderPetInput(
            'Species *',
            'species',
            'e.g. Dog, Cat, Bird'
          )}
          {renderPetInput(
            'Breed',
            'breed',
            'e.g. Golden Retriever'
          )}
          {renderPetInput('Age', 'age', 'Age in years', 'numeric')}
          {renderPetInput(
            'Date of birth',
            'dateOfBirth',
            'YYYY-MM-DD'
          )}
          {renderPetInput('Sex', 'sex', 'Male, Female, Unknown')}
          {renderPetInput('Weight', 'weight', 'e.g. 12 kg')}
          {renderPetInput(
            'Color / markings',
            'color',
            'e.g. Brown and white'
          )}

          {renderButton(
            editing ? 'Save Changes' : 'Add Pet',
            savePet
          )}
          {renderButton(
            'Cancel',
            () => setScreen(editing ? 'profile' : 'home'),
            'secondary'
          )}
        </View>
      </ScrollView>
    );
  }

  function renderProfile() {
    if (!selectedPet) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Pet not found</Text>
          {renderButton('Back Home', () => setScreen('home'))}
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader('Pet Profile', 'Your companion’s details')}

        <View style={styles.profileHero}>
          <Text style={styles.petEmojiLarge}>
            {petEmoji(selectedPet.species)}
          </Text>
          <Text style={styles.profilePetName}>
            {selectedPet.name}
          </Text>
          <Text style={styles.profilePetSubtitle}>
            {[selectedPet.species, selectedPet.breed]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            About {selectedPet.name}
          </Text>
          <ProfileDetail label="Species" value={selectedPet.species} />
          <ProfileDetail label="Breed" value={selectedPet.breed} />
          <ProfileDetail label="Age" value={selectedPet.age} />
          <ProfileDetail
            label="Date of birth"
            value={selectedPet.dateOfBirth}
          />
          <ProfileDetail label="Sex" value={selectedPet.sex} />
          <ProfileDetail label="Weight" value={selectedPet.weight} />
          <ProfileDetail
            label="Color / markings"
            value={selectedPet.color}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Health management</Text>

          {renderButton('📋 View Medical History', () =>
            openHealthRecords(selectedPet)
          )}

          {renderButton(
            '💉 View Vaccinations',
            () => openVaccinations(selectedPet),
            'secondary'
          )}

          {renderButton(
            '✏️ Edit Pet Profile',
            () => openEditPet(selectedPet),
            'secondary'
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Record summary</Text>
          <Text style={styles.summaryText}>
            Medical records: {selectedPet.healthRecords.length}
          </Text>
          <Text style={styles.summaryText}>
            Vaccinations: {selectedPet.vaccinations.length}
          </Text>
        </View>

        {renderButton(
          'Delete Pet',
          () => deletePet(selectedPet.id),
          'danger'
        )}
        {renderButton(
          'Back to My Pets',
          () => setScreen('pets'),
          'secondary'
        )}
      </ScrollView>
    );
  }

  function renderHealthRecords() {
    if (!selectedPet) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Pet not found</Text>
          {renderButton('Back Home', () => setScreen('home'))}
        </View>
      );
    }

    const records = [...selectedPet.healthRecords].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '')
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader(
          `${selectedPet.name}’s Medical History`,
          'Appointments, diagnoses, treatments, and medications.'
        )}

        {renderButton('+ Add Health Record', openAddHealthRecord)}

        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>
              No medical records yet
            </Text>
            <Text style={styles.emptyText}>
              Add a record after a veterinary visit or treatment.
            </Text>
          </View>
        ) : (
          records.map((record) => (
            <View style={styles.recordCard} key={record.id}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>
                  {record.reason}
                </Text>
                <Text style={styles.recordDate}>{record.date}</Text>
              </View>

              <RecordDetail
                label="Diagnosis"
                value={record.diagnosis}
              />
              <RecordDetail
                label="Treatment"
                value={record.treatment}
              />
              <RecordDetail
                label="Medication"
                value={record.medication}
              />
              <RecordDetail
                label="Veterinarian"
                value={record.veterinarian}
              />
              <RecordDetail label="Notes" value={record.notes} />

              <View style={styles.buttonRow}>
                <View style={styles.buttonHalf}>
                  {renderButton(
                    'Edit',
                    () => openEditHealthRecord(record),
                    'secondary'
                  )}
                </View>
                <View style={styles.buttonHalf}>
                  {renderButton(
                    'Delete',
                    () => deleteHealthRecord(record.id),
                    'danger'
                  )}
                </View>
              </View>
            </View>
          ))
        )}

        {renderButton(
          'Back to Pet Profile',
          () => setScreen('profile'),
          'secondary'
        )}
      </ScrollView>
    );
  }

  function renderHealthRecordForm() {
    const editing = screen === 'editHealthRecord';

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader(
          editing ? 'Edit Health Record' : 'Add Health Record',
          selectedPet
            ? `Record details for ${selectedPet.name}`
            : 'Enter the health record details.'
        )}

        <View style={styles.card}>
          {renderHealthInput('Date *', 'date', 'YYYY-MM-DD')}
          {renderHealthInput(
            'Reason for visit *',
            'reason',
            'e.g. Routine check-up'
          )}
          {renderHealthInput(
            'Diagnosis',
            'diagnosis',
            'Diagnosis provided by the vet'
          )}
          {renderHealthInput(
            'Treatment',
            'treatment',
            'Treatment or procedure'
          )}
          {renderHealthInput(
            'Medication',
            'medication',
            'Medication details, if any'
          )}
          {renderHealthInput(
            'Veterinarian',
            'veterinarian',
            'Veterinarian’s name'
          )}
          {renderHealthInput(
            'Notes',
            'notes',
            'Additional information',
            true
          )}

          {renderButton(
            editing ? 'Save Changes' : 'Save Health Record',
            saveHealthRecord
          )}
          {renderButton(
            'Cancel',
            () => setScreen('healthRecords'),
            'secondary'
          )}
        </View>
      </ScrollView>
    );
  }

  function renderVaccinations() {
    if (!selectedPet) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Pet not found</Text>
          {renderButton('Back Home', () => setScreen('home'))}
        </View>
      );
    }

    const vaccinations = [...selectedPet.vaccinations].sort(
      (a, b) => {
        const dateA = a.nextDueDate || a.dateGiven || '';
        const dateB = b.nextDueDate || b.dateGiven || '';
        return dateA.localeCompare(dateB);
      }
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader(
          `${selectedPet.name}’s Vaccinations`,
          'Keep a record of vaccines and their next due dates.'
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reminder guide</Text>
          <Text style={styles.helperText}>
            Sisu tracks vaccination due dates in the app and can
            schedule local notifications on supported devices when
            notification permission is granted.
          </Text>
        </View>

        {renderButton('+ Add Vaccination', openAddVaccination)}

        {vaccinations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💉</Text>
            <Text style={styles.emptyTitle}>
              No vaccinations recorded
            </Text>
            <Text style={styles.emptyText}>
              Add a vaccination using the information from your
              veterinarian.
            </Text>
          </View>
        ) : (
          vaccinations.map((vaccination) => {
            const status = getVaccinationStatus(
              vaccination.nextDueDate
            );

            return (
              <VaccinationCard
                key={vaccination.id}
                vaccination={vaccination}
                status={status}
                statusColor={getVaccinationStatusColor(status)}
                onEdit={() => openEditVaccination(vaccination)}
                onDelete={() => deleteVaccination(vaccination.id)}
              />
            );
          })
        )}

        {renderButton(
          'Back to Pet Profile',
          () => setScreen('profile'),
          'secondary'
        )}
      </ScrollView>
    );
  }

  function renderVaccinationForm() {
    const editing = screen === 'editVaccination';

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader(
          editing ? 'Edit Vaccination' : 'Add Vaccination',
          selectedPet
            ? `Vaccination details for ${selectedPet.name}`
            : 'Enter vaccination details.'
        )}

        <View style={styles.card}>
          {renderVaccinationInput(
            'Vaccine name *',
            'vaccineName',
            'e.g. Vaccine name from the vet record'
          )}

          {renderVaccinationInput(
            'Date given *',
            'dateGiven',
            'YYYY-MM-DD'
          )}

          {renderVaccinationInput(
            'Next due date',
            'nextDueDate',
            'YYYY-MM-DD, or leave empty'
          )}

          <Text style={styles.helperText}>
            Use the dates provided by your veterinarian. If no next
            due date has been specified, leave this field empty.
          </Text>

          {renderVaccinationInput(
            'Veterinarian',
            'veterinarian',
            'Veterinarian or clinic name'
          )}

          {renderVaccinationInput(
            'Notes',
            'notes',
            'Batch number or other details, if known',
            true
          )}

          {renderButton(
            editing ? 'Save Changes' : 'Save Vaccination',
            saveVaccination
          )}

          {renderButton(
            'Cancel',
            () => setScreen('vaccinations'),
            'secondary'
          )}
        </View>
      </ScrollView>
    );
  }

  function renderHome() {
    const reminders = getAllVaccinationReminders();
    const urgentReminders = reminders.filter(
      (item) =>
        item.status === 'Overdue' || item.status === 'Due today'
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.brandName}>Sisu 🐾</Text>
          <Text style={styles.heroTitle}>
            Better care for your best friend.
          </Text>
          <Text style={styles.heroSubtitle}>
            Manage your pets’ profiles, medical records, and
            vaccination dates in one place.
          </Text>

          {renderButton('+ Add a Pet', openAddPet)}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pets.length}</Text>
            <Text style={styles.statLabel}>Pets</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {pets.reduce(
                (total, pet) => total + pet.healthRecords.length,
                0
              )}
            </Text>
            <Text style={styles.statLabel}>Health records</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {urgentReminders.length}
            </Text>
            <Text style={styles.statLabel}>Due / overdue</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Pets</Text>
          <Text style={styles.sectionHint}>
            {pets.length} {pets.length === 1 ? 'pet' : 'pets'}
          </Text>
        </View>

        {pets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.emptyTitle}>
              Your pet family starts here
            </Text>
            <Text style={styles.emptyText}>
              Add your first pet to begin keeping track of their care.
            </Text>
            {renderButton('Add Your First Pet', openAddPet)}
          </View>
        ) : (
          pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              emoji={petEmoji(pet.species)}
              onPress={() => openProfile(pet)}
            />
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            💉 Vaccination Reminders
          </Text>
        </View>

        {reminders.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              No upcoming due dates recorded. Add vaccination records
              with next due dates to see reminders here.
            </Text>
          </View>
        ) : (
          reminders.slice(0, 8).map((item) => (
            <ReminderCard
              key={`${item.petId}-${item.id}`}
              item={item}
              statusColor={getVaccinationStatusColor(item.status)}
              onPress={() => {
                setSelectedPetId(item.petId);
                setScreen('vaccinations');
              }}
            />
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Sisu</Text>
        </View>

        <FeatureCard
          emoji="📋"
          title="Pet Health Records"
          description="Keep track of visits, diagnoses, treatments, and medications."
          onPress={() => {
            if (pets.length === 0) {
              Alert.alert(
                'Add a pet first',
                'Create a pet profile before adding health records.'
              );
            } else {
              openHealthRecords(pets[0]);
            }
          }}
        />

        <FeatureCard
          emoji="💉"
          title="Vaccination Tracking"
          description="Save vaccination dates and check upcoming or overdue dates."
          onPress={() => {
            if (pets.length === 0) {
              Alert.alert(
                'Add a pet first',
                'Create a pet profile before adding vaccinations.'
              );
            } else {
              openVaccinations(pets[0]);
            }
          }}
        />

        <FeatureCard
          emoji="🐾"
          title="Find a Veterinarian"
          description="Discover nearby veterinary clinics."
          onPress={() => setScreen('veterinarians')}
        />

        <Text style={styles.footerText}>
          Sisu · Care for every paw 🐾
        </Text>
      </ScrollView>
    );
  }

async function searchNearbyClinics() {
  setClinicLoading(true);
  setClinicError('');
  setClinics([]);

  try {
    const permission =
      await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setClinicError(
        'Location permission was not granted. Allow location access in your device settings and try again.'
      );
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;

    setClinicSearchLocation({ latitude, longitude });

    const query = `
      [out:json][timeout:25];
      (
        nwr["amenity"="veterinary"](around:15000,${latitude},${longitude});
        nwr["healthcare"="veterinary"](around:15000,${latitude},${longitude});
      );
      out center tags;
    `;

    const response = await fetch(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      }
    );

    if (!response.ok) {
      throw new Error('The clinic search service is temporarily unavailable.');
    }

    const data = await response.json();

    const results = (data.elements || [])
      .map((item) => {
        const tags = item.tags || {};
        const latitudeOfClinic = item.lat ?? item.center?.lat;
        const longitudeOfClinic = item.lon ?? item.center?.lon;

        if (
          latitudeOfClinic == null ||
          longitudeOfClinic == null
        ) {
          return null;
        }

        const name = tags.name || tags['name:en'];

        if (!name) {
          return null;
        }

        const address = [
          tags['addr:housenumber'],
          tags['addr:street'],
          tags['addr:suburb'],
          tags['addr:city'],
        ]
          .filter(Boolean)
          .join(', ');

        const distanceInKm = getClinicDistance(
          latitude,
          longitude,
          latitudeOfClinic,
          longitudeOfClinic
        );

        return {
          id: `${item.type}-${item.id}`,
          name,
          latitude: latitudeOfClinic,
          longitude: longitudeOfClinic,
          address,
          phone: tags.phone || tags['contact:phone'] || '',
          website: tags.website || tags['contact:website'] || '',
          distanceInKm,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceInKm - b.distanceInKm);

    setClinics(results);

    if (results.length === 0) {
      setClinicError(
        'No named veterinary clinics were found within 15 km. OpenStreetMap may have limited clinic data for your area.'
      );
    }
  } catch (error) {
    console.error('Clinic search failed:', error);

    setClinicError(
      'We could not load clinics right now. Check your internet connection and try again.'
    );
  } finally {
    setClinicLoading(false);
  }
}

function getClinicDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(
      Math.sqrt(calculation),
      Math.sqrt(1 - calculation)
    )
  );
}

async function openClinicDirections(clinic) {
  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${clinic.latitude},${clinic.longitude}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(
      'Could not open directions',
      'Please try opening Google Maps on your device.'
    );
  }
}
  function renderAppointmentForm() {
    const editing = Boolean(editingAppointmentId);

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader(
          editing ? 'Edit Appointment' : 'Book an Appointment',
          editing
            ? 'Update the details of this veterinary visit.'
            : 'Schedule a veterinary visit for your pet.'
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose your pet</Text>

          {pets.map((pet) => (
            <Pressable
              key={pet.id}
              onPress={() => updateAppointmentForm('petId', pet.id)}
              style={[
                styles.card,
                appointmentForm.petId === pet.id && {
                  borderWidth: 2,
                  borderColor: '#23866B',
                },
              ]}
            >
              <Text style={styles.summaryText}>
                {appointmentForm.petId === pet.id ? '✓ ' : ''}
                {pet.name} ({pet.species})
              </Text>
            </Pressable>
          ))}

          <Text style={styles.sectionTitle}>Clinic name</Text>
          <Text style={styles.helperText}>
            You can enter a clinic name manually.
          </Text>

          <TextInput
            style={styles.input}
            value={appointmentForm.clinicName}
            onChangeText={(value) =>
              updateAppointmentForm('clinicName', value)
            }
            placeholder="Veterinary clinic name"
          />

          <Text style={styles.sectionTitle}>Date</Text>
          <TextInput
            style={styles.input}
            value={appointmentForm.date}
            onChangeText={(value) =>
              updateAppointmentForm('date', value)
            }
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.sectionTitle}>Time</Text>
          <TextInput
            style={styles.input}
            value={appointmentForm.time}
            onChangeText={(value) =>
              updateAppointmentForm('time', value)
            }
            placeholder="e.g. 10:30 AM or 14:30"
          />
          <Text style={styles.helperText}>
            Use 10:30 AM or 24-hour time like 14:30. If notifications
            are available on your device, Sisu reminds you 1 hour
            before the visit.
          </Text>

          <Text style={styles.sectionTitle}>Reason for visit</Text>
          <TextInput
            style={styles.input}
            value={appointmentForm.reason}
            onChangeText={(value) =>
              updateAppointmentForm('reason', value)
            }
            placeholder="e.g. Vaccination or check-up"
          />

          {renderButton(
            editing ? 'Save Changes' : 'Save Appointment',
            bookAppointment
          )}

          {renderButton(
            'Cancel',
            () => {
              setEditingAppointmentId(null);
              setScreen(editing ? 'appointments' : 'veterinarians');
            },
            'secondary'
          )}
        </View>
      </ScrollView>
    );
  }

  function renderAppointmentCard(appointment) {
    const state = getAppointmentState(appointment);
    const isScheduled = state === 'Scheduled';

    const stateColor =
      state === 'Scheduled'
        ? '#027A48'
        : state === 'Cancelled'
        ? '#B42318'
        : '#667085';

    return (
      <View key={appointment.id} style={styles.card}>
        <Text style={styles.sectionTitle}>
          {appointment.clinicName}
        </Text>
        <Text style={styles.summaryText}>
          Pet: {appointment.petName}
        </Text>
        <Text style={styles.summaryText}>
          Date: {appointment.date}
        </Text>
        <Text style={styles.summaryText}>
          Time: {appointment.time}
        </Text>
        <Text style={styles.summaryText}>
          Reason: {appointment.reason}
        </Text>

        <Text
          style={[
            styles.helperText,
            { color: stateColor, fontWeight: '800' },
          ]}
        >
          Status: {state}
        </Text>

        {isScheduled && (
          <Text style={styles.helperText}>
            {appointment.notificationId
              ? '🔔 Reminder set for 1 hour before'
              : 'No reminder set'}
          </Text>
        )}

        <View style={styles.buttonRow}>
          <View style={styles.buttonHalf}>
            {renderButton(
              isScheduled ? 'Edit' : 'Reschedule',
              () => openEditAppointment(appointment),
              'secondary'
            )}
          </View>
          <View style={styles.buttonHalf}>
            {isScheduled
              ? renderButton(
                  'Cancel visit',
                  () => cancelAppointment(appointment),
                  'secondary'
                )
              : renderButton(
                  'Delete',
                  () => deleteAppointment(appointment),
                  'danger'
                )}
          </View>
        </View>

        {isScheduled &&
          renderButton(
            'Delete',
            () => deleteAppointment(appointment),
            'danger'
          )}
      </View>
    );
  }

  function renderAppointments() {
    const upcoming = appointments
      .filter((item) => getAppointmentState(item) === 'Scheduled')
      .sort(compareAppointments);

    // Past and cancelled visits, most recent first.
    const earlier = appointments
      .filter((item) => getAppointmentState(item) !== 'Scheduled')
      .sort((a, b) => compareAppointments(b, a));

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader(
          'My Appointments',
          'View and manage your veterinary visits.'
        )}

        {renderButton('+ Book an Appointment', () =>
          openAppointmentForm()
        )}

        {appointments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.summaryText}>
              No appointments saved yet.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <Text style={styles.sectionHint}>{upcoming.length}</Text>
            </View>

            {upcoming.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.summaryText}>
                  No upcoming appointments.
                </Text>
              </View>
            ) : (
              upcoming.map(renderAppointmentCard)
            )}

            {earlier.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Past and cancelled
                  </Text>
                  <Text style={styles.sectionHint}>
                    {earlier.length}
                  </Text>
                </View>

                {earlier.map(renderAppointmentCard)}
              </>
            )}
          </>
        )}

        {renderButton(
          'Find a Veterinarian',
          () => setScreen('veterinarians'),
          'secondary'
        )}
      </ScrollView>
    );
  }

  function renderVeterinarians() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {renderHeader(
        'Find a Veterinarian',
        'Discover veterinary care near you.'
      )}

      {renderButton('📅 Book an Appointment', () =>
        openAppointmentForm()
      )}
      {renderButton(
        '🗓️ My Appointments',
        () => setScreen('appointments'),
        'secondary'
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Nearby veterinary clinics
        </Text>

        <Text style={styles.summaryText}>
          Find veterinary clinics within 15 km of your current
          location. Results come from OpenStreetMap.
        </Text>

        {renderButton(
          clinicLoading
            ? 'Searching for clinics...'
            : '📍 Find Clinics Near Me',
          searchNearbyClinics,
          'primary'
        )}

        {clinicSearchLocation && (
          <Text style={styles.helperText}>
            Location: {clinicSearchLocation.latitude.toFixed(4)},{' '}
            {clinicSearchLocation.longitude.toFixed(4)}
          </Text>
        )}

        {clinicLoading && (
          <View style={styles.emptyState}>
            <LoadingIndicator />
            <Text style={styles.emptyText}>
              Searching for nearby veterinary clinics...
            </Text>
          </View>
        )}

        {!!clinicError && !clinicLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{clinicError}</Text>

            {renderButton(
              'Try Again',
              searchNearbyClinics,
              'secondary'
            )}
          </View>
        )}

        {!clinicLoading &&
          !clinicError &&
          clinics.length > 0 && (
            <Text style={styles.helperText}>
              Found {clinics.length}{' '}
              {clinics.length === 1 ? 'clinic' : 'clinics'}.
              Distances are approximate.
            </Text>
          )}
      </View>

      {clinics.map((clinic) => (
        <View key={clinic.id} style={styles.card}>
          <Text style={styles.sectionTitle}>
            🏥 {clinic.name}
          </Text>

          <Text style={styles.summaryText}>
            Approximately {clinic.distanceInKm.toFixed(1)} km away
          </Text>

          {!!clinic.address && (
            <Text style={styles.helperText}>
              Address: {clinic.address}
            </Text>
          )}

          {!!clinic.phone && (
            <Text style={styles.helperText}>
              Phone: {clinic.phone}
            </Text>
          )}

          {!!clinic.website && (
            <Text
              style={styles.helperText}
              onPress={() => Linking.openURL(clinic.website)}
            >
              Website: {clinic.website}
            </Text>
          )}

          {renderButton(
            '🗺️ Get Directions',
            () => openClinicDirections(clinic)
          )}

          {renderButton(
            '📅 Book Appointment Here',
            () => openAppointmentForm(clinic.name),
            'secondary'
          )}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.helperText}>
          Clinic listings and contact details depend on what has
          been recorded in OpenStreetMap. Please confirm clinic
          availability before travelling.
        </Text>

        {renderButton(
          'Back to Home',
          () => setScreen('home'),
          'secondary'
        )}
      </View>
    </ScrollView>
  );
}

  // ---- New screens ----

  function renderMyPets() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader(
          'My Pets',
          'Tap a pet to see their profile, records, and vaccinations.'
        )}

        {renderButton('+ Add a Pet', openAddPet)}

        {pets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.emptyTitle}>No pets yet</Text>
            <Text style={styles.emptyText}>
              Add your first pet to begin keeping track of their care.
            </Text>
          </View>
        ) : (
          pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              emoji={petEmoji(pet.species)}
              onPress={() => openProfile(pet)}
            />
          ))
        )}
      </ScrollView>
    );
  }

  function renderReminderGroup(title, items) {
    if (items.length === 0) {
      return null;
    }

    return (
      <View key={title}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{items.length}</Text>
        </View>

        {items.map((item) => (
          <ReminderCard
            key={`${item.petId}-${item.id}`}
            item={item}
            statusColor={getVaccinationStatusColor(item.status)}
            onPress={() => {
              setSelectedPetId(item.petId);
              setScreen('vaccinations');
            }}
          />
        ))}
      </View>
    );
  }

  function renderReminders() {
    const reminders = getAllVaccinationReminders();
    const overdue = reminders.filter((i) => i.status === 'Overdue');
    const dueToday = reminders.filter((i) => i.status === 'Due today');
    const upcoming = reminders.filter((i) => i.status === 'Upcoming');

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader(
          'Reminders',
          'Vaccination due dates across all your pets.'
        )}

        <View style={styles.card}>
          <Text style={styles.helperText}>
            Sisu tracks vaccination due dates in the app and can
            schedule local notifications on supported devices when
            notification permission is granted.
          </Text>
        </View>

        {reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>Nothing due</Text>
            <Text style={styles.emptyText}>
              Add vaccination records with a next due date to see
              reminders here.
            </Text>
          </View>
        ) : (
          <>
            {renderReminderGroup('Overdue', overdue)}
            {renderReminderGroup('Due today', dueToday)}
            {renderReminderGroup('Upcoming', upcoming)}
          </>
        )}
      </ScrollView>
    );
  }

  function handleSignOut() {
    confirmAction({
      title: 'Sign out?',
      message: 'You will need to sign in again to use Sisu.',
      confirmLabel: 'Sign out',
      onConfirm: async () => {
        // Reminders belong to this account; they are restored on next sign-in.
        await cancelAllVaccinationReminders(pets);
        await cancelAppointmentReminders(appointments);
        await dataApi.clearNotificationIds();
        onSignOut();
      },
    });
  }

  function renderSettings() {
    const totalRecords = pets.reduce(
      (total, pet) => total + pet.healthRecords.length,
      0
    );
    const totalVaccinations = pets.reduce(
      (total, pet) => total + pet.vaccinations.length,
      0
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader('Settings', 'Manage your Sisu data and app info.')}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.summaryText}>
            Signed in as {user.name || user.email}
          </Text>
          {user.name && user.email ? (
            <Text style={styles.helperText}>{user.email}</Text>
          ) : null}
          {renderButton('Sign out', handleSignOut, 'secondary')}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your data</Text>
          <Text style={styles.summaryText}>Pets: {pets.length}</Text>
          <Text style={styles.summaryText}>
            Medical records: {totalRecords}
          </Text>
          <Text style={styles.summaryText}>
            Vaccinations: {totalVaccinations}
          </Text>
          <Text style={styles.helperText}>
            Your data is saved in your Sisu account.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Data management</Text>
          {legacyCounts.total > 0
            ? renderButton(
                'Move data saved on this phone',
                importLocalData,
                'secondary'
              )
            : null}
          {renderButton('Delete all my data', clearAllData, 'danger')}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Sisu</Text>
          <Text style={styles.summaryText}>
            Sisu helps you keep your pets’ profiles, medical history,
            and vaccination dates in one place.
          </Text>
          <Text style={styles.helperText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    );
  }

  function renderBottomNav() {
    const activeTab = getActiveTab(screen);

    return (
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeTab;

          return (
            <Pressable
              key={item.key}
              onPress={() => setScreen(item.key)}
              style={styles.navItem}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.navEmoji,
                  !active && styles.navEmojiInactive,
                ]}
              >
                {item.emoji}
              </Text>
              <Text
                style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {active && <View style={styles.navIndicator} />}
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (!petsLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F8F7" />
        <View style={styles.screenContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {renderHeader('Could not load your data', loadError)}
            {renderButton('Try again', retryLoad)}
            {renderButton('Sign out', onSignOut, 'secondary')}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  let content;

  switch (screen) {
    case 'addPet':
    case 'editPet':
      content = renderPetForm();
      break;

    case 'profile':
      content = renderProfile();
      break;

    case 'healthRecords':
      content = renderHealthRecords();
      break;

    case 'addHealthRecord':
    case 'editHealthRecord':
      content = renderHealthRecordForm();
      break;

    case 'vaccinations':
      content = renderVaccinations();
      break;

    case 'addVaccination':
    case 'editVaccination':
      content = renderVaccinationForm();
      break;

    case 'pets':
      content = renderMyPets();
      break;

    case 'reminders':
      content = renderReminders();
      break;

    case 'settings':
      content = renderSettings();
      break;

    case 'veterinarians':
      content = renderVeterinarians();
      break;

    case 'bookAppointment':
      content = renderAppointmentForm();
      break;

    case 'appointments':
      content = renderAppointments();
      break;

    case 'home':
    default:
      content = renderHome();
      break;
  }

  const showBottomNav = !FORM_SCREENS.includes(screen);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F8F7" />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => setScreen('home')}
          style={styles.topBarBrand}
        >
          <Text style={styles.topBarLogo}>🐾 Sisu</Text>
        </Pressable>

        {screen !== 'home' && (
          <Pressable
            onPress={() => setScreen('home')}
            style={styles.homeLink}
          >
            <Text style={styles.homeLinkText}>Dashboard</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.screenContainer}>{content}</View>

      {showBottomNav && renderBottomNav()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8F7',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F5F8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topBar: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EC',
  },
  topBarBrand: {
    paddingVertical: 8,
  },
  topBarLogo: {
    color: '#126B58',
    fontSize: 21,
    fontWeight: '800',
  },
  homeLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5F0',
  },
  homeLinkText: {
    color: '#126B58',
    fontWeight: '700',
    fontSize: 13,
  },
  screenContainer: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 36,
  },

  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
    paddingBottom: 6,
    paddingTop: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navEmoji: {
    fontSize: 22,
  },
  navEmojiInactive: {
    opacity: 0.55,
  },
  navLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: '#667085',
  },
  navLabelActive: {
    color: '#126B58',
    fontWeight: '800',
  },
  navIndicator: {
    marginTop: 4,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#126B58',
  },

  hero: {
    backgroundColor: '#E1F3EB',
    padding: 24,
    borderRadius: 20,
    marginBottom: 18,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#126B58',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: '#47645D',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 18,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 17,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#126B58',
  },
  statLabel: {
    marginTop: 5,
    fontSize: 11,
    textAlign: 'center',
    color: '#667085',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#153E35',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    color: '#667085',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },

  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#153E35',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#667085',
    marginBottom: 14,
  },
  chevron: {
    fontSize: 28,
    color: '#98A2B3',
    marginLeft: 8,
  },
  profileHero: {
    alignItems: 'center',
    padding: 25,
    marginBottom: 16,
    backgroundColor: '#E1F3EB',
    borderRadius: 18,
  },
  petEmojiLarge: {
    fontSize: 65,
    marginBottom: 8,
  },
  profilePetName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#153E35',
  },
  profilePetSubtitle: {
    fontSize: 14,
    color: '#47645D',
    marginTop: 5,
  },
  summaryText: {
    fontSize: 14,
    color: '#475467',
    marginBottom: 8,
  },
  recordCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },
  vaccinationCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#D6EAE1',
  },
  recordHeader: {
    marginBottom: 12,
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: '#153E35',
  },
  recordDate: {
    fontSize: 12,
    color: '#667085',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  buttonHalf: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },
  emptyEmoji: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#153E35',
    textAlign: 'center',
    marginBottom: 7,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerText: {
    marginTop: 22,
    marginBottom: 10,
    textAlign: 'center',
    color: '#98A2B3',
    fontSize: 12,
  },
});

// Decides what to show: a loading screen while the saved login is checked,
// the sign-in screen, a simple screen for vets and admins, or the owner app.
export default function App() {
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (session.status === 'signedOut') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F8F7" />
        <AuthScreen
          onSignIn={session.signIn}
          onSignUp={session.signUp}
          onApplyAsVet={session.applyAsVet}
        />
      </SafeAreaView>
    );
  }

  if (session.user.role !== 'owner') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F8F7" />
        <RoleHomeScreen user={session.user} onSignOut={session.signOut} />
      </SafeAreaView>
    );
  }

  return <MainApp user={session.user} onSignOut={session.signOut} />;
}