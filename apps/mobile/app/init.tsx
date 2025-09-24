import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useUI } from '@/providers/ui';
import { getTransport } from '@/services/obd-transport';
import { parseElmLines } from 'core-obd';

type StepStatus = 'pending' | 'running' | 'success' | 'error';
type Step = {
  id: string;
  label: string;
  status: StepStatus;
};

export default function InitializingAdapter() {
  const ui = useUI();
  const [steps, setSteps] = React.useState<Step[]>([
    { id: 'atz', label: 'Reset (ATZ)', status: 'pending' },
    { id: 'ate0', label: 'Echo off (ATE0)', status: 'pending' },
    { id: 'atl0', label: 'Linefeeds off (ATL0)', status: 'pending' },
    { id: 'ats0', label: 'Spaces off (ATS0)', status: 'pending' },
    { id: 'atsp6', label: 'Set protocol (ATSP6)', status: 'pending' },
    { id: 'pid0100', label: 'Test PID (0100)', status: 'pending' },
  ]);
  const [battery, setBattery] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const allDone = steps.every((s) => s.status === 'success');
  const anyError = steps.some((s) => s.status === 'error');
  const lowVoltage = battery !== null && battery < 11.8;

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      ui.setBusy(true);
      setError(null);
      const tr = getTransport();
      if (!tr) throw new Error('No transport. Please reconnect.');
      const cmds = ['ATZ','ATE0','ATL0','ATS0','ATSP6'];
      for (let i = 0; i < cmds.length; i++) {
        if (cancelled) return;
        setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: 'running' } : s)));
        const lines = await tr.send(cmds[i]!);
        const ok = lines.join(' ').toUpperCase().includes('OK') || cmds[i] === 'ATZ';
        if (!ok) throw new Error(`Step failed: ${cmds[i]}`);
        setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: 'success' } : s)));
      }
      // Test PID
      setSteps((prev) => prev.map((s) => (s.id === 'pid0100' ? { ...s, status: 'running' } : s)));
      const pidLines = await tr.send('0100');
      const pidResps = parseElmLines(pidLines);
      if (!pidResps.find((r) => r.service === '01' && r.pid === '00')) throw new Error('0100 failed');
      setSteps((prev) => prev.map((s) => (s.id === 'pid0100' ? { ...s, status: 'success' } : s)));
      // Battery voltage via ATRV
      const rv = await tr.send('ATRV');
      const match = rv.join(' ').match(/([0-9]+\.[0-9])\s*V/i);
      if (match) setBattery(parseFloat(match[1]!));
      ui.setBleStatus('connected');
      ui.showToast('Adapter initialized');
      // Navigate to Dashboard after a short delay
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 400);
    }
    run().catch((e: any) => {
      setError(String(e?.message ?? e ?? 'Initialization failed'));
    }).finally(() => ui.setBusy(false));
    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retry() {
    setSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
    setBattery(null);
    setError(null);
    // re-run by replacing key via state or navigating to same route
    router.replace('/init');
  }

  function backToScan() {
    router.replace('/(tabs)/connect');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>
        Initializing Adapter…
      </ThemedText>

      <View style={styles.steps}>
        {steps.map((s) => (
          <View key={s.id} style={styles.stepRow}>
            <StatusDot status={s.status} />
            <ThemedText style={styles.stepLabel}>{s.label}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.battRow}>
        <ThemedText type="defaultSemiBold">Battery voltage</ThemedText>
        {battery === null ? (
          <ActivityIndicator />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: lowVoltage ? '#dc2626' : undefined }}>
            {battery.toFixed(1)}V{lowVoltage ? '  (Low)' : ''}
          </ThemedText>
        )}
      </View>

      {error && (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      )}

      <View style={styles.actions}>
        {anyError ? (
          <>
            <Pressable onPress={retry} style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
              <ThemedText type="defaultSemiBold" style={styles.primaryBtnText}>Retry</ThemedText>
            </Pressable>
            <Pressable onPress={backToScan} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
              <ThemedText type="defaultSemiBold" style={styles.secondaryBtnText}>Back to Scan</ThemedText>
            </Pressable>
          </>
        ) : allDone ? (
          <Pressable onPress={backToScan} style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
            <ThemedText type="defaultSemiBold" style={styles.primaryBtnText}>Done</ThemedText>
          </Pressable>
        ) : (
          <View style={{ height: 44 }} />
        )}
      </View>
    </ThemedView>
  );
}

function StatusDot({ status }: { status: StepStatus }) {
  if (status === 'running') {
    return <ActivityIndicator size="small" />;
  }
  const bg = status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : '#9CA3AF';
  return <View style={[styles.dot, { backgroundColor: bg }]} />;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function simulateBatteryVoltage(): number {
  // 11.4–12.8V typical range when car off; simulate a stable value
  const min = 11.4;
  const max = 12.8;
  return Math.random() * (max - min) + min;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  header: { textAlign: 'center' },
  steps: { gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { fontSize: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  battRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { marginTop: 'auto', gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.tint,
    gap: 10,
  },
  primaryBtnText: { color: '#fff' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.light.text },
  btnPressed: { opacity: 0.8 },
  errorText: { color: '#dc2626', textAlign: 'center' },
});
