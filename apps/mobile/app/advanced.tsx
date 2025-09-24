import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type DidItem = { id: string; label: string; value: string };
type EcuResult = { address: string; name: string; dids: DidItem[] };

export default function AdvancedScanScreen() {
  const [enabled, setEnabled] = React.useState(false);
  const [probing, setProbing] = React.useState(false);
  const [results, setResults] = React.useState<EcuResult[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);

  async function probe() {
    if (!enabled) return;
    setProbing(true);
    setMessage(null);
    setResults([]);
    // Simulate a UDS probe; wire to transport later (read-only DIDs only)
    const data = await simulateProbe();
    setResults(data);
    setProbing(false);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Advanced Scan (Beta)</ThemedText>

      <View style={styles.rowBetween}>
        <ThemedText type="defaultSemiBold">Enable Advanced Scan (UDS)</ThemedText>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
      <ThemedText style={styles.note}>Read-only probing of safe data. No resets/actuation will be performed.</ThemedText>

      <Pressable
        onPress={probe}
        disabled={!enabled || probing}
        style={({ pressed }) => [
          styles.primary,
          (!enabled || probing) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>
          {probing ? 'Probing…' : 'Probe ECUs'}
        </ThemedText>
      </Pressable>

      {probing && (
        <View style={styles.centerRow}>
          <ActivityIndicator />
          <ThemedText style={{ marginLeft: 8 }}>Scanning…</ThemedText>
        </View>
      )}

      {results.length === 0 && !probing && (
        <ThemedText style={styles.empty}>No results yet. Enable and tap Probe ECUs.</ThemedText>
      )}

      <FlatList
        data={results}
        keyExtractor={(e) => e.address}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => <EcuCard ecu={item} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />

      {message && <ThemedText style={styles.message}>{message}</ThemedText>}
    </ThemedView>
  );
}

function EcuCard({ ecu }: { ecu: EcuResult }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <ThemedText type="defaultSemiBold">{ecu.name}</ThemedText>
        <ThemedText style={styles.dim}>{ecu.address}</ThemedText>
      </View>
      <View style={styles.table}>
        {ecu.dids.map((d) => (
          <View key={d.id} style={styles.tableRow}>
            <ThemedText style={styles.key}>{d.label}</ThemedText>
            <ThemedText style={styles.val}>{d.value}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

async function simulateProbe(): Promise<EcuResult[]> {
  // delay
  await new Promise((r) => setTimeout(r, 700));
  // Fake addresses and safe DIDs (read-only examples)
  return [
    {
      address: '7E0',
      name: 'Engine',
      dids: [
        { id: 'NOX_TEMP', label: 'NOx sensor temp', value: `${(250 + Math.random() * 80).toFixed(0)} °C` },
        { id: 'DPF_SOOT', label: 'DPF soot', value: `${(15 + Math.random() * 20).toFixed(1)} %` },
        { id: 'EGT', label: 'Exhaust gas temp', value: `${(350 + Math.random() * 200).toFixed(0)} °C` },
      ],
    },
    {
      address: '7E1',
      name: 'TCM',
      dids: [
        { id: 'ATF_TEMP', label: 'ATF temperature', value: `${(60 + Math.random() * 40).toFixed(1)} °C` },
        { id: 'GEAR', label: 'Current gear', value: `${Math.floor(Math.random() * 7)}` },
      ],
    },
    {
      address: '7E2',
      name: 'ABS/ESP',
      dids: [
        { id: 'WHEEL_SPEED', label: 'Avg wheel speed', value: `${(30 + Math.random() * 20).toFixed(0)} km/h` },
        { id: 'ABS_STATUS', label: 'ABS status', value: 'Ready' },
      ],
    },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  header: { textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primary: { backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignSelf: 'flex-start' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 12 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#00000022', marginVertical: 4 },
  card: { paddingVertical: 8 },
  table: { marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#0002' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  key: { width: '52%', opacity: 0.8 },
  val: { flex: 1, textAlign: 'right' },
  dim: { opacity: 0.6 },
  note: { opacity: 0.7, marginTop: 4 },
});
