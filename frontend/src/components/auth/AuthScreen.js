import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import AppInput from '../common/AppInput';
import AppButton from '../common/AppButton';
import AppHeader from '../common/AppHeader';

const MODES = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to manage your pets and their health records.',
    action: 'Sign in',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Pet owners can add pets, keep health records and set reminders.',
    action: 'Create account',
  },
  vet: {
    title: 'Veterinarian application',
    subtitle:
      'Apply for a veterinarian account. An administrator must approve it before you can use Sisu as a vet.',
    action: 'Submit application',
  },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ onSignIn, onSignUp, onApplyAsVet }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const copy = MODES[mode];
  const needsName = mode !== 'login';

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  }

  function validate() {
    if (needsName && !name.trim()) {
      return 'Please enter your name.';
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (!password) {
      return 'Please enter your password.';
    }

    if (needsName && password.length < 8) {
      return 'Your password must be at least 8 characters.';
    }

    if (needsName && password !== confirmPassword) {
      return 'The two passwords do not match.';
    }

    return '';
  }

  async function handleSubmit() {
    if (busy) {
      return;
    }

    const problem = validate();

    setError('');
    setNotice('');

    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);

    try {
      if (mode === 'login') {
        await onSignIn(email.trim(), password);
      } else if (mode === 'register') {
        await onSignUp(name.trim(), email.trim(), password);
      } else {
        const message = await onApplyAsVet(
          name.trim(),
          email.trim(),
          password
        );

        // Back to sign-in with a confirmation. The vet cannot sign in as a
        // vet until an administrator approves the application.
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setNotice(message || 'Application submitted.');
      }
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>🐾 Sisu</Text>

        <AppHeader title={copy.title} subtitle={copy.subtitle} />

        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {needsName ? (
            <AppInput
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoComplete="name"
            />
          ) : null}

          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={needsName ? 'At least 8 characters' : 'Your password'}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={needsName ? 'new-password' : 'current-password'}
          />

          {needsName ? (
            <AppInput
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Type it again"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
            />
          ) : null}

          <Pressable onPress={() => setShowPassword((shown) => !shown)}>
            <Text style={styles.link}>
              {showPassword ? 'Hide password' : 'Show password'}
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            label={busy ? 'Please wait...' : copy.action}
            onPress={handleSubmit}
            disabled={busy}
          />
        </View>

        <View style={styles.switcher}>
          {mode !== 'login' ? (
            <Pressable onPress={() => switchMode('login')}>
              <Text style={styles.link}>
                Already have an account? Sign in
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => switchMode('register')}>
                <Text style={styles.link}>
                  New here? Create an owner account
                </Text>
              </Pressable>

              <Pressable
                onPress={() => switchMode('vet')}
                style={styles.secondLink}
              >
                <Text style={styles.link}>
                  Are you a veterinarian? Apply here
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16856B',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  noticeBox: {
    backgroundColor: '#E8F5F0',
    borderColor: '#C5E5D8',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    color: '#126B58',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  link: {
    color: '#126B58',
    fontSize: 14,
    fontWeight: '700',
  },
  switcher: {
    marginTop: 20,
    alignItems: 'center',
  },
  secondLink: {
    marginTop: 14,
  },
});