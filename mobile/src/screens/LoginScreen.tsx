import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '../api';
import { ActionButton } from '../components/ActionButton';

type Props = { onSignIn: (email: string, password: string) => Promise<void> };

export function LoginScreen({ onSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await onSignIn(email.trim(), password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandMark} accessibilityElementsHidden>
          <Text style={styles.brandLetter}>m</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Welcome to Me2U
        </Text>
        <Text style={styles.description}>
          Sign in to view your wallet and financial activity.
        </Text>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#64748b"
          returnKeyType="next"
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder="Your password"
          placeholderTextColor="#64748b"
          returnKeyType="go"
          secureTextEntry
          style={styles.input}
          textContentType="password"
          value={password}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <ActionButton
          busy={busy}
          label="Sign in"
          onPress={() => void submit()}
        />
        <Text style={styles.privacy}>
          Your sign-in token is stored in the iOS Keychain on this device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brandLetter: { color: '#087f46', fontSize: 42, fontWeight: '900' },
  brandMark: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    height: 72,
    justifyContent: 'center',
    marginBottom: 28,
    width: 72,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  description: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
    marginTop: 8,
  },
  error: { color: '#9f1239', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  flex: { backgroundColor: '#f7faf8', flex: 1 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 12,
    borderWidth: 1,
    color: '#10231a',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: {
    color: '#10231a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  privacy: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 22,
    textAlign: 'center',
  },
  title: { color: '#10231a', fontSize: 30, fontWeight: '800' },
});
