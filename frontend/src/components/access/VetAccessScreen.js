import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AppHeader from '../common/AppHeader';
import AppButton from '../common/AppButton';
import * as dataApi from '../../services/dataApi';

// Lets a pet owner control which veterinarians can see and add to each pet's
// records: answer pending requests and revoke access that was given.
export default function VetAccessScreen({ pets, confirm, notify }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [vetsByPet, setVetsByPet] = useState({});
  const [busyKey, setBusyKey] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      const [pending, lists] = await Promise.all([
        dataApi.loadAccessRequests(),
        Promise.all(
          pets.map(async (pet) => [
            pet.id,
            await dataApi.loadPetVeterinarians(pet.id),
          ])
        ),
      ]);

      setRequests(pending);
      setVetsByPet(Object.fromEntries(lists));
    } catch (loadError) {
      setError(loadError.message || 'Could not load veterinarian access.');
    } finally {
      setLoading(false);
    }
  }, [pets]);

  useEffect(() => {
    load();
  }, [load]);

  async function answer(item, status) {
    if (busyKey) {
      return;
    }

    setBusyKey(item.id);

    try {
      await dataApi.respondToAccessRequest(item.id, status);
      await load();
    } catch (answerError) {
      notify('Could not update the request', answerError.message);
    } finally {
      setBusyKey('');
    }
  }

  function revoke(pet, vet) {
    confirm({
      title: 'Remove access?',
      message: `${vet.name} will no longer be able to see or add records for ${pet.name}. They can ask again later, and you would need to approve it.`,
      confirmLabel: 'Remove access',
      onConfirm: async () => {
        setBusyKey(`${pet.id}:${vet.id}`);

        try {
          await dataApi.revokeVeterinarianAccess(pet.id, vet.id);
          await load();
        } catch (revokeError) {
          notify('Could not remove access', revokeError.message);
        } finally {
          setBusyKey('');
        }
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title="Veterinarian access"
        subtitle="Choose which veterinarians can see and add to your pets' health records."
      />

      {error ? (
        <View style={styles.card}>
          <Text style={styles.error}>{error}</Text>
          <AppButton label="Try again" onPress={load} />
        </View>
      ) : null}

      {loading && !error ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : null}

      {!loading && !error ? (
        <>
          <Text style={styles.sectionTitle}>
            Requests{requests.length ? ` (${requests.length})` : ''}
          </Text>

          {requests.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>No pending requests.</Text>
            </View>
          ) : (
            requests.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.vetName}</Text>
                {item.vetEmail ? (
                  <Text style={styles.muted}>{item.vetEmail}</Text>
                ) : null}
                <Text style={styles.body}>
                  wants access to {item.petName}'s records.
                </Text>

                <AppButton
                  label="Approve"
                  onPress={() => answer(item, 'approved')}
                  disabled={busyKey === item.id}
                />
                <AppButton
                  label="Decline"
                  variant="secondary"
                  onPress={() => answer(item, 'rejected')}
                  disabled={busyKey === item.id}
                />
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Your pets</Text>

          {pets.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>Add a pet first.</Text>
            </View>
          ) : (
            pets.map((pet) => {
              const vets = vetsByPet[pet.id] || [];

              return (
                <View key={pet.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{pet.name}</Text>

                  <Text style={styles.label}>Pet ID</Text>
                  <Text selectable style={styles.petId}>
                    {pet.id}
                  </Text>
                  <Text style={styles.muted}>
                    A veterinarian needs this ID to request access.
                  </Text>

                  <Text style={[styles.label, styles.gap]}>
                    Veterinarians with access
                  </Text>

                  {vets.length === 0 ? (
                    <Text style={styles.muted}>None yet.</Text>
                  ) : (
                    vets.map((vet) => (
                      <View key={vet.id} style={styles.vetRow}>
                        <Text style={styles.body}>{vet.name}</Text>
                        {vet.email ? (
                          <Text style={styles.muted}>{vet.email}</Text>
                        ) : null}
                        <AppButton
                          label="Remove access"
                          variant="danger"
                          onPress={() => revoke(pet, vet)}
                          disabled={busyKey === `${pet.id}:${vet.id}`}
                        />
                      </View>
                    ))
                  )}
                </View>
              );
            })
          )}

          <AppButton label="Refresh" variant="secondary" onPress={load} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#153E35',
    marginTop: 6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 2,
  },
  body: {
    color: '#344054',
    fontSize: 14,
    lineHeight: 21,
  },
  muted: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#344054',
    marginTop: 8,
    marginBottom: 3,
  },
  gap: {
    marginTop: 14,
  },
  petId: {
    fontSize: 13,
    color: '#101828',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  vetRow: {
    paddingTop: 8,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '600',
  },
});