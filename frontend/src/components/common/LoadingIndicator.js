
import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

export default function LoadingIndicator({
  message = 'Loading Sisu...',
}) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#16856B" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    color: '#475467',
    fontSize: 15,
  },
});