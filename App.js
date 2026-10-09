
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const STORAGE_KEY = 'sisu_pets';

const INITIAL_PETS = [
  {
    id: '1',
    name: 'Buddy',
    species: 'Dog',
    breed: 'Golden Retriever',
    age: '2',
    dateOfBirth: '',
    sex: 'Unknown',
    weight: '',
    color: '',
  },
];

const EMPTY_FORM = {
  name: '',
  species: '',
  breed: '',
  age: '',
  dateOfBirth: '',
  sex: 'Unknown',
  weight: '',
  color: '',
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [petsLoaded, setPetsLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const selectedPet = pets.find(
    (pet) => pet.id === selectedPetId
  );

  // Load previously saved pets.
  useEffect(() => {
    async function loadPets() {
      try {
        const savedPets = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedPets !== null) {
          const parsedPets = JSON.parse(savedPets);

          if (Array.isArray(parsedPets)) {
            // Add defaults for pets saved by older versions.
            const compatiblePets = parsedPets.map((pet) => ({
              ...pet,
              dateOfBirth: pet.dateOfBirth || '',
              sex: pet.sex || 'Unknown',
              weight: pet.weight || '',
              color: pet.color || '',
            }));

            setPets(compatiblePets);
          } else {
            setPets(INITIAL_PETS);
          }
        } else {
          setPets(INITIAL_PETS);
        }
      } catch (error) {
        console.error('Error loading pets:', error);
        Alert.alert(
          'Storage Error',
          'We could not load your saved pets.'
        );
        setPets(INITIAL_PETS);
      } finally {
        setPetsLoaded(true);
      }
    }

    loadPets();
  }, []);

  // Save changes after the initial load has completed.
  useEffect(() => {
    if (!petsLoaded) return;

    async function savePets() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(pets)
        );
      } catch (error) {
        console.error('Error saving pets:', error);
        Alert.alert(
          'Save Error',
          'Your pet information could not be saved.'
        );
      }
    }

    savePets();
  }, [pets, petsLoaded]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function openAddPet() {
    resetForm();
    setScreen('addPet');
  }

  function openPetProfile(pet) {
    setSelectedPetId(pet.id);
    setScreen('profile');
  }

  function openEditPet(pet) {
    setSelectedPetId(pet.id);

    setForm({
      name: pet.name || '',
      species: pet.species || '',
      breed: pet.breed || '',
      age: pet.age || '',
      dateOfBirth: pet.dateOfBirth || '',
      sex: pet.sex || 'Unknown',
      weight: pet.weight || '',
      color: pet.color || '',
    });

    setScreen('editPet');
  }

  function goHome() {
    resetForm();
    setScreen('home');
  }

  function savePet() {
    if (!form.name.trim() || !form.species.trim()) {
      Alert.alert(
        'Missing Information',
        'Pet name and species are required.'
      );
      return;
    }

    const weightValue = form.weight.trim();

    if (
      weightValue &&
      (!Number.isFinite(Number(weightValue)) ||
        Number(weightValue) <= 0)
    ) {
      Alert.alert(
        'Invalid Weight',
        'Enter a weight greater than zero, in kilograms.'
      );
      return;
    }

    const petDetails = {
      name: form.name.trim(),
      species: form.species.trim(),
      breed: form.breed.trim() || 'Not specified',
      age: form.age.trim() || 'Not specified',
      dateOfBirth: form.dateOfBirth.trim(),
      sex: form.sex,
      weight: weightValue,
      color: form.color.trim() || 'Not specified',
    };

    if (screen === 'addPet') {
      const newPet = {
        id: `${Date.now()}-${Math.random()}`,
        ...petDetails,
      };

      setPets((currentPets) => [...currentPets, newPet]);
      resetForm();
      setScreen('home');

      Alert.alert(
        'Success',
        `${newPet.name} has been added to Sisu.`
      );

      return;
    }

    if (screen === 'editPet' && selectedPetId) {
      setPets((currentPets) =>
        currentPets.map((pet) =>
          pet.id === selectedPetId
            ? { ...pet, ...petDetails }
            : pet
        )
      );

      resetForm();
      setScreen('profile');

      Alert.alert(
        'Success',
        'Pet profile updated successfully.'
      );
    }
  }

  function petEmoji(species) {
    const value = species?.toLowerCase();

    if (value?.includes('dog')) return '🐕';
    if (value?.includes('cat')) return '🐈';
    if (value?.includes('bird')) return '🐦';
    if (value?.includes('rabbit')) return '🐇';
    if (value?.includes('fish')) return '🐟';
    if (value?.includes('turtle')) return '🐢';

    return '🐾';
  }

  function renderButton(label, onPress, secondary = false) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.button,
          secondary && styles.secondaryButton,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            secondary && styles.secondaryButtonText,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderInput(label, field, placeholder, options = {}) {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={form[field]}
          onChangeText={(value) => updateField(field, value)}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'sentences'}
        />
      </View>
    );
  }

  function renderForm() {
    const isEditing = screen === 'editPet';

    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>
          {isEditing ? 'UPDATE INFORMATION' : 'NEW COMPANION'}
        </Text>

        <Text style={styles.heading}>
          {isEditing ? 'Edit Pet Profile' : 'Add a Pet'}
        </Text>

        <Text style={styles.subtitle}>
          Tell us a little more about your companion.
        </Text>

        <View style={styles.formCard}>
          {renderInput('Pet Name *', 'name', 'e.g. Luna')}
          {renderInput('Species *', 'species', 'e.g. Dog or Cat')}
          {renderInput('Breed', 'breed', 'e.g. Golden Retriever')}
          {renderInput('Age', 'age', 'e.g. 2 years')}

          {renderInput(
            'Date of Birth',
            'dateOfBirth',
            'YYYY-MM-DD',
            { autoCapitalize: 'none' }
          )}

          <Text style={styles.helper}>
            Enter the date as YYYY-MM-DD, for example 2024-05-18.
          </Text>

          <Text style={styles.label}>Sex</Text>

          <View style={styles.choiceRow}>
            {['Male', 'Female', 'Unknown'].map((option) => (
              <Pressable
                key={option}
                onPress={() => updateField('sex', option)}
                style={[
                  styles.choiceButton,
                  form.sex === option && styles.choiceSelected,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    form.sex === option && styles.choiceTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          {renderInput(
            'Weight (kg)',
            'weight',
            'e.g. 4.5',
            { keyboardType: 'decimal-pad' }
          )}

          {renderInput(
            'Color / Markings',
            'color',
            'e.g. Brown with white paws'
          )}

          <Text style={styles.helper}>
            Only pet name and species are required.
          </Text>

          {renderButton(
            isEditing ? 'Save Changes' : 'Add Pet',
            savePet
          )}

          {renderButton('Cancel', goHome, true)}
        </View>
      </ScrollView>
    );
  }

  function renderProfile() {
    if (!selectedPet) {
      return (
        <View style={styles.centered}>
          <Text style={styles.heading}>Pet not found</Text>
          {renderButton('Back to Home', goHome)}
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>YOUR COMPANION</Text>
        <Text style={styles.heading}>Pet Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.petAvatar}>
            <Text style={styles.avatarEmoji}>
              {petEmoji(selectedPet.species)}
            </Text>
          </View>

          <Text style={styles.profileName}>
            {selectedPet.name}
          </Text>

          <Text style={styles.profileSpecies}>
            {selectedPet.species}
          </Text>

          <View style={styles.divider} />

          <ProfileDetail label="Pet Name" value={selectedPet.name} />
          <ProfileDetail label="Species" value={selectedPet.species} />
          <ProfileDetail label="Breed" value={selectedPet.breed} />
          <ProfileDetail label="Age" value={selectedPet.age} />
          <ProfileDetail
            label="Date of Birth"
            value={selectedPet.dateOfBirth || 'Not provided'}
          />
          <ProfileDetail
            label="Sex"
            value={selectedPet.sex || 'Unknown'}
          />
          <ProfileDetail
            label="Weight"
            value={
              selectedPet.weight
                ? `${selectedPet.weight} kg`
                : 'Not provided'
            }
          />
          <ProfileDetail
            label="Color / Markings"
            value={selectedPet.color || 'Not specified'}
          />

          {renderButton(
            'Edit Pet Profile',
            () => openEditPet(selectedPet)
          )}

          {renderButton('Back to Home', goHome, true)}
        </View>
      </ScrollView>
    );
  }

  function renderHome() {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.logo}>sisu</Text>
            <Text style={styles.tagline}>
              Better care for your companions.
            </Text>
          </View>

          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🐾</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSmall}>WELCOME TO SISU</Text>
          <Text style={styles.welcomeHeading}>
            Every pet deserves{'\n'}a healthy life.
          </Text>
          <Text style={styles.welcomeDescription}>
            Keep your pets' information together in one place.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <Text style={styles.sectionSubtitle}>
              Your beloved companions
            </Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={openAddPet}
          >
            <Text style={styles.addButtonText}>+ Add Pet</Text>
          </Pressable>
        </View>

        {pets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.emptyTitle}>No pets yet</Text>
            <Text style={styles.emptyDescription}>
              Add your first pet to start building their profile.
            </Text>
            {renderButton('Add Your First Pet', openAddPet)}
          </View>
        ) : (
          pets.map((pet) => (
            <Pressable
              key={pet.id}
              style={styles.petCard}
              onPress={() => openPetProfile(pet)}
            >
              <View style={styles.petIcon}>
                <Text style={styles.petCardEmoji}>
                  {petEmoji(pet.species)}
                </Text>
              </View>

              <View style={styles.petInfo}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petDescription}>
                  {pet.breed || 'Breed not specified'}
                </Text>
                <Text style={styles.petAge}>
                  {pet.species} · {pet.age || 'Age not provided'}
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}

        <Text style={styles.sectionTitle}>Explore Sisu</Text>
        <Text style={styles.sectionSubtitle}>
          More ways to care for your pets
        </Text>

        <FeatureCard
          emoji="🩺"
          title="Health Records"
          description="Keep track of treatments and medical history."
        />

        <FeatureCard
          emoji="💉"
          title="Vaccinations"
          description="Organize vaccination records and due dates."
        />

        <FeatureCard
          emoji="🏥"
          title="Find a Veterinarian"
          description="Discover veterinary care for your companions."
        />

        <Text style={styles.footer}>
          Made with care for every paw. 🐾
        </Text>
      </ScrollView>
    );
  }

  if (!petsLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.logo}>sisu</Text>
        <ActivityIndicator size="large" color="#267A60" />
        <Text style={styles.loadingText}>Loading your pets...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F7F8F4"
      />

      {screen === 'home' && renderHome()}

      {(screen === 'addPet' || screen === 'editPet') &&
        renderForm()}

      {screen === 'profile' && renderProfile()}
    </SafeAreaView>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value || 'Not specified'}
      </Text>
    </View>
  );
}

