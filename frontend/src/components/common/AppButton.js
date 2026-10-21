import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
}) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        isSecondary && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
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
    minHeight: 47,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#16856B',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#E8F5F0',
    borderWidth: 1,
    borderColor: '#C5E5D8',
  },
  secondaryButtonText: {
    color: '#126B58',
  },
  dangerButton: {
    backgroundColor: '#B42318',
  },
  disabledButton: {
    opacity: 0.55,
  },
});