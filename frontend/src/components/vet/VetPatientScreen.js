import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import AppHeader from '../common/AppHeader';
import AppButton from '../common/AppButton';
import AppInput from '../common/AppInput';
import ProfileDetail from '../pets/ProfileDetail';
import RecordDetail from '../health/RecordDetail';
import * as dataApi from '../../services/dataApi';

const EMPTY_RECORD = {
  date: '',
  reason: '',
  diagnosis: '',
  treatment: '',
  medication: '',
  veterinarian: '',
  notes: '',
};

const EMPTY_VACCINATION = {
  vaccineName: '',
  dateGiven: '',
  nextDueDate: '',
  veterinarian: '',
  notes: '',
};

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

// What a veterinarian with approved access sees for one pet: the profile,
// health records, vaccinations and appointments. Vets can add records, and
// change or delete only the ones they added themselves.
export default function VetPatientScreen({
  pet,
  user,
  onBack,
  onChanged,
  confirm,
  notify,
}) {
  const [section, setSection] = useState('records');
  const [form, setForm] = useState(null); // { kind, editing, values }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentsError, setAppointmentsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    dataApi
      .loadPetAppointments(pet.id, pet.name)
      .then((items) => {
        if (!cancelled) setAppointments(items);
      })
      .catch((error) => {
        if (!cancelled) setAppointmentsError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [pet.id, pet.name]);

  const isMine = (item) => item.recordedBy && item.recordedBy === user.id;

  function openForm(kind, editing = null) {
    setFormError('');
    setForm({
      kind,
      editing,
      values: editing
        ? { ...editing }
        : kind === 'record'
        ? { ...EMPTY_RECORD, date: today() }
        : { ...EMPTY_VACCINATION, dateGiven: today() },
    });
  }

  function setValue(field, value) {
    setForm((previous) => ({
      ...previous,
      values: { ...previous.values, [field]: value },
    }));
  }

  function validate() {
    const v = form.values;

    if (form.kind === 'record') {
      if (!dataApi.isValidDate((v.date || '').trim())) {
        return 'Enter a valid date using YYYY-MM-DD.';
      }

      if (!(v.reason || '').trim()) {
        return 'Please enter the reason for the visit.';
      }

      return '';
    }

    if (!(v.vaccineName || '').trim()) {
      return 'Please enter the vaccine name.';
    }

    if (!dataApi.isValidDate((v.dateGiven || '').trim())) {
      return 'Enter a valid date given using YYYY-MM-DD.';
    }

    const due = (v.nextDueDate || '').trim();

    if (due && !dataApi.isValidDate(due)) {
      return 'Enter a valid next due date using YYYY-MM-DD, or leave it empty.';
    }

    if (due && due < v.dateGiven.trim()) {
      return 'The next due date cannot be earlier than the date given.';
    }

    return '';
  }

  async function save() {
    if (saving) {
      return;
    }

    const problem = validate();

    if (problem) {
      setFormError(problem);
      return;
    }

    setSaving(true);
    setFormError('');

    const v = form.values;
    const editingId = form.editing ? form.editing.id : null;

    try {
      if (form.kind === 'record') {
        await dataApi.saveHealthRecord(pet.id, editingId, {
          ...v,
          // A new record gets the vet's name from the server when left blank.
          veterinarian: v.veterinarian || '',
        });
      } else {
        await dataApi.saveVaccination(pet.id, editingId, {
          vaccineName: v.vaccineName.trim(),
          dateGiven: v.dateGiven.trim(),
          nextDueDate: (v.nextDueDate || '').trim(),
          veterinarian: (v.veterinarian || '').trim(),
          notes: (v.notes || '').trim(),
        });
      }

      setForm(null);
      await onChanged();
    } catch (error) {
      setFormError(error.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  function remove(kind, item) {
    confirm({
      title: kind === 'record' ? 'Delete health record' : 'Delete vaccination',
      message: 'Are you sure? This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          if (kind === 'record') {
            await dataApi.deleteHealthRecord(pet.id, item.id);
          } else {
            await dataApi.deleteVaccination(pet.id, item.id);
          }

          await onChanged();
        } catch (error) {
          notify('Could not delete', error.message);
        }
      },
    });
  }

  // ---- add / edit form ----

  if (form) {
    const v = form.values;
    const field = (label, name, placeholder, multiline) => (
      <AppInput
        key={name}
        label={label}
        value={v[name]}
        onChangeText={(text) => setValue(name, text)}
        placeholder={placeholder}
        multiline={multiline}
      />
    );

    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader
          title={`${form.editing ? 'Edit' : 'Add'} ${
            form.kind === 'record' ? 'health record' : 'vaccination'
          }`}
          subtitle={`For ${pet.name}`}
        />

        <View style={styles.card}>
          {form.kind === 'record' ? (
            <>
              {field('Date *', 'date', 'YYYY-MM-DD')}
              {field('Reason for visit *', 'reason', 'Why the pet was seen')}
              {field('Diagnosis', 'diagnosis', 'Diagnosis')}
              {field('Treatment', 'treatment', 'Treatment or procedure')}
              {field('Medication', 'medication', 'Medication prescribed')}
              {field('Veterinarian', 'veterinarian', 'Leave blank to use your name')}
              {field('Notes', 'notes', 'Anything else to record', true)}
            </>
          ) : (
            <>
              {field('Vaccine name *', 'vaccineName', 'e.g. Rabies')}
              {field('Date given *', 'dateGiven', 'YYYY-MM-DD')}
              {field('Next due date', 'nextDueDate', 'YYYY-MM-DD (optional)')}
              {field('Veterinarian', 'veterinarian', 'Your name')}
              {field('Notes', 'notes', 'Batch number, reactions, etc.', true)}
            </>
          )}

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <AppButton label={saving ? 'Saving...' : 'Save'} onPress={save} disabled={saving} />
          <AppButton label="Cancel" variant="secondary" onPress={() => setForm(null)} disabled={saving} />
        </View>
      </ScrollView>
    );
  }

  // ---- patient view ----

  const sections = [
    ['records', `Records (${pet.healthRecords.length})`],
    ['vaccinations', `Vaccines (${pet.vaccinations.length})`],
    ['appointments', `Visits (${appointments.length})`],
  ];

  const badge = (item) => (
    <Text style={styles.badge}>
      {isMine(item) ? 'Added by you' : item.recordedByRole === 'vet' ? 'Added by another vet' : 'Added by owner'}
    </Text>
  );

  const actions = (kind, item) =>
    isMine(item) ? (
      <View>
        <AppButton label="Edit" variant="secondary" onPress={() => openForm(kind, item)} />
        <AppButton label="Delete" variant="danger" onPress={() => remove(kind, item)} />
      </View>
    ) : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>‹ All patients</Text>
      </Pressable>

      <AppHeader
        title={pet.name}
        subtitle={[pet.species, pet.breed].filter(Boolean).join(' · ')}
      />

      <View style={styles.card}>
        <ProfileDetail label="Age" value={pet.age} />
        <ProfileDetail label="Sex" value={pet.sex} />
        <ProfileDetail label="Date of birth" value={pet.dateOfBirth} />
        <ProfileDetail label="Weight" value={pet.weight} />
        <ProfileDetail label="Color / markings" value={pet.color} />
      </View>

      <View style={styles.tabs}>
        {sections.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setSection(key)}
            style={[styles.tab, section === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {section === 'records' ? (
        <>
          <AppButton label="＋ Add health record" onPress={() => openForm('record')} />

          {pet.healthRecords.length === 0 ? (
            <Text style={styles.muted}>No health records yet.</Text>
          ) : (
            pet.healthRecords.map((record) => (
              <View key={record.id} style={styles.card}>
                <Text style={styles.cardTitle}>{record.reason}</Text>
                <Text style={styles.muted}>{record.date}</Text>
                {badge(record)}
                <RecordDetail label="Diagnosis" value={record.diagnosis} />
                <RecordDetail label="Treatment" value={record.treatment} />
                <RecordDetail label="Medication" value={record.medication} />
                <RecordDetail label="Veterinarian" value={record.veterinarian} />
                <RecordDetail label="Notes" value={record.notes} />
                {actions('record', record)}
              </View>
            ))
          )}
        </>
      ) : null}

      {section === 'vaccinations' ? (
        <>
          <AppButton label="＋ Add vaccination" onPress={() => openForm('vaccination')} />

          {pet.vaccinations.length === 0 ? (
            <Text style={styles.muted}>No vaccinations yet.</Text>
          ) : (
            pet.vaccinations.map((vaccination) => (
              <View key={vaccination.id} style={styles.card}>
                <Text style={styles.cardTitle}>{vaccination.vaccineName}</Text>
                <Text style={styles.muted}>Given {vaccination.dateGiven}</Text>
                {badge(vaccination)}
                <RecordDetail label="Next due" value={vaccination.nextDueDate} />
                <RecordDetail label="Veterinarian" value={vaccination.veterinarian} />
                <RecordDetail label="Notes" value={vaccination.notes} />
                {actions('vaccination', vaccination)}
              </View>
            ))
          )}
        </>
      ) : null}

      {section === 'appointments' ? (
        appointmentsError ? (
          <Text style={styles.error}>{appointmentsError}</Text>
        ) : appointments.length === 0 ? (
          <Text style={styles.muted}>No appointments booked.</Text>
        ) : (
          appointments.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.clinicName}</Text>
              <Text style={styles.muted}>
                {item.date} at {item.time} · {item.status}
              </Text>
              <RecordDetail label="Reason" value={item.reason} />
            </View>
          ))
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  back: { color: '#126B58', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginTop: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#101828', marginBottom: 2 },
  muted: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 8 },
  badge: { color: '#126B58', fontSize: 11, fontWeight: '700', marginTop: 4, marginBottom: 6 },
  error: { color: '#B42318', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  tabs: { flexDirection: 'row', marginTop: 16, marginBottom: 4, gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#16856B' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#475467' },
  tabTextActive: { color: '#FFFFFF' },
});