function FeatureCard({ emoji, title, description }) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureInfo}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
        <Text style={styles.comingSoon}>COMING SOON</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#F7F8F4',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F8F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#66736B',
    fontSize: 14,
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: '#267A60',
    letterSpacing: -1.5,
  },
  tagline: {
    color: '#66736B',
    fontSize: 13,
    marginTop: -2,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E0EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  welcomeCard: {
    backgroundColor: '#267A60',
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
  },
  welcomeSmall: {
    color: '#D5F0E1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  welcomeHeading: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 12,
  },
  welcomeDescription: {
    color: '#E0F0E7',
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#20372C',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#78837C',
    fontSize: 13,
    marginBottom: 14,
  },
  addButton: {
    backgroundColor: '#267A60',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9EDE8',
  },
  petIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: '#EAF3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  petCardEmoji: {
    fontSize: 29,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#20372C',
    marginBottom: 3,
  },
  petDescription: {
    color: '#64736A',
    fontSize: 13,
    marginBottom: 4,
  },
  petAge: {
    color: '#89938D',
    fontSize: 12,
  },
  chevron: {
    fontSize: 28,
    color: '#8B9A90',
    marginLeft: 8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E9EDE8',
  },
  emptyEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#20372C',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDescription: {
    color: '#78837C',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9EDE8',
  },
  featureEmoji: {
    fontSize: 27,
    marginRight: 14,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    color: '#20372C',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  featureDescription: {
    color: '#78837C',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  comingSoon: {
    color: '#267A60',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  eyebrow: {
    color: '#267A60',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    color: '#20372C',
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#78837C',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9EDE8',
  },
  label: {
    color: '#34483B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: '#DFE7DF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#20372C',
    marginBottom: 18,
  },
  helper: {
    color: '#78837C',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DFE7DF',
    backgroundColor: '#F8FAF7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  choiceSelected: {
    backgroundColor: '#267A60',
    borderColor: '#267A60',
  },
  choiceText: {
    color: '#34483B',
    fontSize: 12,
    fontWeight: '600',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#267A60',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#EAF1EB',
  },
  secondaryButtonText: {
    color: '#267A60',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9EDE8',
    marginTop: 14,
  },
  petAvatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: '#EAF3EC',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  profileName: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '800',
    color: '#20372C',
  },
  profileSpecies: {
    textAlign: 'center',
    color: '#78837C',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EDE7',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2EE',
    gap: 16,
  },
  detailLabel: {
    color: '#78837C',
    fontSize: 13,
  },
  detailValue: {
    color: '#20372C',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  footer: {
    textAlign: 'center',
    color: '#89938D',
    fontSize: 12,
    marginTop: 22,
    marginBottom: 12,
  },
});