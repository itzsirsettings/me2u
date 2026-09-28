import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  destructive?: boolean;
};

export function ActionButton({
  label,
  onPress,
  disabled,
  busy,
  destructive,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: Boolean(disabled || busy),
        busy: Boolean(busy),
      }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        destructive && styles.destructive,
        pressed && styles.pressed,
        (disabled || busy) && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#087f46',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  destructive: { backgroundColor: '#a61b1b' },
  disabled: { opacity: 0.55 },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.82 },
});
