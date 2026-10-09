
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileDetail({ label, value }) {
  const displayValue =
    value === undefined || value === null || value === ''
      ? 'Not provided'
      : String(value);

  return (
    <View style={styles.profileDetail}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue}>
        {displayValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1',
  },

  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: '#667085',
  },

  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#344054',
    fontWeight: '600',
    textAlign: 'right',
  },
});