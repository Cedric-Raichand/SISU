
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeatureCard from './src/components/common/FeatureCard';

const STORAGE_KEY = 'sisu_pets';

const INITIAL_PETS = [
  {
    id: 'pet-buddy',
    name: 'Buddy',
    species: 'Dog',
    breed: 'Golden Retriever',
    age: '2',
    dateOfBirth: '',
    sex: 'Unknown',
    weight: '',
    color: '',
    healthRecords: [],
    vaccinations: [],
  },
];

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

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
    vaccinations: Array.isArray(pet.vaccinations)
      ? pet.vaccinations
      : [],
  };
}

export default function App() {
  const [screen, setScreen] = useState('home');
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

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (!petsLoaded) {
      return;
    }

    savePets();
  }, [pets, petsLoaded]);

  async function loadPets() {
    try {
      const storedPets = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedPets) {
        const parsedPets = JSON.parse(storedPets);

        if (Array.isArray(parsedPets)) {
          setPets(parsedPets.map(normalizePet));
        } else {
          setPets(INITIAL_PETS.map(normalizePet));
        }
      } else {
        setPets(INITIAL_PETS.map(normalizePet));
      }
    } catch (error) {
      console.error('Could not load pets:', error);
      Alert.alert(
        'Loading error',
        'We could not load your saved pets.'
      );
      setPets(INITIAL_PETS.map(normalizePet));
    } finally {
      setPetsLoaded(true);
    }
  }

  async function savePets() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
    } catch (error) {
      console.error('Could not save pets:', error);
      Alert.alert(
        'Saving error',
        'Your changes could not be saved locally.'
      );
    }
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

    if (editingPetId) {
      setPets((previous) =>
        previous.map((pet) =>
          pet.id === editingPetId
            ? {
                ...pet,
                ...petForm,
                name: petForm.name.trim(),
                species: petForm.species.trim(),
              }
            : pet
        )
      );

      setSelectedPetId(editingPetId);
      setScreen('profile');
      return;
    }

    const newPet = normalizePet({
      ...petForm,
      id: createId(),
      name: petForm.name.trim(),
      species: petForm.species.trim(),
      healthRecords: [],
      vaccinations: [],
    });

    setPets((previous) => [...previous, newPet]);
    setSelectedPetId(newPet.id);
    setPetForm({ ...EMPTY_PET_FORM });
    setScreen('profile');
  }

  function openProfile(pet) {
    setSelectedPetId(pet.id);
    setScreen('profile');
  }

  function deletePet(petId) {
    Alert.alert(
      'Delete pet',
      'Are you sure you want to delete this pet and its associated records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPets((previous) =>
              previous.filter((pet) => pet.id !== petId)
            );

            if (selectedPetId === petId) {
              setSelectedPetId(null);
            }

            setScreen('home');
          },
        },
      ]
    );
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

    const record = {
      id: selectedRecordId || createId(),
      ...healthForm,
      date: healthForm.date.trim(),
      reason: healthForm.reason.trim(),
    };

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
    Alert.alert(
      'Delete health record',
      'Are you sure you want to delete this medical record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
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
        },
      ]
    );
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

    const vaccination = {
      id: selectedVaccinationId || createId(),
      vaccineName,
      dateGiven,
      nextDueDate,
      veterinarian: vaccinationForm.veterinarian.trim(),
      notes: vaccinationForm.notes.trim(),
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
          vaccinations: [
            ...currentVaccinations,
            vaccination,
          ],
        };
      })
    );

    setScreen('vaccinations');
  }

  function deleteVaccination(vaccinationId) {
    Alert.alert(
      'Delete vaccination',
      'Are you sure you want to delete this vaccination record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPets((previous) =>
              previous.map((pet) =>
                pet.id === selectedPetId
                  ? {
                      ...pet,
                      vaccinations: pet.vaccinations.filter(
                        (vaccination) =>
                          vaccination.id !== vaccinationId
                      ),
                    }
                  : pet
              )
            );
          },
        },
      ]
    );
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

  function renderButton(
    label,
    onPress,
    variant = 'primary',
    extraStyle = {}
  ) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.button,
          variant === 'secondary' && styles.secondaryButton,
          variant === 'danger' && styles.dangerButton,
          extraStyle,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            variant === 'secondary' &&
              styles.secondaryButtonText,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderPetInput(
    label,
    field,
    placeholder,
    keyboardType = 'default'
  ) {
    return (
      <View style={styles.inputGroup} key={field}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          value={String(petForm[field] ?? '')}
          onChangeText={(value) => updatePetForm(field, value)}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor="#98A2B3"
        />
      </View>
    );
  }

  function renderHealthInput(
    label,
    field,
    placeholder,
    multiline = false
  ) {
    return (
      <View style={styles.inputGroup} key={field}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
          value={healthForm[field] || ''}
          onChangeText={(value) =>
            updateHealthForm(field, value)
          }
          placeholder={placeholder}
          placeholderTextColor="#98A2B3"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    );
  }

  function renderVaccinationInput(
    label,
    field,
    placeholder,
    multiline = false
  ) {
    return (
      <View style={styles.inputGroup} key={field}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
          value={vaccinationForm[field] || ''}
          onChangeText={(value) =>
            updateVaccinationForm(field, value)
          }
          placeholder={placeholder}
          placeholderTextColor="#98A2B3"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
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
    return (
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.pageSubtitle}>{subtitle}</Text>
        )}
      </View>
    );
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
          {renderPetInput(
            'Weight',
            'weight',
            'e.g. 12 kg'
          )}
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
            () =>
              setScreen(editing ? 'profile' : 'home'),
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
          <ProfileDetail label="Color / markings" value={selectedPet.color} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Health management</Text>

          {renderButton(
            '📋 View Medical History',
            () => openHealthRecords(selectedPet)
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
          'Back to Dashboard',
          () => setScreen('home'),
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

        {renderButton(
          '+ Add Health Record',
          openAddHealthRecord
        )}

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
                <Text style={styles.recordDate}>
                  {record.date}
                </Text>
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
            Sisu checks the due dates saved in each record and displays
            the status here. These are in-app reminders, not push
            notifications.
          </Text>
        </View>

        {renderButton(
          '+ Add Vaccination',
          openAddVaccination
        )}

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
              <View
                style={styles.vaccinationCard}
                key={vaccination.id}
              >
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>
                    💉 {vaccination.vaccineName}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        borderColor:
                          getVaccinationStatusColor(status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            getVaccinationStatusColor(status),
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </View>

                <RecordDetail
                  label="Date given"
                  value={vaccination.dateGiven}
                />
                <RecordDetail
                  label="Next due date"
                  value={vaccination.nextDueDate || 'Not set'}
                />
                <RecordDetail
                  label="Veterinarian"
                  value={vaccination.veterinarian}
                />
                <RecordDetail
                  label="Notes"
                  value={vaccination.notes}
                />

                <View style={styles.buttonRow}>
                  <View style={styles.buttonHalf}>
                    {renderButton(
                      'Edit',
                      () => openEditVaccination(vaccination),
                      'secondary'
                    )}
                  </View>
                  <View style={styles.buttonHalf}>
                    {renderButton(
                      'Delete',
                      () => deleteVaccination(vaccination.id),
                      'danger'
                    )}
                  </View>
                </View>
              </View>
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
        item.status === 'Overdue' ||
        item.status === 'Due today'
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
            <Pressable
              key={pet.id}
              style={styles.petCard}
              onPress={() => openProfile(pet)}
            >
              <View style={styles.petCardEmoji}>
                <Text style={styles.petEmoji}>
                  {petEmoji(pet.species)}
                </Text>
              </View>

              <View style={styles.petCardContent}>
                <Text style={styles.petCardName}>{pet.name}</Text>
                <Text style={styles.petCardSubtitle}>
                  {[pet.species, pet.breed]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={styles.petCardMeta}>
                  {pet.healthRecords.length} health record(s) ·{' '}
                  {pet.vaccinations.length} vaccination(s)
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
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
            <Pressable
              key={`${item.petId}-${item.id}`}
              style={styles.reminderCard}
              onPress={() => {
                setSelectedPetId(item.petId);
                setScreen('vaccinations');
              }}
            >
              <View style={styles.reminderMain}>
                <Text style={styles.reminderTitle}>
                  {item.vaccineName}
                </Text>
                <Text style={styles.reminderPet}>
                  {item.petName}
                </Text>
                <Text style={styles.reminderDate}>
                  Due: {item.nextDueDate}
                </Text>
              </View>

              <Text
                style={[
                  styles.reminderStatus,
                  {
                    color: getVaccinationStatusColor(item.status),
                  },
                ]}
              >
                {item.status}
              </Text>
            </Pressable>
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
          emoji="📍"
          title="Find a Veterinarian"
          description="Discover nearby veterinary clinics."
          onPress={() =>
            Alert.alert(
              'Coming next',
              'Veterinarian discovery has not been implemented yet.'
            )
          }
        />

        <Text style={styles.footerText}>
          Sisu · Care for every paw 🐾
        </Text>
      </ScrollView>
    );
  }

  if (!petsLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#16856B" />
        <Text style={styles.loadingText}>Loading Sisu...</Text>
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

    case 'home':
    default:
      content = renderHome();
      break;
  }

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
    </SafeAreaView>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <View style={styles.profileDetail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value === undefined || value === null || value === ''
          ? 'Not provided'
          : String(value)}
      </Text>
    </View>
  );
}

