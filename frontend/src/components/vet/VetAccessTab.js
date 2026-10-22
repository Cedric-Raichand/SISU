import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AppHeader from '../common/AppHeader';
import AppButton from '../common/AppButton';
import AppInput from '../common/AppInput';
import * as dataApi from '../../services/dataApi';

const STATUS_TEXT = {
  pending: 'Waiting for the owner to approve',
  approved: 'Approved',
  rejected: 'Declined by the owner',
  revoked: 'Access removed by the owner',
};

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Lets a veterinarian ask for access to a pet (using the pet's ID, which the
// owner can share) and see how each request is going.
export default function VetAccessTab({ requests, onChanged, notify }) {
  const [petId, setPetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function send(id) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      await dataApi.requestPetAccess(id);
      setNotice('Request sent. The owner must approve it before you can see the pet.');
      setPetId('');
      await onChanged();
    } catch (sendError) {
      setError(sendError.message || 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const id = petId.trim();

    if (!OBJECT_ID.test(id)) {
      setError('That does not look like a pet ID. Ask the owner to copy it from Veterinarian Access in their app.');
      setNotice('');
      return;
    }

    send(id);
  }

  async function again(item) {
    try {
      await send(item.petId);
    } catch (againError) {
      notify('Could not send the request', againError.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title="Request access"
        subtitle="Ask a pet owner for permission to see their pet's records and add your own."
      />

      <View style={styles.card}>
        <AppInput
          label="Pet ID"
          value={petId}
          onChangeText={setPetId}
          placeholder="Paste the ID the owner gave you"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <AppButton
          label={busy ? 'Sending...' : 'Send request'}
          onPress={submit}
          disabled={busy}
        />
      </View>

      <Text style={styles.sectionTitle}>Your requests</Text>

      {requests.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>You have not requested access to any pet yet.</Text>
        </View>
      ) : (
        requests.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.petName || 'Pet (name shown once approved)'}
            </Text>
            <Text style={styles.muted}>ID: {item.petId}</Text>
            <Text style={[styles.status, styles[`status_${item.status}`]]}>
              {STATUS_TEXT[item.status] || item.status}
            </Text>

            {item.status === 'rejected' || item.status === 'revoked' ? (
              <AppButton
                label="Request again"
                variant="secondary"
                onPress={() => again(item)}
                disabled={busy}
              />
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#153E35',
    marginTop: 6,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#101828', marginBottom: 2 },
  muted: { color: '#667085', fontSize: 13, lineHeight: 19 },
  status: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  status_pending: { color: '#B54708' },
  status_approved: { color: '#027A48' },
  status_rejected: { color: '#B42318' },
  status_revoked: { color: '#B42318' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  notice: { color: '#126B58', fontSize: 13, fontWeight: '600', marginBottom: 4 },
});