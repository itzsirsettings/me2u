import React, { useContext, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ApiError,
  createDeletionRequest,
  getDeletionRequest,
  type DeletionRequest,
} from '../api';
import { ActionButton } from '../components/ActionButton';
import { SessionContext } from '../session-context';

export function AccountDeletionScreen() {
  const session = useContext(SessionContext);
  const [password, setPassword] = useState('');
  const [deletion, setDeletion] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!session) return;
    void getDeletionRequest(session.token)
      .then(result => setDeletion(result.request))
      .catch(cause => {
        if (cause instanceof ApiError && cause.status === 401)
          void session.signOut();
        else
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Status is unavailable.',
          );
      })
      .finally(() => setLoading(false));
  }, [session]);

  async function submit() {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await createDeletionRequest(session.token, password);
      setDeletion(result.request);
      setPassword('');
      setNotice(result.message);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        void session.signOut();
        return;
      }
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Unable to submit your request.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Request account deletion
      </Text>
      <Text style={styles.body}>
        We review open loans, wallet balances, disputes, and records that must
        be retained by law. You can continue to sign in for repayments and
        support while your request is reviewed.
      </Text>
      {loading ? (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          Loading request status…
        </Text>
      ) : null}
      {deletion ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            Request{' '}
            {deletion.status === 'in_review' ? 'under review' : 'received'}
          </Text>
          <Text style={styles.body}>
            Estimated completion:{' '}
            {new Date(deletion.estimatedCompletionAt).toLocaleDateString()}
          </Text>
          <Text style={styles.caption}>
            Required financial and audit records may be retained for applicable
            legal purposes.
          </Text>
        </View>
      ) : null}
      {!loading && !deletion ? (
        <>
          <Text style={styles.label}>Confirm with your current password</Text>
          <TextInput
            accessibilityLabel="Current password"
            autoComplete="current-password"
            onChangeText={setPassword}
            placeholder="Current password"
            placeholderTextColor="#64748b"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />
          <Text style={styles.confirmation}>
            By continuing, you confirm that you want to request deletion of your
            account and personal data.
          </Text>
          <ActionButton
            busy={busy}
            destructive
            label="Request account deletion"
            onPress={() => void submit()}
          />
        </>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      ) : null}
      <Text style={styles.caption}>
        Deletion processing remains subject to open obligations and the approved
        data-retention schedule. Contact support if you need help.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          void Linking.openURL('mailto:wecare@me2ulend.online').catch(() =>
            setError(
              'Email could not be opened. Contact wecare@me2ulend.online from your mail app.',
            ),
          )
        }
        style={styles.supportLink}
      >
        <Text style={styles.supportText}>Contact Me2U support</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { color: '#334155', fontSize: 15, lineHeight: 23, marginBottom: 16 },
  caption: { color: '#475569', fontSize: 13, lineHeight: 19, marginTop: 18 },
  confirmation: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 16,
  },
  content: { flexGrow: 1, gap: 12, padding: 22, paddingBottom: 36 },
  error: { color: '#9f1239', fontSize: 14, lineHeight: 20 },
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
  label: { color: '#10231a', fontSize: 15, fontWeight: '700' },
  notice: { color: '#14532d', fontSize: 14, lineHeight: 21 },
  statusCard: { backgroundColor: '#dcfce7', borderRadius: 16, padding: 16 },
  statusTitle: {
    color: '#14532d',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: { color: '#10231a', fontSize: 26, fontWeight: '900', marginBottom: 4 },
  supportLink: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 48,
  },
  supportText: {
    color: '#087f46',
    fontSize: 16,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
