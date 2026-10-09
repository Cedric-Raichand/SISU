
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppHeader({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 21,
  },
});