import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import AppHeader from '../common/AppHeader';
import AppButton from '../common/AppButton';
import PetCard from '../pets/PetCard';
import LoadingIndicator from '../common/LoadingIndicator';
import VetAccessTab from './VetAccessTab';
import VetPatientScreen from './VetPatientScreen';
import * as dataApi from '../../services/dataApi';

const TABS = [
  { key: 'patients', label: 'Patients', emoji: '🐾' },
  { key: 'access', label: 'Requests', emoji: '🔑' },
  { key: 'account', label: 'Account', emoji: '👤' },
];

// The app for an approved veterinarian: see the pets whose owners have
// approved access, add medical records, and request access to more pets.
export default function VetApp({ user, onSignOut, confirm, notify }) {
  const [tab, setTab] = useState('patients');
  const [pets, setPets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      const [loadedPets, loadedRequests] = await Promise.all([
        dataApi.loadPets(),
        dataApi.loadMyAccessRequests(),
      ]);

      setPets(loadedPets);
      setRequests(loadedRequests);
    } catch (loadError) {
      setError(loadError.message || 'Could not load your patients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPet = pets.find((pet) => pet.id === selectedPetId);

  function renderPatients() {
    if (selectedPet) {
      return (
        <VetPatientScreen
          pet={selectedPet}
          user={user}
          onBack={() => setSelectedPetId(null)}
          onChanged={load}
          confirm={confirm}
          notify={notify}
        />
      );
    }

    const pending = requests.filter((item) => item.status === 'pending').length;

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Your patients"
          subtitle="Pets whose owners have given you access."
        />

        {error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <AppButton label="Try again" onPress={load} />
          </View>
        ) : null}

        {!error && pets.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>
              No patients yet. Ask an owner for their pet's ID, then send a request from the Requests tab.
              {pending ? ` You have ${pending} request(s) waiting for approval.` : ''}
            </Text>
            <AppButton label="Request access" onPress={() => setTab('access')} />
          </View>
        ) : null}

        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            emoji={pet.species && pet.species.toLowerCase() === 'cat' ? '🐱' : '🐶'}
            onPress={() => setSelectedPetId(pet.id)}
          />
        ))}

        {!error && pets.length > 0 ? (
          <AppButton label="Refresh" variant="secondary" onPress={load} />
        ) : null}
      </ScrollView>
    );
  }

  function renderAccount() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="Account" subtitle="Veterinarian" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{user.name || user.email}</Text>
          {user.name && user.email ? <Text style={styles.muted}>{user.email}</Text> : null}
        </View>

        <AppButton
          label="Sign out"
          variant="secondary"
          onPress={() =>
            confirm({
              title: 'Sign out?',
              message: 'You will need to sign in again to use Sisu.',
              confirmLabel: 'Sign out',
              onConfirm: onSignOut,
            })
          }
        />
      </ScrollView>
    );
  }

  let content;

  if (loading) {
    content = <LoadingIndicator message="Loading your patients..." />;
  } else if (tab === 'patients') {
    content = renderPatients();
  } else if (tab === 'access') {
    content = <VetAccessTab requests={requests} onChanged={load} notify={notify} />;
  } else {
    content = renderAccount();
  }

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>{content}</View>

      <View style={styles.bottomNav}>
        {TABS.map((item) => {
          const active = item.key === tab;

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setTab(item.key);
                if (item.key === 'patients') setSelectedPetId(null);
                // Pick up approvals and other changes made since last time.
                if (item.key !== 'account') load();
              }}
              style={styles.navItem}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.navEmoji, !active && styles.navInactive]}>{item.emoji}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#101828' },
  muted: { color: '#667085', fontSize: 13, lineHeight: 19 },
  error: { color: '#B42318', fontSize: 13, fontWeight: '600' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
    paddingVertical: 8,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navEmoji: { fontSize: 20 },
  navInactive: { opacity: 0.5 },
  navLabel: { fontSize: 11, fontWeight: '600', color: '#667085', marginTop: 2 },
  navLabelActive: { color: '#126B58', fontWeight: '800' },
});