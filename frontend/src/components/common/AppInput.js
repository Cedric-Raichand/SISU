import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { requestKeyboardAdjust } from './KeyboardAwareScrollView';
import { colors, radius } from '../../theme';

const AppInput = forwardRef(function AppInput({
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
  returnKeyType,
  onSubmitEditing,
}, ref) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, focused && styles.inputLabelFocused]}>
        {label}
      </Text>

      <TextInput
        ref={ref}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          focused && styles.inputFocused,
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
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={!multiline && onSubmitEditing ? 'submit' : undefined}
        onFocus={() => {
          setFocused(true);
          requestKeyboardAdjust();
        }}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
});

export default AppInput;

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
  inputLabelFocused: {
    color: colors.brandDark,
  },
  input: {
    minHeight: 47,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    backgroundColor: '#FCFDFD',
    color: '#101828',
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.white,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
});