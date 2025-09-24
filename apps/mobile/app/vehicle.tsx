import React from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type VehicleInfo = {
  vin: string | null;
  calibrations: string[]; // simplified CALIDs or ECU labels
  protocol: string;
  ecus: string[]; // e.g., ["Engine (7E0)", "TCM (7E1)"]
  adapter: { name?: string; id?: string; firmware?: string };
};

export default function VehicleInfoScreen() {
  const [info, setInfo] = React.useState<VehicleInfo>(() => simulateVehicleInfo());
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function copyVin() {
    const vin = info.vin ?? '';
    if (!vin) {
      setMessage('No VIN to copy.');
      return;
    }
    try {
      // Try expo-clipboard if available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('expo-clipboard');
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(vin);
        setMessage('VIN copied');
        return;
      }
    } catch {}
    try {
      if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
        // @ts-ignore web clipboard
        await navigator.clipboard.writeText(vin);
        setMessage('VIN copied');
        return;
      }
    } catch {}
    setMessage(Platform.OS === 'web' ? 'Copy not permitted' : 'Copy not supported on this platform');
  }

  async function runQuickTest() {
    setLoading(true);
    setMessage(null);
    // Simulate: re-read VIN and a simple PID (010C RPM)
    setTimeout(() => {
      setInfo((prev) => ({ ...prev, vin: prev.vin ?? 'WVWZZZ1JZXW000001' }));
      setLoading(false);
      setMessage('Quick Test OK');
    }, 600);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Vehicle Info</ThemedText>

      <KV label="VIN" value={info.vin ?? '—'}>
        <Pressable accessibilityRole="button" accessibilityLabel="Copy VIN" onPress={copyVin} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Copy</ThemedText>
        </Pressable>
      </KV>

      <KV label="Protocol" value={info.protocol} />
      <KV label="ECUs" value={info.ecus.join(', ') || '—'} />

      <KV label="Adapter name" value={info.adapter.name ?? '—'} />
      <KV label="Adapter id" value={info.adapter.id ?? '—'} />
      <KV label="Firmware" value={info.adapter.firmware ?? '—'} />

      <View style={styles.block}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>Calibration IDs / ECU</ThemedText>
        {info.calibrations.length === 0 ? (
          <ThemedText style={styles.dim}>None</ThemedText>
        ) : (
          <View style={styles.chips}>
            {info.calibrations.map((c) => (
              <View key={c} style={styles.chip}><ThemedText style={styles.chipText}>{c}</ThemedText></View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Run Quick Test" onPress={runQuickTest} disabled={loading} style={({ pressed }) => [styles.primary, pressed && styles.pressed, loading && styles.disabled]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>{loading ? 'Testing…' : 'Run Quick Test'}</ThemedText>
        </Pressable>
      </View>

      {message && <ThemedText style={styles.message}>{message}</ThemedText>}
    </ThemedView>
  );
}

function KV({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText type="defaultSemiBold" style={styles.key}>{label}</ThemedText>
      <View style={styles.valRow}>
        <ThemedText style={styles.val} selectable>{value}</ThemedText>
        {children}
      </View>
    </View>
  );
}

function simulateVehicleInfo(): VehicleInfo {
  return {
    vin: 'WVWZZZ1JZXW000001',
    calibrations: ['7E0 CALID ABC12345', '7E1 CALID XYZ67890'],
    protocol: 'ISO 15765-4 (CAN 11/500)',
    ecus: ['Engine (7E0)', 'TCM (7E1)'],
    adapter: { name: 'ELM327 v1.5', id: 'AA:BB:CC:DD:EE:01', firmware: '1.5' },
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  header: { textAlign: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  key: { width: '40%' },
  valRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  val: { },
  block: { marginTop: 10 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#aaa', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12 },
  actions: { marginTop: 12 },
  primary: { backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignSelf: 'flex-start' },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.7 },
  dim: { opacity: 0.6 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
});