function RecordDetail({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.recordDetail}>
      <Text style={styles.recordDetailLabel}>{label}</Text>
      <Text style={styles.recordDetailValue}>{value}</Text>
    </View>
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
  loadingText: {
    marginTop: 12,
    color: '#475467',
    fontSize: 15,
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
  pageHeader: {
    marginBottom: 20,
    marginTop: 6,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
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
  button: {
    minHeight: 47,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#16856B',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#E8F5F0',
    borderWidth: 1,
    borderColor: '#C5E5D8',
  },
  secondaryButtonText: {
    color: '#126B58',
  },
  dangerButton: {
    backgroundColor: '#B42318',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 7,
  },
  input: {
    minHeight: 47,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#101828',
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#667085',
    marginBottom: 14,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },
  petCardEmoji: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5F0',
    marginRight: 13,
  },
  petEmoji: {
    fontSize: 28,
  },
  petCardContent: {
    flex: 1,
  },
  petCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 4,
  },
  petCardSubtitle: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 5,
  },
  petCardMeta: {
    color: '#667085',
    fontSize: 11,
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
  profileDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1',
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: '#667085',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#344054',
    fontWeight: '600',
    textAlign: 'right',
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
  recordDetail: {
    paddingVertical: 6,
  },
  recordDetailLabel: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 3,
  },
  recordDetailValue: {
    fontSize: 13,
    color: '#344054',
    lineHeight: 19,
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
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7EEEA',
    marginBottom: 10,
  },
  reminderMain: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 4,
  },
  reminderPet: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 12,
    color: '#475467',
  },
  reminderStatus: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
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