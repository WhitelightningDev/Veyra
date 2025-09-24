import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type TempUnit = 'C' | 'F';
type SpeedUnit = 'kmh' | 'mph';
type PressureUnit = 'kPa' | 'psi';
type Preset = 'Basic' | 'Performance' | 'Diagnostics';
type ThemePref = 'system' | 'light' | 'dark';

type SettingsState = {
  units: { temp: TempUnit; speed: SpeedUnit; pressure: PressureUnit };
  polling: { rateHz: number; preset: Preset };
  connection: { autoReconnect: boolean; rememberLast: boolean };
  safety: { warnLowBatt: boolean; blockClearWhenRunning: boolean };
  theme: ThemePref;
  developer: { showRawElm: boolean };
};

const DEFAULTS: SettingsState = {
  units: { temp: 'C', speed: 'kmh', pressure: 'kPa' },
  polling: { rateHz: 2, preset: 'Basic' },
  connection: { autoReconnect: true, rememberLast: true },
  safety: { warnLowBatt: true, blockClearWhenRunning: true },
  theme: 'system',
  developer: { showRawElm: false },
};

export default function SettingsScreen() {
  const storage = useOptionalAsyncStorage();
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULTS);
  const [message, setMessage] = React.useState<string | null>(null);

  // Load persisted settings once
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!storage) return;
        const raw = await storage.getItem('settings');
        if (raw && mounted) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {}
    })();
    return () => { mounted = false; };
  }, [storage]);

  async function persist(next: SettingsState) {
    setSettings(next);
    try {
      if (storage) await storage.setItem('settings', JSON.stringify(next));
    } catch {}
  }

  function setUnit<K extends keyof SettingsState['units']>(key: K, val: SettingsState['units'][K]) {
    persist({ ...settings, units: { ...settings.units, [key]: val } });
  }
  function setPreset(p: Preset) {
    persist({ ...settings, polling: { ...settings.polling, preset: p } });
  }
  function incRate(delta: number) {
    const r = Math.max(1, Math.min(10, settings.polling.rateHz + delta));
    persist({ ...settings, polling: { ...settings.polling, rateHz: r } });
  }
  function setConn<K extends keyof SettingsState['connection']>(key: K, val: boolean) {
    persist({ ...settings, connection: { ...settings.connection, [key]: val } });
  }
  function setSafety<K extends keyof SettingsState['safety']>(key: K, val: boolean) {
    persist({ ...settings, safety: { ...settings.safety, [key]: val } });
  }
  function setTheme(t: ThemePref) {
    persist({ ...settings, theme: t });
    setMessage('Theme preference saved.');
  }
  function setDeveloper<K extends keyof SettingsState['developer']>(key: K, val: boolean) {
    persist({ ...settings, developer: { ...settings.developer, [key]: val } });
  }

  async function copyLastSessionLog() {
    const log = '[demo] last session log...';
    try {
      const Clipboard = require('expo-clipboard');
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(log);
        setMessage('Copied last session log');
        return;
      }
    } catch {}
    try {
      if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
        // @ts-ignore web clipboard
        await navigator.clipboard.writeText(log);
        setMessage('Copied last session log');
        return;
      }
    } catch {}
    setMessage(Platform.OS === 'web' ? 'Copy not permitted' : 'Copy not supported on this platform');
  }

  function resetDefaults() {
    persist(DEFAULTS);
    setMessage('Settings reset to defaults');
  }

  const { units, polling, connection, safety, theme, developer } = settings;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Settings</ThemedText>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section title="Units">
          <Row label="Temperature">
            <Segmented
              value={units.temp}
              options={[{ key: 'C', label: '°C' }, { key: 'F', label: '°F' }]}
              onChange={(v) => setUnit('temp', v as TempUnit)}
            />
          </Row>
          <Row label="Speed">
            <Segmented
              value={units.speed}
              options={[{ key: 'kmh', label: 'km/h' }, { key: 'mph', label: 'mph' }]}
              onChange={(v) => setUnit('speed', v as SpeedUnit)}
            />
          </Row>
          <Row label="Pressure">
            <Segmented
              value={units.pressure}
              options={[{ key: 'kPa', label: 'kPa' }, { key: 'psi', label: 'psi' }]}
              onChange={(v) => setUnit('pressure', v as PressureUnit)}
            />
          </Row>
        </Section>

        <Section title="Polling">
          <Row label={`Rate (${polling.rateHz} Hz)`}>
            <View style={styles.stepperRow}>
              <Pressable onPress={() => incRate(-1)} style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}><ThemedText>-</ThemedText></Pressable>
              <View style={styles.progressWrap}>
                <View style={[styles.progressBar, { width: `${(polling.rateHz - 1) / 9 * 100}%` }]} />
              </View>
              <Pressable onPress={() => incRate(+1)} style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}><ThemedText>+</ThemedText></Pressable>
            </View>
          </Row>
          <Row label="PID Preset">
            <Segmented
              value={polling.preset}
              options={[{ key: 'Basic', label: 'Basic' }, { key: 'Performance', label: 'Perf' }, { key: 'Diagnostics', label: 'Diag' }]}
              onChange={(v) => setPreset(v as Preset)}
            />
          </Row>
        </Section>

        <Section title="Connection">
          <ToggleRow label="Auto-reconnect" value={connection.autoReconnect} onChange={(v) => setConn('autoReconnect', v)} />
          <ToggleRow label="Remember last adapter" value={connection.rememberLast} onChange={(v) => setConn('rememberLast', v)} />
        </Section>

        <Section title="Safety">
          <ToggleRow label="Warn on low battery (< 11.8V)" value={safety.warnLowBatt} onChange={(v) => setSafety('warnLowBatt', v)} />
          <ToggleRow label="Block Clear Codes if engine running" value={safety.blockClearWhenRunning} onChange={(v) => setSafety('blockClearWhenRunning', v)} />
        </Section>

        <Section title="Theme">
          <Row label="Appearance">
            <Segmented
              value={theme}
              options={[{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]}
              onChange={(v) => setTheme(v as ThemePref)}
            />
          </Row>
        </Section>

        <Section title="Developer">
          <ToggleRow label="Show raw ELM log" value={developer.showRawElm} onChange={(v) => setDeveloper('showRawElm', v)} />
          <Row label="Copy last session log">
            <Pressable onPress={copyLastSessionLog} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="defaultSemiBold">Copy</ThemedText>
            </Pressable>
          </Row>
        </Section>

        <View style={{ height: 8 }} />
        <Pressable onPress={resetDefaults} style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Reset to defaults</ThemedText>
        </Pressable>

        {message && <ThemedText style={styles.message}>{message}</ThemedText>}
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.key}>{label}</ThemedText>
      <View style={styles.valRow}>{children}</View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.key}>{label}</ThemedText>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { key: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => (
        <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={({ pressed }) => [styles.segment, value === opt.key && styles.segmentActive, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold" style={[styles.segmentText, value === opt.key && styles.segmentTextActive]}>{opt.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function useOptionalAsyncStorage(): null | { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    if (AsyncStorage?.getItem && AsyncStorage?.setItem) return AsyncStorage;
    return null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { textAlign: 'center', marginBottom: 8 },
  section: { marginTop: 8 },
  sectionTitle: { marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  key: { },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segmented: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, overflow: 'hidden' },
  segment: { paddingVertical: 6, paddingHorizontal: 12 },
  segmentActive: { backgroundColor: '#00000010' },
  segmentText: { },
  segmentTextActive: { },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  progressWrap: { width: 120, height: 8, backgroundColor: '#00000010', borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.light.tint },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  resetBtn: { alignSelf: 'center', backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginTop: 8 },
  pressed: { opacity: 0.85 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 10 },
});

