import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  secureTextEntry = false,
  autoCapitalize,
  autoCorrect,
  autoComplete,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
        value={value == null ? '' : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="#98A2B3"
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoComplete={autoComplete}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 7,
  },
  input: {
    minHeight: 47,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#101828',
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
});