
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RecordDetail from './RecordDetail';
import AppButton from '../common/AppButton';

export default function VaccinationCard({
  vaccination,
  status,
  statusColor,
  onEdit,
  onDelete,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordTitle}>
          💉 {vaccination.vaccineName}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { borderColor: statusColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
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
          <AppButton
            label="Edit"
            variant="secondary"
            onPress={onEdit}
          />
        </View>

        <View style={styles.buttonHalf}>
          <AppButton
            label="Delete"
            variant="danger"
            onPress={onDelete}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  recordTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#153E35',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  buttonHalf: {
    flex: 1,
  },
});