
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

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');

  function handleAddPet() {
    if (!name.trim() || !species.trim()) {
      Alert.alert('Missing information', 'Please enter your pet’s name and species.');
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

    setName('');
    setSpecies('');
    setBreed('');
    setAge('');

    setScreen('home');

    Alert.alert('Success!', `${newPet.name} has been added to Sisu.`);
  }

  function handleOpenAddPet() {
    setScreen('addPet');
  }

  function handleGoHome() {
    setScreen('home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />

      {screen === 'home' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
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

          {/* Welcome */}
          <View style={styles.welcome}>
            <Text style={styles.greeting}>Hello, Pet Parent! 👋</Text>
            <Text style={styles.description}>
              Every little paw deserves great care.
            </Text>
          </View>

          {/* Pets */}
          <Text style={styles.sectionTitle}>Your pets</Text>

          {pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              <View style={styles.petEmoji}>
                <Text style={styles.bigEmoji}>
                  {pet.species.toLowerCase().includes('cat')
                    ? '🐈'
                    : pet.species.toLowerCase().includes('bird')
                    ? '🐦'
                    : pet.species.toLowerCase().includes('rabbit')
                    ? '🐇'
                    : '🐾'}
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
              </View>
            </View>
          ))}

          <Pressable
            style={styles.addPetButton}
            onPress={handleOpenAddPet}
          >
            <Text style={styles.addPetText}>+ Add a new pet</Text>
          </Pressable>

          {/* Quick actions */}
          <Text style={styles.sectionTitle}>Quick actions</Text>

          <View style={styles.actionsGrid}>
            <View style={styles.actionCard}>
              <Text style={styles.actionEmoji}>🩺</Text>
              <Text style={styles.actionTitle}>Health records</Text>
              <Text style={styles.actionDescription}>
                Track your pet's health
              </Text>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.actionEmoji}>💉</Text>
              <Text style={styles.actionTitle}>Vaccinations</Text>
              <Text style={styles.actionDescription}>
                Stay on schedule
              </Text>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.actionEmoji}>🏥</Text>
              <Text style={styles.actionTitle}>Find a vet</Text>
              <Text style={styles.actionDescription}>
                Discover nearby clinics
              </Text>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.actionEmoji}>📅</Text>
              <Text style={styles.actionTitle}>Appointments</Text>
              <Text style={styles.actionDescription}>
                Plan a vet visit
              </Text>
            </View>
          </View>

          {/* Reminder */}
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

          <Text style={styles.footer}>
            Made with ♥ for every paw
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.formContainer}
        >
          {/* Form header */}
          <Pressable onPress={handleGoHome}>
            <Text style={styles.backButton}>‹ Back to home</Text>
          </Pressable>

          <Text style={styles.formEmoji}>🐾</Text>

          <Text style={styles.formTitle}>Add a new pet</Text>

          <Text style={styles.formDescription}>
            Let's get to know your new companion.
          </Text>

          {/* Pet name */}
          <Text style={styles.label}>Pet's name *</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Max"
            placeholderTextColor="#999999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={50}
          />

          {/* Species */}
          <Text style={styles.label}>Species *</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Dog, Cat, Rabbit"
            placeholderTextColor="#999999"
            value={species}
            onChangeText={setSpecies}
            autoCapitalize="words"
            maxLength={40}
          />

          {/* Breed */}
          <Text style={styles.label}>Breed</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Golden Retriever"
            placeholderTextColor="#999999"
            value={breed}
            onChangeText={setBreed}
            autoCapitalize="words"
            maxLength={60}
          />

          {/* Age */}
          <Text style={styles.label}>Age in years</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 2"
            placeholderTextColor="#999999"
            value={age}
            onChangeText={setAge}
            keyboardType="decimal-pad"
            maxLength={5}
          />

          {/* Save */}
          <Pressable
            style={styles.saveButton}
            onPress={handleAddPet}
          >
            <Text style={styles.saveButtonText}>Save pet</Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={handleGoHome}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Text style={styles.requiredNote}>
            * Required fields
          </Text>
        </ScrollView>
      )}
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
    marginBottom: 30,
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
    marginBottom: 28,
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
});