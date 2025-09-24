import React from 'react';
import { Pressable, StyleSheet, View, ScrollView, Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type FreezeFrame = Record<string, number | string>;

export default function FreezeFrameScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === 'string' ? params.code : undefined;

  const [data, setData] = React.useState<FreezeFrame | null>(null);
  const [vin, setVin] = React.useState<string | null>(null);
  const [capturedAt, setCapturedAt] = React.useState<Date | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Simulate fetch; wire to real Mode 02/Freeze Frame later
    setMessage(null);
    setTimeout(() => {
      // If no code provided, simulate empty
      if (!code) {
        setData(null);
        setCapturedAt(null);
        return;
      }
      const ff = simulateFreezeFrame(code);
      setData(ff);
      setCapturedAt(new Date());
      // VIN unknown in demo
      setVin(null);
    }, 400);
  }, [code]);

  function openDataUrl(mime: string, content: string, filename: string) {
    const encoded = encodeURIComponent(content);
    const url = `data:${mime};charset=utf-8,${encoded}`;
    Linking.openURL(url).catch(() => setMessage('Unable to open exporter. Long-press to copy text.'));
  }

  function toJson(): string {
    return JSON.stringify({ code, vin, capturedAt: capturedAt?.toISOString(), data }, null, 2);
  }

  function toCsv(): string {
    if (!data) return '';
    const keys = Object.keys(data);
    const header = ['code', 'vin', 'capturedAt', ...keys].join(',');
    const vals = [
      JSON.stringify(code ?? ''),
      JSON.stringify(vin ?? ''),
      JSON.stringify(capturedAt?.toISOString() ?? ''),
      ...keys.map((k) => JSON.stringify(String(data[k] ?? ''))),
    ].join(',');
    return `${header}\n${vals}\n`;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Freeze Frame – {code ?? 'Current DTC'}</ThemedText>

      {data ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.metaRow}>
            <ThemedText>Captured: {capturedAt?.toLocaleString() ?? '—'}</ThemedText>
            <ThemedText>VIN: {vin ?? '—'}</ThemedText>
          </View>

          <View style={styles.table}>
            {Object.entries(data).map(([k, v]) => (
              <View key={k} style={styles.row}>
                <ThemedText type="defaultSemiBold" style={styles.key}>{k}</ThemedText>
                <ThemedText style={styles.val}>{String(v)}</ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => openDataUrl('application/json', toJson(), `freeze-${code ?? 'dtc'}.json`)}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Export JSON</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => openDataUrl('text/csv', toCsv(), `freeze-${code ?? 'dtc'}.csv`)}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <ThemedText type="defaultSemiBold">Export CSV</ThemedText>
            </Pressable>
          </View>

          {message && <ThemedText style={styles.message}>{message}</ThemedText>}
        </ScrollView>
      ) : (
        <ThemedText style={styles.empty}>No freeze frame data for current codes.</ThemedText>
      )}
    </ThemedView>
  );
}

function simulateFreezeFrame(code: string): FreezeFrame {
  // Provide typical fields; values are simulated
  const rpm = Math.round(800 + Math.random() * 2200);
  const speed = Math.round(Math.random() * 100);
  const coolant = +(70 + Math.random() * 30).toFixed(1);
  const iat = +(20 + Math.random() * 10).toFixed(1);
  const map = Math.round(25 + Math.random() * 60);
  const maf = +(2 + Math.random() * 10).toFixed(2);
  const load = +(20 + Math.random() * 50).toFixed(1);
  const fuel = 'Closed loop';
  const o2 = 'Ready';
  return {
    RPM: `${rpm} rpm`,
    Speed: `${speed} km/h`,
    Coolant: `${coolant} °C`,
    IAT: `${iat} °C`,
    MAP: `${map} kPa`,
    MAF: `${maf} g/s`,
    Load: `${load} %`,
    'Fuel status': fuel,
    'O2 status': o2,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { textAlign: 'center', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  table: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#0002' },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  key: { width: '45%' },
  val: { flex: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: { backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  pressed: { opacity: 0.8 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 20 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
});

