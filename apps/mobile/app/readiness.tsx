import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUI } from '@/providers/ui';

type Monitor = { key: string; label: string; ready: boolean };

export default function ReadinessScreen() {
  const ui = useUI();
  const [monitors, setMonitors] = React.useState<Monitor[]>(() => demoMonitors());
  const milOn = false;
  const dtcCount = 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Emissions Readiness</ThemedText>
      <View style={styles.row}><ThemedText type="defaultSemiBold">MIL</ThemedText><ThemedText>{milOn ? 'ON' : 'OFF'}</ThemedText></View>
      <View style={styles.row}><ThemedText type="defaultSemiBold">Stored DTCs</ThemedText><ThemedText>{dtcCount}</ThemedText></View>
      <View style={styles.table}>
        {monitors.map((m) => (
          <View key={m.key} style={styles.row}>
            <ThemedText>{m.label}</ThemedText>
            <ThemedText style={{ color: m.ready ? '#16a34a' : '#dc2626' }}>{m.ready ? 'Ready' : 'Not Ready'}</ThemedText>
          </View>
        ))}
      </View>
      <ThemedText style={{ opacity: 0.7, marginTop: 8 }}>Tip: Readiness improves after completing a drive cycle.</ThemedText>
    </ThemedView>
  );
}

function demoMonitors(): Monitor[] {
  return [
    { key: 'misfire', label: 'Misfire', ready: true },
    { key: 'fuel', label: 'Fuel System', ready: true },
    { key: 'comp', label: 'Comprehensive Components', ready: true },
    { key: 'catalyst', label: 'Catalyst', ready: false },
    { key: 'o2', label: 'O2 Sensor', ready: true },
    { key: 'o2h', label: 'O2 Heater', ready: true },
    { key: 'evap', label: 'Evaporative System', ready: false },
    { key: 'egr', label: 'EGR/VVT System', ready: true },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  header: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  table: { marginTop: 6 },
});

