import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep device logs useful without including user, financial, or provider data.
    console.warn('[me2u-native] A screen render error was contained.');
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={styles.container}>
          <Text accessibilityRole="header" style={styles.title}>
            This screen could not be loaded
          </Text>
          <Text style={styles.body}>
            Your account data has not been changed. Close and reopen Me2U or
            contact support if the problem continues.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ failed: false })}
            style={styles.retryButton}
          >
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  body: { color: '#334155', fontSize: 16, lineHeight: 24, marginTop: 12 },
  container: {
    backgroundColor: '#f7faf8',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  retry: { color: '#087f46', fontSize: 16, fontWeight: '800' },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 48,
  },
  title: { color: '#10231a', fontSize: 24, fontWeight: '800' },
});
