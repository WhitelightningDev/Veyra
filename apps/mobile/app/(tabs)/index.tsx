import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type Preset = 'Basic' | 'Performance' | 'Diagnostics';

export default function DashboardScreen() {
  const [polling, setPolling] = React.useState(false);
  const [preset, setPreset] = React.useState<Preset>('Basic');
  const [rpm, setRpm] = React.useState<number | null>(null);
  const [speed, setSpeed] = React.useState<number | null>(null);
  const [coolant, setCoolant] = React.useState<number | null>(null);
  const [map, setMap] = React.useState<number | null>(null);
  const [iat, setIat] = React.useState<number | null>(null);
  const [maf, setMaf] = React.useState<number | null>(null);
  const [showPresets, setShowPresets] = React.useState(false);
  const [tickTimes, setTickTimes] = React.useState<number[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);

  const cfg = React.useMemo(() => {
    switch (preset) {
      case 'Performance':
        return { hz: 5, pids: { rpm: true, speed: true, coolant: true, map: true, iat: true, maf: true } };
      case 'Diagnostics':
        return { hz: 1, pids: { rpm: true, speed: false, coolant: true, map: true, iat: true, maf: true } };
      default:
        return { hz: 2, pids: { rpm: true, speed: true, coolant: true, map: false, iat: false, maf: false } };
    }
  }, [preset]);

  React.useEffect(() => {
    if (!polling) return;
    let mounted = true;
    const interval = Math.max(50, Math.round(1000 / cfg.hz));
    const id = setInterval(() => {
      if (!mounted) return;
      const now = Date.now();
      setTickTimes((prev) => {
        const next = [...prev, now].slice(-20);
        return next;
      });
      // Simulate values; later wire to core-obd read loop
      if (cfg.pids.rpm) setRpm((v) => clamp((v ?? 750) + randDelta(-150, 200), 650, 6500));
      if (cfg.pids.speed) setSpeed((v) => clamp((v ?? 0) + randDelta(-3, 5), 0, 200));
      if (cfg.pids.coolant) setCoolant((v) => clamp((v ?? 70) + randDelta(-1, 1), -40, 120));
      if (cfg.pids.map) setMap((v) => clamp((v ?? 30) + randDelta(-2, 2), 15, 250));
      if (cfg.pids.iat) setIat((v) => clamp((v ?? 22) + randDelta(-1, 1), -40, 80));
      if (cfg.pids.maf) setMaf((v) => clamp((v ?? 2.5) + randDelta(-0.3, 0.5), 0, 300));
    }, interval);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [polling, cfg]);

  const approxHz = React.useMemo(() => {
    if (tickTimes.length < 2) return 0;
    const ms = tickTimes[tickTimes.length - 1] - tickTimes[0];
    const ticks = tickTimes.length - 1;
    return ms > 0 ? +(ticks / (ms / 1000)).toFixed(1) : 0;
  }, [tickTimes]);

  function startStop() {
    setPolling((p) => !p);
    if (!polling) {
      setMessage(null);
    }
  }

  function choosePreset(p: Preset) {
    setPreset(p);
    setShowPresets(false);
  }

  function readDtc() {
    // Navigate to the DTCs page
    try {
      const { router } = require('expo-router');
      router.push('/dtcs');
    } catch {
      setMessage('Open DTCs page from menu.');
    }
  }
  function readFreeze() {
    setMessage('Reading Freeze Frame… (stub)');
  }
  function saveSnapshot() {
    setMessage('Snapshot saved. (stub)');
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="title">Dashboard</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setShowPresets((s) => !s)} style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}>
            <ThemedText type="defaultSemiBold">{preset}</ThemedText>
          </Pressable>
          <Pressable onPress={startStop} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>
              {polling ? 'Stop' : 'Start'} Live Data
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {showPresets && (
        <View style={styles.dropdownMenu}>
          {(['Basic', 'Performance', 'Diagnostics'] as Preset[]).map((p) => (
            <Pressable key={p} onPress={() => choosePreset(p)} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <ThemedText>{p}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <MiniStatus approxHz={approxHz} />

      {!polling && (
        <ThemedText style={styles.empty}>Not polling yet. Tap Start.</ThemedText>
      )}

      <View style={styles.grid}>
        <Tile label="RPM" value={rpm} unit="rpm" large />
        <Tile label="Speed" value={speed} unit="km/h" large />
        <Tile label="Coolant" value={coolant} unit="°C" />
        {cfg.pids.map && <Tile label="MAP" value={map} unit="kPa" />}
        {cfg.pids.iat && <Tile label="IAT" value={iat} unit="°C" />}
        {cfg.pids.maf && <Tile label="MAF" value={maf} unit="g/s" />}
      </View>

      <View style={styles.quickRow}>
        <Pressable onPress={readDtc} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Read DTCs</ThemedText>
        </Pressable>
        <Pressable onPress={readFreeze} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Freeze Frame</ThemedText>
        </Pressable>
        <Pressable onPress={saveSnapshot} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Save Snapshot</ThemedText>
        </Pressable>
      </View>

      {message && <ThemedText style={styles.message}>{message}</ThemedText>}
    </ThemedView>
  );
}

function Tile({ label, value, unit, large }: { label: string; value: number | null; unit: string; large?: boolean }) {
  return (
    <View style={[styles.tile, large && styles.tileLarge]}>
      <ThemedText style={styles.tileLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={[styles.tileValue, large && styles.tileValueLarge]}>
        {value === null ? '--' : value.toFixed(label === 'RPM' ? 0 : 1)}
      </ThemedText>
      <ThemedText style={styles.tileUnit}>{unit}</ThemedText>
    </View>
  );
}

function MiniStatus({ approxHz }: { approxHz: number }) {
  return (
    <View style={styles.statusBar}>
      <ThemedText style={styles.statusItem}>Protocol: ISO 15765-4</ThemedText>
      <ThemedText style={styles.statusItem}>Adapter: ELM327 v1.5</ThemedText>
      <ThemedText style={styles.statusItem}>RSSI: ~ -60 dBm</ThemedText>
      <ThemedText style={styles.statusItem}>Rate: {approxHz.toFixed(1)} Hz</ThemedText>
    </View>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function randDelta(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primary: { backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  pressed: { opacity: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '48%', backgroundColor: '#00000010', borderRadius: 12, padding: 12 },
  tileLarge: { flexBasis: '48%' },
  tileLabel: { opacity: 0.7, marginBottom: 6 },
  tileValue: { fontSize: 28 },
  tileValueLarge: { fontSize: 34 },
  tileUnit: { opacity: 0.6 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  statusBar: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  statusItem: { opacity: 0.7 },
  dropdown: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  dropdownMenu: { backgroundColor: '#00000010', borderRadius: 8, paddingVertical: 6, marginTop: 6, width: 200 },
  menuItem: { paddingVertical: 8, paddingHorizontal: 10 },
  empty: { textAlign: 'center', opacity: 0.6, marginVertical: 12 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
});
