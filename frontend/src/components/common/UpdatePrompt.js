import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import { colors, radius, shadow } from '../../theme';

// Sisu downloads over-the-air updates in the background when it opens. Once
// one is ready, this banner lets the person restart into it when it suits
// them, so a restart never interrupts a form they are filling in.
//
// It shows nothing in development builds, Expo Go or when no update is waiting.
export default function UpdatePrompt() {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!isUpdatePending || dismissed) {
    return null;
  }

  async function restart() {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setFailed(true);
    }
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.banner}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Update ready</Text>
          <Text style={styles.message}>
            {failed
              ? 'Close and reopen Sisu to finish updating.'
              : 'A new version of Sisu has been downloaded.'}
          </Text>
        </View>

        {!failed ? (
          <Pressable
            onPress={restart}
            style={styles.restart}
            accessibilityRole="button"
            accessibilityLabel="Restart Sisu to apply the update"
          >
            <Text style={styles.restartText}>Restart</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => setDismissed(true)}
          style={styles.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandDeep,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    ...shadow.raised,
  },
  textBlock: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  restart: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  restartText: {
    color: colors.brandDeep,
    fontSize: 13,
    fontWeight: '800',
  },
  dismiss: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
});