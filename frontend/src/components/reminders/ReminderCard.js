
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';

export default function ReminderCard({
  item,
  onPress,
  statusColor,
}) {
  return (
    <Pressable
      style={styles.reminderCard}
      onPress={onPress}
    >
      <View style={styles.reminderMain}>
        <Text style={styles.reminderTitle}>
          {item.vaccineName}
        </Text>

        <Text style={styles.reminderPet}>
          {item.petName}
        </Text>

        <Text style={styles.reminderDate}>
          Due: {item.nextDueDate}
        </Text>
      </View>

      <Text
        style={[
          styles.reminderStatus,
          { color: statusColor },
        ]}
      >
        {item.status}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7EEEA',
    marginBottom: 10,
  },

  reminderMain: {
    flex: 1,
  },

  reminderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 4,
  },

  reminderPet: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 4,
  },

  reminderDate: {
    fontSize: 12,
    color: '#475467',
  },

  reminderStatus: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
});