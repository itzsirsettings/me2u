import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ApiError,
  createRegistrationTransfer,
  getLoans,
  repayLoan,
  type LoanSummary,
  type TransferDetails,
} from '../api';
import { ActionButton } from '../components/ActionButton';
import { RootStackParamList } from '../navigation';
import { SessionContext } from '../session-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
const naira = (value: number | string) =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`;

export function HomeScreen({ navigation }: Props) {
  const session = useContext(SessionContext);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const [uncertainRepayments, setUncertainRepayments] = useState<Set<string>>(
    new Set(),
  );

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const [, loanResult] = await Promise.all([
        session.refreshProfile(),
        getLoans(session.token),
      ]);
      setLoans(loanResult.loans);
      setUncertainRepayments(new Set());
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Account details could not be refreshed.',
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function getTransferDetails() {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await createRegistrationTransfer(session.token);
      setTransfer(result.payment);
      await session.refreshProfile();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await session.signOut();
        return;
      }
      setError(
        cause instanceof ApiError
          ? `${cause.message}${cause.reference ? ` Reference: ${cause.reference}.` : ''}`
          : 'Paystack transfer details are unavailable. Check your account status before trying again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmRepayment(loan: LoanSummary) {
    if (!session || repayingId || uncertainRepayments.has(loan.id)) return;
    const amount =
      Number(loan.amount) +
      (Number(loan.amount) * Number(loan.rate || 0)) / 100;
    Alert.alert(
      'Confirm loan repayment',
      `Repay ${naira(amount)} from your available wallet balance? This action cannot be automatically retried if the connection is interrupted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Repay loan', onPress: () => void submitRepayment(loan.id) },
      ],
    );
  }

  async function submitRepayment(loanId: string) {
    if (!session || repayingId) return;
    setRepayingId(loanId);
    setError('');
    try {
      const result = await repayLoan(session.token, loanId);
      setError(`Repayment of ${naira(result.repayment_amount)} completed.`);
      await refresh();
    } catch (cause) {
      setUncertainRepayments(current => new Set(current).add(loanId));
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Repayment status is being checked. Do not submit it again until your loan status refreshes.',
      );
      // Resolve a timed-out response from authoritative loan status before
      // allowing another attempt. The POST itself is never automatically retried.
      await refresh();
    } finally {
      setRepayingId(null);
    }
  }

  if (!session) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.greeting}>
        Hello, {session.user.name || 'there'}
      </Text>
      <Text style={styles.subtitle}>Your Me2U account overview</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.cardLabel}>Available wallet balance</Text>
        <Text
          accessibilityLabel={`Available wallet balance ${naira(session.user.balance)}`}
          style={styles.balance}
        >
          {naira(session.user.balance)}
        </Text>
        <Text style={styles.locked}>Locked: {naira(session.user.locked)}</Text>
      </View>

      {!session.user.registrationDepositPaid ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registration deposit</Text>
          <Text style={styles.body}>
            Create a secure, one-time ₦2,000 transfer account. The server
            confirms the payment before updating your account.
          </Text>
          {transfer ? (
            <View style={styles.transfer}>
              <Text style={styles.transferHeading}>Transfer details</Text>
              <Text style={styles.body}>Bank: {transfer.bankName}</Text>
              <Text style={styles.body}>
                Account name: {transfer.accountName}
              </Text>
              <Text selectable style={styles.accountNumber}>
                Account number: {transfer.accountNumber}
              </Text>
              <Text selectable style={styles.body}>
                Reference: {transfer.transactionReference}
              </Text>
              <Text style={styles.caption}>
                Expires {new Date(transfer.expiresAt).toLocaleString()}
              </Text>
              <Text style={styles.caption}>
                Return to Me2U after transferring. Do not submit a second
                transfer if the payment status is unclear.
              </Text>
            </View>
          ) : (
            <ActionButton
              busy={busy}
              label="Get Paystack transfer details"
              onPress={() => void getTransferDetails()}
            />
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>KYC status</Text>
        <Text style={styles.body}>
          {session.user.kycVerified
            ? 'Identity verification complete.'
            : 'Complete identity verification to unlock eligible account features.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Loans</Text>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading loans"
            color="#087f46"
          />
        ) : null}
        {!loading && loans.length === 0 ? (
          <Text style={styles.body}>No loan activity to show.</Text>
        ) : null}
        {loans.map(loan => (
          <View key={loan.id} style={styles.loanRow}>
            <Text style={styles.loanAmount}>{naira(loan.amount)}</Text>
            <Text style={styles.caption}>
              {loan.status}
              {loan.due_date
                ? ` · Due ${new Date(loan.due_date).toLocaleDateString()}`
                : ''}
            </Text>
            {loan.borrower_id === session.user.id &&
            loan.status !== 'completed' ? (
              <View style={styles.repayAction}>
                {uncertainRepayments.has(loan.id) ? (
                  <Text accessibilityLiveRegion="polite" style={styles.caption}>
                    Refresh account status before retrying repayment.
                  </Text>
                ) : (
                  <ActionButton
                    busy={repayingId === loan.id}
                    label="Repay loan"
                    onPress={() => confirmRepayment(loan)}
                  />
                )}
              </View>
            ) : null}
          </View>
        ))}
        <ActionButton label="Refresh account" onPress={() => void refresh()} />
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <ActionButton
        label="Account deletion"
        onPress={() => navigation.navigate('AccountDeletion')}
      />
      <Text
        accessibilityRole="button"
        onPress={() => void session.signOut()}
        style={styles.signOut}
      >
        Sign out
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accountNumber: {
    color: '#10231a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  balance: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginTop: 8 },
  balanceCard: {
    backgroundColor: '#087f46',
    borderRadius: 20,
    marginBottom: 16,
    padding: 20,
  },
  body: { color: '#334155', fontSize: 15, lineHeight: 22, marginBottom: 14 },
  caption: { color: '#475569', fontSize: 13, lineHeight: 19, marginTop: 6 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  cardLabel: { color: '#dcfce7', fontSize: 14, fontWeight: '600' },
  cardTitle: {
    color: '#10231a',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  content: { gap: 8, padding: 20, paddingBottom: 36 },
  error: { color: '#9f1239', fontSize: 14, lineHeight: 20 },
  greeting: { color: '#10231a', fontSize: 28, fontWeight: '900', marginTop: 8 },
  locked: { color: '#dcfce7', fontSize: 14, marginTop: 6 },
  loanAmount: { color: '#10231a', fontSize: 16, fontWeight: '700' },
  loanRow: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    marginBottom: 12,
    paddingTop: 12,
  },
  repayAction: { marginTop: 10 },
  signOut: {
    alignSelf: 'center',
    color: '#087f46',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    minHeight: 48,
    padding: 12,
  },
  subtitle: { color: '#475569', fontSize: 15, marginBottom: 8 },
  transfer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    marginTop: 12,
    padding: 14,
  },
  transferHeading: {
    color: '#14532d',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
});
