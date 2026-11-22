import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, radius, shadow, pressed } from '../../theme';

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
}) {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed: isPressed }) => [
        styles.button,
        isSecondary && styles.secondaryButton,
        isDanger && styles.dangerButton,
        !isSecondary && !disabled && shadow.card,
        isPressed && !disabled && pressed,
        disabled && styles.disabledButton,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          isSecondary && styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    marginTop: 10,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  secondaryButtonText: {
    color: colors.brandDark,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  disabledButton: {
    opacity: 0.55,
  },
});