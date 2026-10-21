import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AppHeader from '../common/AppHeader';
import AppButton from '../common/AppButton';

function getMessage(user) {
  if (user.role === 'admin') {
    return {
      title: 'Administrator',
      body: 'Veterinarian approval tools are not in the app yet. For now, approve applications through the admin API.',
    };
  }

  switch (user.vetApprovalStatus) {
    case 'approved':
      return {
        title: 'Veterinarian',
        body: 'Your account is approved. The veterinarian tools (requesting pet access and adding records) are coming to the app in the next step.',
      };
    case 'rejected':
      return {
        title: 'Application not approved',
        body: 'An administrator did not approve this veterinarian application.',
      };
    default:
      return {
        title: 'Application pending',
        body: 'Your veterinarian application is waiting for administrator approval. Sign in again later to check.',
      };
  }
}

export default function RoleHomeScreen({ user, onSignOut }) {
  const message = getMessage(user);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title={message.title}
        subtitle={user.name ? `Signed in as ${user.name}` : undefined}
      />

      <View style={styles.card}>
        <Text style={styles.body}>{message.body}</Text>
      </View>

      <AppButton label="Sign out" onPress={onSignOut} variant="secondary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginBottom: 6,
  },
  body: {
    color: '#344054',
    fontSize: 14,
    lineHeight: 21,
  },
});