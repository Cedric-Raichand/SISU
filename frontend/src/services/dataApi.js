import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

// ---------------------------------------------------------------------------
// Sisu data layer: pets, health records, vaccinations and appointments are
// stored on the server. This file turns server data into the shapes the app
// screens already use, and the app's forms into server requests.
//
// Reminder (notification) IDs only make sense on this phone, so they are kept
// in local storage and merged into the data when it is loaded.
// ---------------------------------------------------------------------------

const VACCINATION_NOTIFICATIONS_KEY = 'sisu_vaccination_notification_ids';
const APPOINTMENT_NOTIFICATIONS_KEY = 'sisu_appointment_notification_ids';

// Data saved on the phone by earlier versions of the app.
const LEGACY_PETS_KEY = 'sisu_pets';
const LEGACY_APPOINTMENTS_KEY = 'sisu_appointments';
const LEGACY_IMPORT_MAP_KEY = 'sisu_legacy_import_map';
const SAMPLE_PET_ID = 'pet-buddy';

// ----- small helpers -------------------------------------------------------

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);

    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Could not save local data:', error);
  }
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// "14:30" -> "2:30 PM"
export function formatTime12(time24) {
  const match = /^(\d{2}):(\d{2})$/.exec(time24 || '');

  if (!match) {
    return time24 || '';
  }

  const hours = Number(match[1]);
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHours}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`;
}

// ----- notification IDs (stored on this phone only) ------------------------

function notificationKey(kind) {
  return kind === 'appointment'
    ? APPOINTMENT_NOTIFICATIONS_KEY
    : VACCINATION_NOTIFICATIONS_KEY;
}

// kind: 'vaccination' or 'appointment'. Pass null as notificationId to forget.
export async function rememberNotificationId(kind, recordId, notificationId) {
  const key = notificationKey(kind);
  const map = await readJson(key, {});

  if (notificationId) {
    map[recordId] = notificationId;
  } else {
    delete map[recordId];
  }

  await writeJson(key, map);
}

// Saves the notification IDs found on the given pets' vaccinations.
// Used after reminders are re-synchronised when the app opens.
export async function rememberVaccinationNotificationIds(pets) {
  const map = {};

  for (const pet of pets) {
    for (const vaccination of pet.vaccinations || []) {
      if (vaccination.notificationId) {
        map[vaccination.id] = vaccination.notificationId;
      }
    }
  }

  await writeJson(VACCINATION_NOTIFICATIONS_KEY, map);
}

export async function clearNotificationIds() {
  await writeJson(VACCINATION_NOTIFICATIONS_KEY, {});
  await writeJson(APPOINTMENT_NOTIFICATIONS_KEY, {});
}

// ----- server -> app shapes ------------------------------------------------

function toAppPet(serverPet, healthRecords = [], vaccinations = []) {
  return {
    id: serverPet._id,
    name: serverPet.name || '',
    species: serverPet.species || '',
    breed: serverPet.breed || '',
    age:
      serverPet.age === null || serverPet.age === undefined
        ? ''
        : String(serverPet.age),
    dateOfBirth: serverPet.dateOfBirth || '',
    sex: serverPet.sex || 'Unknown',
    weight: serverPet.weight || '',
    color: serverPet.color || '',
    healthRecords,
    vaccinations,
  };
}

function toAppRecord(record) {
  return {
    id: record._id,
    date: record.date || '',
    reason: record.reason || '',
    diagnosis: record.diagnosis || '',
    treatment: record.treatment || '',
    medication: record.medication || '',
    veterinarian: record.veterinarian || '',
    notes: record.notes || '',
    recordedBy: record.recordedBy ? String(record.recordedBy) : '',
    recordedByRole: record.recordedByRole || '',
  };
}

function toAppVaccination(vaccination, notificationIds) {
  return {
    id: vaccination._id,
    vaccineName: vaccination.vaccineName || '',
    dateGiven: vaccination.dateGiven || '',
    nextDueDate: vaccination.nextDueDate || '',
    veterinarian: vaccination.veterinarian || '',
    notes: vaccination.notes || '',
    notificationId: notificationIds[vaccination._id] || null,
    recordedBy: vaccination.recordedBy ? String(vaccination.recordedBy) : '',
    recordedByRole: vaccination.recordedByRole || '',
  };
}

function toAppAppointment(appointment, petNameById, notificationIds) {
  const populatedPet =
    appointment.pet && typeof appointment.pet === 'object'
      ? appointment.pet
      : null;
  const petId = populatedPet ? populatedPet._id : appointment.pet;

  return {
    id: appointment._id,
    petId,
    petName:
      (populatedPet && populatedPet.name) || petNameById[petId] || 'Pet',
    clinicName: appointment.clinicName || '',
    date: appointment.date || '',
    time24: appointment.time24 || '',
    time: formatTime12(appointment.time24),
    reason: appointment.reason || '',
    status: appointment.status === 'cancelled' ? 'Cancelled' : 'Scheduled',
    notificationId: notificationIds[appointment._id] || null,
  };
}

// ----- app forms -> server requests ----------------------------------------

// Throws an Error with a readable message when the age is not a number.
function petPayload(form, { forUpdate }) {
  const payload = {
    name: form.name.trim(),
    species: form.species.trim(),
    breed: (form.breed || '').trim(),
    dateOfBirth: (form.dateOfBirth || '').trim(),
    sex: (form.sex || '').trim() || 'Unknown',
    weight: String(form.weight || '').trim(),
    color: (form.color || '').trim(),
  };

  const ageText = String(form.age || '').trim();

  if (ageText) {
    const age = Number(ageText);

    if (!Number.isFinite(age) || age < 0 || age > 100) {
      throw new Error('Age must be a number between 0 and 100.');
    }

    payload.age = age;
  } else if (forUpdate) {
    payload.age = null;
  }

  return payload;
}

// ----- pets ----------------------------------------------------------------

// Loads every pet with its health records and vaccinations.
export async function loadPets() {
  const { pets } = await request('/api/pets');
  const notificationIds = await readJson(VACCINATION_NOTIFICATIONS_KEY, {});

  return Promise.all(
    pets.map(async (serverPet) => {
      const [recordData, vaccinationData] = await Promise.all([
        request(`/api/pets/${serverPet._id}/health-records`),
        request(`/api/pets/${serverPet._id}/vaccinations`),
      ]);

      return toAppPet(
        serverPet,
        recordData.records.map(toAppRecord),
        vaccinationData.records.map((item) =>
          toAppVaccination(item, notificationIds)
        )
      );
    })
  );
}

export async function createPet(form) {
  const { pet } = await request('/api/pets', {
    method: 'POST',
    body: petPayload(form, { forUpdate: false }),
  });

  return toAppPet(pet);
}

// Returns the updated profile fields (records and vaccinations are kept
// by the caller).
export async function updatePet(petId, form) {
  const { pet } = await request(`/api/pets/${petId}`, {
    method: 'PATCH',
    body: petPayload(form, { forUpdate: true }),
  });

  return toAppPet(pet);
}

export async function deletePet(petId) {
  await request(`/api/pets/${petId}`, { method: 'DELETE' });
}

// ----- health records ------------------------------------------------------

export async function saveHealthRecord(petId, recordId, form) {
  const body = {
    date: form.date.trim(),
    reason: form.reason.trim(),
    diagnosis: (form.diagnosis || '').trim(),
    treatment: (form.treatment || '').trim(),
    medication: (form.medication || '').trim(),
    veterinarian: (form.veterinarian || '').trim(),
    notes: (form.notes || '').trim(),
  };

  const { record } = await request(
    recordId
      ? `/api/pets/${petId}/health-records/${recordId}`
      : `/api/pets/${petId}/health-records`,
    { method: recordId ? 'PATCH' : 'POST', body }
  );

  return toAppRecord(record);
}

export async function deleteHealthRecord(petId, recordId) {
  await request(`/api/pets/${petId}/health-records/${recordId}`, {
    method: 'DELETE',
  });
}

// ----- vaccinations --------------------------------------------------------

export async function saveVaccination(petId, vaccinationId, data) {
  const body = {
    vaccineName: data.vaccineName,
    dateGiven: data.dateGiven,
    nextDueDate: data.nextDueDate || '',
    veterinarian: data.veterinarian || '',
    notes: data.notes || '',
  };

  const { record } = await request(
    vaccinationId
      ? `/api/pets/${petId}/vaccinations/${vaccinationId}`
      : `/api/pets/${petId}/vaccinations`,
    { method: vaccinationId ? 'PATCH' : 'POST', body }
  );

  return toAppVaccination(record, {});
}

export async function deleteVaccination(petId, vaccinationId) {
  await request(`/api/pets/${petId}/vaccinations/${vaccinationId}`, {
    method: 'DELETE',
  });
}

// ----- appointments --------------------------------------------------------

export async function loadAppointments(pets) {
  const { appointments } = await request('/api/appointments');
  const notificationIds = await readJson(APPOINTMENT_NOTIFICATIONS_KEY, {});
  const petNameById = {};

  for (const pet of pets) {
    petNameById[pet.id] = pet.name;
  }

  return appointments.map((item) =>
    toAppAppointment(item, petNameById, notificationIds)
  );
}

// data: { clinicName, date, time24, reason }
export async function saveAppointment(petId, appointmentId, data, petName) {
  const { appointment } = await request(
    appointmentId
      ? `/api/pets/${petId}/appointments/${appointmentId}`
      : `/api/pets/${petId}/appointments`,
    {
      method: appointmentId ? 'PATCH' : 'POST',
      body: {
        clinicName: data.clinicName,
        date: data.date,
        time24: data.time24,
        reason: data.reason,
        // Editing a cancelled appointment books it again.
        ...(appointmentId ? { status: 'scheduled' } : {}),
      },
    }
  );

  return toAppAppointment(appointment, { [petId]: petName }, {});
}

export async function cancelAppointment(appointment) {
  await request(
    `/api/pets/${appointment.petId}/appointments/${appointment.id}`,
    { method: 'PATCH', body: { status: 'cancelled' } }
  );
}

export async function deleteAppointment(appointment) {
  await request(
    `/api/pets/${appointment.petId}/appointments/${appointment.id}`,
    { method: 'DELETE' }
  );
}

// ----- moving data saved on this phone into the account --------------------

function isUntouchedSample(pet) {
  return (
    pet.id === SAMPLE_PET_ID &&
    !(pet.healthRecords || []).length &&
    !(pet.vaccinations || []).length
  );
}

// Counts what is waiting on this phone from earlier versions of the app.
export async function countLegacyData() {
  const pets = await readJson(LEGACY_PETS_KEY, []);
  const appointments = await readJson(LEGACY_APPOINTMENTS_KEY, []);
  const importMap = await readJson(LEGACY_IMPORT_MAP_KEY, {});

  const petsToMove = Array.isArray(pets)
    ? pets.filter((pet) => pet && !isUntouchedSample(pet))
    : [];
  const appointmentsToMove = Array.isArray(appointments) ? appointments : [];

  // Appointments whose pet was already moved still count.
  const movable = appointmentsToMove.filter(
    (item) =>
      item &&
      (petsToMove.some((pet) => pet.id === item.petId) ||
        importMap[item.petId])
  );

  return {
    pets: petsToMove.length,
    appointments: movable.length,
    total: petsToMove.length + movable.length,
  };
}

// Copies pets, records, vaccinations and appointments saved on this phone
// into the signed-in account. Each item is removed from local storage once it
// is on the server, so running it again after a failure does not duplicate
// anything. Returns a summary of what was moved and what was skipped.
export async function importLegacyData() {
  const summary = {
    pets: 0,
    records: 0,
    vaccinations: 0,
    appointments: 0,
    skipped: 0,
    // Reminders scheduled for the old local appointments; the app cancels them.
    oldAppointmentReminderIds: [],
  };

  const legacyPets = await readJson(LEGACY_PETS_KEY, []);
  const importMap = await readJson(LEGACY_IMPORT_MAP_KEY, {});
  let remainingPets = Array.isArray(legacyPets) ? [...legacyPets] : [];

  for (const legacyPet of [...remainingPets]) {
    if (!legacyPet) {
      continue;
    }

    if (isUntouchedSample(legacyPet)) {
      remainingPets = remainingPets.filter((pet) => pet !== legacyPet);
      continue;
    }

    let created;

    try {
      const dob = isValidDate(legacyPet.dateOfBirth) ? legacyPet.dateOfBirth : '';
      const ageNumber = Number(legacyPet.age);

      created = await request('/api/pets', {
        method: 'POST',
        body: {
          name: String(legacyPet.name || '').trim() || 'Pet',
          species: String(legacyPet.species || '').trim() || 'Other',
          breed: String(legacyPet.breed || '').trim(),
          dateOfBirth: dob,
          sex: String(legacyPet.sex || '').trim() || 'Unknown',
          weight: String(legacyPet.weight || '').trim(),
          color: String(legacyPet.color || '').trim(),
          ...(String(legacyPet.age || '').trim() &&
          Number.isFinite(ageNumber) &&
          ageNumber >= 0 &&
          ageNumber <= 100
            ? { age: ageNumber }
            : {}),
        },
      });
    } catch (error) {
      if (error.status === 0 || error.status === 401) {
        throw error;
      }

      // The server refused this pet (for example, invalid data), so it can
      // never be moved. Skip it and stop keeping it locally.
      summary.skipped += 1;
      remainingPets = remainingPets.filter((pet) => pet !== legacyPet);
      await writeJson(LEGACY_PETS_KEY, remainingPets);
      continue;
    }

    const newPetId = created.pet._id;

    importMap[legacyPet.id] = newPetId;
    summary.pets += 1;

    for (const record of legacyPet.healthRecords || []) {
      try {
        await request(`/api/pets/${newPetId}/health-records`, {
          method: 'POST',
          body: {
            date: record.date,
            reason: record.reason,
            diagnosis: record.diagnosis || '',
            treatment: record.treatment || '',
            medication: record.medication || '',
            veterinarian: record.veterinarian || '',
            notes: record.notes || '',
          },
        });
        summary.records += 1;
      } catch (error) {
        if (error.status === 0 || error.status === 401) {
          throw error;
        }

        summary.skipped += 1;
      }
    }

    for (const vaccination of legacyPet.vaccinations || []) {
      try {
        await request(`/api/pets/${newPetId}/vaccinations`, {
          method: 'POST',
          body: {
            vaccineName: vaccination.vaccineName,
            dateGiven: vaccination.dateGiven,
            nextDueDate: vaccination.nextDueDate || '',
            veterinarian: vaccination.veterinarian || '',
            notes: vaccination.notes || '',
          },
        });
        summary.vaccinations += 1;
      } catch (error) {
        if (error.status === 0 || error.status === 401) {
          throw error;
        }

        summary.skipped += 1;
      }
    }

    // This pet is fully moved: forget it locally.
    remainingPets = remainingPets.filter((pet) => pet !== legacyPet);
    await writeJson(LEGACY_PETS_KEY, remainingPets);
    await writeJson(LEGACY_IMPORT_MAP_KEY, importMap);
  }

  const legacyAppointments = await readJson(LEGACY_APPOINTMENTS_KEY, []);
  let remainingAppointments = Array.isArray(legacyAppointments)
    ? [...legacyAppointments]
    : [];

  for (const item of [...remainingAppointments]) {
    const newPetId = item && importMap[item.petId];

    if (!newPetId) {
      continue;
    }

    if (item.notificationId) {
      summary.oldAppointmentReminderIds.push(item.notificationId);
    }

    try {
      const time24 = /^\d{2}:\d{2}$/.test(item.time24 || '') ? item.time24 : '';
      const { appointment } = await request(
        `/api/pets/${newPetId}/appointments`,
        {
          method: 'POST',
          body: {
            clinicName: item.clinicName,
            date: item.date,
            time24,
            reason: item.reason,
          },
        }
      );

      if (item.status === 'Cancelled') {
        await request(
          `/api/pets/${newPetId}/appointments/${appointment._id}`,
          { method: 'PATCH', body: { status: 'cancelled' } }
        );
      }

      summary.appointments += 1;
    } catch (error) {
      if (error.status === 0 || error.status === 401) {
        throw error;
      }

      summary.skipped += 1;
    }

    remainingAppointments = remainingAppointments.filter(
      (appointment) => appointment !== item
    );
    await writeJson(LEGACY_APPOINTMENTS_KEY, remainingAppointments);
  }

  // Appointments that belong to a pet that could not be moved, or that has
  // no pet any more, cannot be moved. Drop them once every pet is done.
  if (remainingPets.length === 0) {
    await AsyncStorage.removeItem(LEGACY_PETS_KEY);
    await AsyncStorage.removeItem(LEGACY_APPOINTMENTS_KEY);
    await AsyncStorage.removeItem(LEGACY_IMPORT_MAP_KEY);
  }

  return summary;
}

// ----- veterinarian access (owner side) ------------------------------------

// Pending requests from veterinarians, across all of the owner's pets.
export async function loadAccessRequests() {
  const { requests } = await request('/api/owner-access/requests');

  return requests
    .filter((item) => item.pet && item.veterinarian)
    .map((item) => ({
      id: item._id,
      petId: item.pet._id,
      petName: item.pet.name || 'Pet',
      vetName: item.veterinarian.name || 'Veterinarian',
      vetEmail: item.veterinarian.email || '',
      requestedAt: item.requestedAt || item.createdAt || '',
    }));
}

// status: 'approved' or 'rejected'
export async function respondToAccessRequest(requestId, status) {
  await request(`/api/owner-access/requests/${requestId}`, {
    method: 'PATCH',
    body: { status },
  });
}

// Veterinarians who currently have access to one pet.
export async function loadPetVeterinarians(petId) {
  const { veterinarians } = await request(
    `/api/owner-access/pets/${petId}/veterinarians`
  );

  return veterinarians.map((vet) => ({
    id: vet.id,
    name: vet.name || 'Veterinarian',
    email: vet.email || '',
    approvedAt: vet.approvedAt || '',
  }));
}

export async function revokeVeterinarianAccess(petId, vetId) {
  await request(
    `/api/owner-access/pets/${petId}/veterinarians/${vetId}/revoke`,
    { method: 'PATCH' }
  );
}

// ----- veterinarian side ---------------------------------------------------

// The vet's own access requests: [{ id, petId, petName (once approved),
// status: 'pending' | 'approved' | 'rejected' | 'revoked' }]
export async function loadMyAccessRequests() {
  const { requests } = await request('/api/vet-access/requests');

  return requests.map((item) => ({
    id: item.id,
    petId: item.petId,
    petName: item.petName || '',
    status: item.status,
    requestedAt: item.requestedAt || '',
  }));
}

export async function requestPetAccess(petId) {
  await request(`/api/vet-access/pets/${petId}/request`, { method: 'POST' });
}

// Appointments for one pet (read-only for vets).
export async function loadPetAppointments(petId, petName) {
  const { appointments } = await request(`/api/pets/${petId}/appointments`);

  return appointments.map((item) =>
    toAppAppointment(item, { [petId]: petName }, {})
  );
}

// ----- administrator side --------------------------------------------------

// Veterinarian applications waiting for a decision.
export async function loadPendingVeterinarians() {
  const { veterinarians } = await request('/api/admin/veterinarians/pending');

  return veterinarians.map((vet) => ({
    id: vet._id,
    name: vet.name || 'Unnamed',
    email: vet.email || '',
    appliedAt: vet.createdAt || '',
  }));
}

// status: 'approved' or 'rejected'
export async function decideVeterinarian(vetId, status) {
  await request(`/api/admin/veterinarians/${vetId}/approval`, {
    method: 'PATCH',
    body: { status },
  });
}