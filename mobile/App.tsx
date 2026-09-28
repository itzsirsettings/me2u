import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ApiError,
  getProfile,
  login,
  logout,
  type UserProfile,
} from './src/api';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootStackParamList } from './src/navigation';
import { AccountDeletionScreen } from './src/screens/AccountDeletionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import {
  clearSessionToken,
  readSessionToken,
  saveSessionToken,
} from './src/session';
import { SessionContext } from './src/session-context';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [state, setState] = useState<
    'loading' | 'signed-out' | 'signed-in' | 'offline'
  >('loading');

  const loadSession = useCallback(async () => {
    setState('loading');
    let savedToken: string | null;
    try {
      savedToken = await readSessionToken();
    } catch {
      setState('offline');
      return;
    }
    if (!savedToken) {
      setToken(null);
      setUser(null);
      setState('signed-out');
      return;
    }
    try {
      const result = await getProfile(savedToken);
      setToken(savedToken);
      setUser(result.user);
      setState('signed-in');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSessionToken();
        setToken(null);
        setUser(null);
        setState('signed-out');
      } else {
        setToken(savedToken);
        setState('offline');
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSession();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await login(email, password);
    await saveSessionToken(result.accessToken);
    try {
      const profile = await getProfile(result.accessToken);
      setToken(result.accessToken);
      setUser(profile.user);
      setState('signed-in');
    } catch (error) {
      await clearSessionToken();
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) throw new ApiError('Please sign in again.', 401);
    try {
      const result = await getProfile(token);
      setUser(result.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSessionToken();
        setToken(null);
        setUser(null);
        setState('signed-out');
      }
      throw error;
    }
  }, [token]);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await logout(token);
      } catch {
        // Clear local credentials even if the server is unreachable.
      } finally {
        await clearSessionToken();
      }
    }
    setToken(null);
    setUser(null);
    setState('signed-out');
  }, [token]);

  const context = useMemo(
    () => (token && user ? { token, user, refreshProfile, signOut } : null),
    [token, user, refreshProfile, signOut],
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          {state === 'loading' ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#087f46" size="large" />
              <Text accessibilityLiveRegion="polite" style={styles.loadingText}>
                Checking your secure session…
              </Text>
            </View>
          ) : state === 'offline' ? (
            <View style={styles.centered}>
              <Text accessibilityRole="header" style={styles.title}>
                You’re offline
              </Text>
              <Text style={styles.body}>
                Reconnect to refresh your account. Financial actions are
                unavailable offline.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadSession()}
                style={styles.retryButton}
              >
                <Text style={styles.retry}>Try again</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void signOut()}
                style={styles.retryButton}
              >
                <Text style={styles.retry}>Sign out</Text>
              </Pressable>
            </View>
          ) : state === 'signed-out' ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login">
                {() => <LoginScreen onSignIn={signIn} />}
              </Stack.Screen>
            </Stack.Navigator>
          ) : context ? (
            <SessionContext.Provider value={context}>
              <Stack.Navigator
                screenOptions={{
                  headerStyle: { backgroundColor: '#f7faf8' },
                  headerTintColor: '#10231a',
                  headerTitleStyle: { fontWeight: '800' },
                  contentStyle: { backgroundColor: '#f7faf8' },
                }}
              >
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ title: 'Me2U' }}
                />
                <Stack.Screen
                  name="AccountDeletion"
                  component={AccountDeletionScreen}
                  options={{ title: 'Account deletion' }}
                />
              </Stack.Navigator>
            </SessionContext.Provider>
          ) : null}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#f7faf8',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: { color: '#334155', fontSize: 16, marginTop: 14 },
  retry: {
    color: '#087f46',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    padding: 8,
  },
  retryButton: { minHeight: 48, minWidth: 100 },
  title: { color: '#10231a', fontSize: 24, fontWeight: '800' },
});
