import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import AppHeader from '../common/AppHeader';
import AppButton from '../common/AppButton';
import LoadingIndicator from '../common/LoadingIndicator';
import * as dataApi from '../../services/dataApi';

const TABS = [
  { key: 'applications', label: 'Applications', emoji: '📝' },
  { key: 'account', label: 'Account', emoji: '👤' },
];

function formatDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

// The administrator's app: review veterinarian applications.
export default function AdminApp({ user, onSignOut, confirm, notify }) {
  const [tab, setTab] = useState('applications');
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [lastAction, setLastAction] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      setPending(await dataApi.loadPendingVeterinarians());
    } catch (loadError) {
      setError(loadError.message || 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function decide(vet, status) {
    const approving = status === 'approved';

    confirm({
      title: approving ? 'Approve veterinarian?' : 'Reject application?',
      message: approving
        ? `${vet.name} (${vet.email}) will be able to request access to pets and add medical records. Only approve people you have verified.`
        : `${vet.name} (${vet.email}) will not be able to use Sisu as a veterinarian.`,
      confirmLabel: approving ? 'Approve' : 'Reject',
      onConfirm: async () => {
        if (busyId) {
          return;
        }

        setBusyId(vet.id);

        try {
          await dataApi.decideVeterinarian(vet.id, status);
          setLastAction(`${vet.name} was ${approving ? 'approved' : 'rejected'}.`);
          await load();
        } catch (decideError) {
          notify('Could not update the application', decideError.message);
        } finally {
          setBusyId('');
        }
      },
    });
  }

  function renderApplications() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Veterinarian applications"
          subtitle="Approve only veterinarians whose credentials you have checked."
        />

        {lastAction ? <Text style={styles.notice}>{lastAction}</Text> : null}

        {error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <AppButton label="Try again" onPress={load} />
          </View>
        ) : null}

        {!error && pending.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>No applications are waiting.</Text>
          </View>
        ) : null}

        {pending.map((vet) => (
          <View key={vet.id} style={styles.card}>
            <Text style={styles.cardTitle}>{vet.name}</Text>
            <Text style={styles.muted}>{vet.email}</Text>
            {formatDate(vet.appliedAt) ? (
              <Text style={styles.muted}>Applied {formatDate(vet.appliedAt)}</Text>
            ) : null}

            <AppButton
              label="Approve"
              onPress={() => decide(vet, 'approved')}
              disabled={busyId === vet.id}
            />
            <AppButton
              label="Reject"
              variant="danger"
              onPress={() => decide(vet, 'rejected')}
              disabled={busyId === vet.id}
            />
          </View>
        ))}

        {!error ? (
          <AppButton label="Refresh" variant="secondary" onPress={load} />
        ) : null}
      </ScrollView>
    );
  }

  function renderAccount() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="Account" subtitle="Administrator" />

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
    content = <LoadingIndicator message="Loading applications..." />;
  } else if (tab === 'applications') {
    content = renderApplications();
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
                if (item.key === 'applications') load();
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
  notice: { color: '#126B58', fontSize: 13, fontWeight: '600', marginBottom: 12 },
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