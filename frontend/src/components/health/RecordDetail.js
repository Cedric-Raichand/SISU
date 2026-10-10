
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RecordDetail({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.recordDetail}>
      <Text style={styles.recordDetailLabel}>
        {label}
      </Text>

      <Text style={styles.recordDetailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  recordDetail: {
    paddingVertical: 6,
  },

  recordDetailLabel: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 3,
  },

  recordDetailValue: {
    fontSize: 13,
    color: '#344054',
  },
});