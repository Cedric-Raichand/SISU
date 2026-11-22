import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';

// Shown while the saved login is being checked. It matches the native splash
// screen (same colour, same artwork, same size) so opening the app looks like
// one continuous screen instead of a flash between two.
export default function BrandedLoading() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Sisu"
      />

      <ActivityIndicator
        size="small"
        color="rgba(255,255,255,0.85)"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 320,
    height: 320,
    maxWidth: '100%',
  },
  spinner: {
    position: 'absolute',
    bottom: 72,
  },
});