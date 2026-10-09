
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Alert,
} from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>sisu 🐾</Text>
            <Text style={styles.subtitle}>Your pet's health companion</Text>
          </View>

          <Pressable
            style={styles.avatar}
            onPress={() => Alert.alert('Profile', 'Profile coming soon!')}
          >
            <Text style={styles.avatarText}>C</Text>
          </Pressable>
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.greeting}>Hello, Pet Parent! 👋</Text>
          <Text style={styles.description}>
            Every little paw deserves great care.
          </Text>
        </View>

        {/* Pet card */}
        <Text style={styles.sectionTitle}>Your pets</Text>

        <View style={styles.petCard}>
          <View style={styles.petEmoji}>
            <Text style={styles.bigEmoji}>🐕</Text>
          </View>

          <View style={styles.petInfo}>
            <Text style={styles.petName}>Buddy</Text>
            <Text style={styles.petDetails}>Dog · 2 years old</Text>
            <Text style={styles.healthStatus}>● Looking healthy</Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>

        <Pressable
          style={styles.addPetButton}
          onPress={() => Alert.alert('Add a pet', 'Pet registration coming soon!')}
        >
          <Text style={styles.addPetText}>+  Add a new pet</Text>
        </Pressable>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>

        <View style={styles.actionsGrid}>
          <Pressable
            style={styles.actionCard}
            onPress={() => Alert.alert('Health records', 'Coming soon!')}
          >
            <Text style={styles.actionEmoji}>🩺</Text>
            <Text style={styles.actionTitle}>Health records</Text>
            <Text style={styles.actionDescription}>Track your pet's health</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Alert.alert('Vaccinations', 'Coming soon!')}
          >
            <Text style={styles.actionEmoji}>💉</Text>
            <Text style={styles.actionTitle}>Vaccinations</Text>
            <Text style={styles.actionDescription}>Stay on schedule</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Alert.alert('Find a vet', 'Coming soon!')}
          >
            <Text style={styles.actionEmoji}>🏥</Text>
            <Text style={styles.actionTitle}>Find a vet</Text>
            <Text style={styles.actionDescription}>Discover nearby clinics</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Alert.alert('Appointments', 'Coming soon!')}
          >
            <Text style={styles.actionEmoji}>📅</Text>
            <Text style={styles.actionTitle}>Appointments</Text>
            <Text style={styles.actionDescription}>Plan a vet visit</Text>
          </Pressable>
        </View>

        {/* Reminder */}
        <Text style={styles.sectionTitle}>Care reminder</Text>

        <View style={styles.reminderCard}>
          <Text style={styles.reminderEmoji}>💚</Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>Keep vaccinations up to date</Text>
            <Text style={styles.reminderDescription}>
              Record your pet's next vaccination to stay on track.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Made with ♥ for every paw
        </Text>
      </ScrollView>
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
    marginTop: 4,
  },
  healthStatus: {
    fontSize: 12,
    color: '#26734D',
    marginTop: 8,
  },
  arrow: {
    fontSize: 30,
    color: '#89928A',
  },
  addPetButton: {
    marginHorizontal: 22,
    marginTop: 12,
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
});