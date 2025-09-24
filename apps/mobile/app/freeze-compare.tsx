import React from 'react';
import { ScrollView, StyleSheet, View, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type FreezeFrame = Record<string, number | string>;

export default function FreezeCompareScreen() {
  const params = useLocalSearchParams<{ codes?: string }>();
  const list = (typeof params.codes === 'string' ? params.codes.split(',') : []).filter(Boolean);
  const codes = list.length > 0 ? list : [];

  const frames = React.useMemo(() => {
    const out: Record<string, FreezeFrame> = {};
    for (const c of codes) out[c] = simulateFreezeFrame(c);
    return out;
  }, [codes]);

  const allKeys = React.useMemo(() => {
    const s = new Set<string>();
    Object.values(frames).forEach((ff) => Object.keys(ff).forEach((k) => s.add(k)));
    return Array.from(s);
  }, [frames]);

  function exportCsv() {
    const header = ['Key', ...codes].join(',');
    const rows = allKeys.map((k) => [k, ...codes.map((c) => JSON.stringify(String(frames[c]?.[k] ?? '')))].join(','));
    const csv = `${header}\n${rows.join('\n')}\n`;
    const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Freeze Frame Compare</ThemedText>
      {codes.length === 0 ? (
        <ThemedText style={{ opacity: 0.7 }}>No codes provided.</ThemedText>
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={styles.headerRow}>
              <ThemedText style={[styles.cell, styles.keyCell]}></ThemedText>
              {codes.map((c) => (
                <ThemedText key={c} style={[styles.cell, styles.codeCell]}>{c}</ThemedText>
              ))}
            </View>
            {allKeys.map((k) => (
              <View key={k} style={styles.dataRow}>
                <ThemedText style={[styles.cell, styles.keyCell]}>{k}</ThemedText>
                {codes.map((c) => (
                  <ThemedText key={c} style={[styles.cell, styles.codeCell]}>{String(frames[c]?.[k] ?? '—')}</ThemedText>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {codes.length > 0 && (
        <Pressable onPress={exportCsv} style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.85 }]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Export CSV</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

function simulateFreezeFrame(code: string): FreezeFrame {
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
  container: { flex: 1, padding: 16, gap: 8 },
  header: { textAlign: 'center' },
  headerRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  dataRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  cell: { paddingVertical: 10, paddingHorizontal: 12, minWidth: 120 },
  keyCell: { fontWeight: '600' },
  codeCell: { textAlign: 'right' },
  exportBtn: { alignSelf: 'flex-start', backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
});

