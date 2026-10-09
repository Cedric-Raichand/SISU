
import React, { useState } from 'react';
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
} from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('home');

  const [pets, setPets] = useState([
    {
      id: '1',
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: '2',
    },
  ]);

  const [selectedPetId, setSelectedPetId] = useState(null);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');

  const selectedPet = pets.find(
    (pet) => pet.id === selectedPetId
  );

  function openAddPet() {
    setName('');
    setSpecies('');
    setBreed('');
    setAge('');
    setScreen('addPet');
  }

  function openPetProfile(pet) {
    setSelectedPetId(pet.id);
    setScreen('profile');
  }

  function openEditPet() {
    if (!selectedPet) return;

    setName(selectedPet.name);
    setSpecies(selectedPet.species);
    setBreed(
      selectedPet.breed === 'Unknown breed'
        ? ''
        : selectedPet.breed
    );
    setAge(
      selectedPet.age === 'Not specified'
        ? ''
        : selectedPet.age
    );

    setScreen('editPet');
  }

  function savePet() {
    if (!name.trim() || !species.trim()) {
      Alert.alert(
        'Missing information',
        "Please enter your pet's name and species."
      );
      return;
    }

    if (
      age.trim() &&
      (!Number.isFinite(Number(age)) || Number(age) < 0)
    ) {
      Alert.alert(
        'Invalid age',
        'Please enter a valid age of zero or greater.'
      );
      return;
    }

    if (screen === 'editPet') {
      setPets((currentPets) =>
        currentPets.map((pet) =>
          pet.id === selectedPetId
            ? {
                ...pet,
                name: name.trim(),
                species: species.trim(),
                breed: breed.trim() || 'Unknown breed',
                age: age.trim() || 'Not specified',
              }
            : pet
        )
      );

      setScreen('profile');

      Alert.alert('Updated!', 'Your pet profile has been updated.');
      return;
    }

    const newPet = {
      id: Date.now().toString(),
      name: name.trim(),
      species: species.trim(),
      breed: breed.trim() || 'Unknown breed',
      age: age.trim() || 'Not specified',
    };

    setPets((currentPets) => [...currentPets, newPet]);
    setSelectedPetId(newPet.id);
    setScreen('profile');

    Alert.alert('Success!', `${newPet.name} has been added to Sisu.`);
  }

  function petEmoji(speciesName) {
    const value = speciesName.toLowerCase();

    if (value.includes('cat')) return '🐈';
    if (value.includes('dog')) return '🐕';
    if (value.includes('bird')) return '🐦';
    if (value.includes('rabbit')) return '🐇';
    if (value.includes('fish')) return '🐠';

    return '🐾';
  }

  function goHome() {
    setScreen('home');
  }

  function renderPetForm(isEditing) {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.formContainer}
      >
        <Pressable onPress={() => setScreen(isEditing ? 'profile' : 'home')}>
          <Text style={styles.backButton}>
            ‹ {isEditing ? 'Back to profile' : 'Back to home'}
          </Text>
        </Pressable>

        <Text style={styles.formEmoji}>
          {isEditing ? '✏️' : '🐾'}
        </Text>

        <Text style={styles.formTitle}>
          {isEditing ? 'Edit pet profile' : 'Add a new pet'}
        </Text>

        <Text style={styles.formDescription}>
          {isEditing
            ? 'Update your companion’s information.'
            : 'Let’s get to know your new companion.'}
        </Text>

        <Text style={styles.label}>Pet's name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Max"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={50}
        />

        <Text style={styles.label}>Species *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dog, Cat, Rabbit"
          placeholderTextColor="#999"
          value={species}
          onChangeText={setSpecies}
          autoCapitalize="words"
          maxLength={40}
        />

        <Text style={styles.label}>Breed</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Golden Retriever"
          placeholderTextColor="#999"
          value={breed}
          onChangeText={setBreed}
          autoCapitalize="words"
          maxLength={60}
        />

        <Text style={styles.label}>Age in years</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2"
          placeholderTextColor="#999"
          value={age}
          onChangeText={setAge}
          keyboardType="decimal-pad"
          maxLength={5}
        />

        <Pressable style={styles.saveButton} onPress={savePet}>
          <Text style={styles.saveButtonText}>
            {isEditing ? 'Save changes' : 'Save pet'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => setScreen(isEditing ? 'profile' : 'home')}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <Text style={styles.requiredNote}>* Required fields</Text>
      </ScrollView>
    );
  }

  function renderProfile() {
    if (!selectedPet) {
      return (
        <View style={styles.formContainer}>
          <Text>Pet not found.</Text>
          <Pressable onPress={goHome}>
            <Text style={styles.backButton}>‹ Back to home</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.profileContainer}>
        <Pressable onPress={goHome}>
          <Text style={styles.backButton}>‹ Back to home</Text>
        </Pressable>

        <View style={styles.profileHero}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileEmoji}>
              {petEmoji(selectedPet.species)}
            </Text>
          </View>

          <Text style={styles.profileName}>{selectedPet.name}</Text>
          <Text style={styles.profileSubtitle}>
            {selectedPet.species} · {selectedPet.breed}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Pet information</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{selectedPet.name}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Species</Text>
            <Text style={styles.detailValue}>{selectedPet.species}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Breed</Text>
            <Text style={styles.detailValue}>{selectedPet.breed}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>
              {selectedPet.age === 'Not specified'
                ? 'Not specified'
                : `${selectedPet.age} years`}
            </Text>
          </View>
        </View>

        <Pressable style={styles.saveButton} onPress={openEditPet}>
          <Text style={styles.saveButtonText}>Edit pet profile</Text>
        </Pressable>

        <View style={styles.profileNote}>
          <Text style={styles.noteEmoji}>💚</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>More care features coming</Text>
            <Text style={styles.reminderDescription}>
              Vaccinations, treatments and medical history will be
              connected to individual pet profiles in upcoming milestones.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderHome() {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>sisu 🐾</Text>
            <Text style={styles.subtitle}>
              Your pet's health companion
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>C</Text>
          </View>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.greeting}>Hello, Pet Parent! 👋</Text>
          <Text style={styles.description}>
            Every little paw deserves great care.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Your pets</Text>

        {pets.map((pet) => (
          <Pressable
            key={pet.id}
            style={styles.petCard}
            onPress={() => openPetProfile(pet)}
          >
            <View style={styles.petEmoji}>
              <Text style={styles.bigEmoji}>
                {petEmoji(pet.species)}
              </Text>
            </View>

            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petDetails}>
                {pet.species} · {pet.breed}
              </Text>
              <Text style={styles.petDetails}>
                Age: {pet.age}
                {pet.age !== 'Not specified' ? ' years' : ''}
              </Text>
              <Text style={styles.profileLink}>View profile →</Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}

        <Pressable style={styles.addPetButton} onPress={openAddPet}>
          <Text style={styles.addPetText}>+ Add a new pet</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Quick actions</Text>

        <View style={styles.actionsGrid}>
          {[
            ['🩺', 'Health records', "Track your pet's health"],
            ['💉', 'Vaccinations', 'Stay on schedule'],
            ['🏥', 'Find a vet', 'Discover nearby clinics'],
            ['📅', 'Appointments', 'Plan a vet visit'],
          ].map(([emoji, title, description]) => (
            <View key={title} style={styles.actionCard}>
              <Text style={styles.actionEmoji}>{emoji}</Text>
              <Text style={styles.actionTitle}>{title}</Text>
              <Text style={styles.actionDescription}>{description}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Care reminder</Text>

        <View style={styles.reminderCard}>
          <Text style={styles.reminderEmoji}>💚</Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>
              Keep vaccinations up to date
            </Text>
            <Text style={styles.reminderDescription}>
              Record your pet's next vaccination to stay on track.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Made with ♥ for every paw</Text>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />

      {screen === 'home' && renderHome()}
      {screen === 'addPet' && renderPetForm(false)}
      {screen === 'editPet' && renderPetForm(true)}
      {screen === 'profile' && renderProfile()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: '#26734D',
  },
  subtitle: {
    fontSize: 13,
    color: '#777F78',
    marginTop: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCEFE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#26734D',
  },
  welcome: {
    marginHorizontal: 22,
    marginTop: 30,
    marginBottom: 28,
  },
  greeting: {
    fontSize: 25,
    fontWeight: '800',
    color: '#202B24',
  },
  description: {
    fontSize: 14,
    color: '#737B74',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#202B24',
    marginHorizontal: 22,
    marginBottom: 14,
    marginTop: 8,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 22,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDE8',
  },
  petEmoji: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#FFF0D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigEmoji: {
    fontSize: 38,
  },
  petInfo: {
    flex: 1,
    marginLeft: 14,
  },
  petName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202B24',
  },
  petDetails: {
    fontSize: 13,
    color: '#737B74',
    marginTop: 5,
  },
  profileLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#26734D',
    marginTop: 8,
  },
  arrow: {
    fontSize: 30,
    color: '#89928A',
  },
  addPetButton: {
    marginHorizontal: 22,
    marginTop: 4,
    marginBottom: 26,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26734D',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addPetText: {
    color: '#26734D',
    fontWeight: '700',
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  actionCard: {
    width: '46%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    margin: '2%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDE8',
    minHeight: 140,
  },
  actionEmoji: {
    fontSize: 27,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202B24',
  },
  actionDescription: {
    fontSize: 12,
    color: '#737B74',
    marginTop: 6,
    lineHeight: 18,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#E6F3E9',
    marginBottom: 24,
  },
  reminderEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#245A3D',
  },
  reminderDescription: {
    fontSize: 12,
    color: '#4F705B',
    marginTop: 5,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    color: '#89928A',
    fontSize: 12,
    marginBottom: 25,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#26734D',
    marginBottom: 26,
  },
  formEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#202B24',
  },
  formDescription: {
    fontSize: 14,
    color: '#737B74',
    marginTop: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303A32',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5DD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#202B24',
  },
  saveButton: {
    backgroundColor: '#26734D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#737B74',
  },
  requiredNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#89928A',
    marginTop: 12,
  },
  profileContainer: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileHero: {
    alignItems: 'center',
    paddingVertical: 26,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#DCEFE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  profileEmoji: {
    fontSize: 66,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#202B24',
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#737B74',
    marginTop: 8,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8EDE8',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 17,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#737B74',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#202B24',
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E8EDE8',
  },
  profileNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F3E9',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 12,
  },
  noteEmoji: {
    fontSize: 26,
  },
});