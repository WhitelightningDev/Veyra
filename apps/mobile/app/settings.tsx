import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useSettings, DEFAULT_SETTINGS, type SettingsState, type TempUnit, type SpeedUnit, type PressureUnit, type Preset, type ThemePref } from '@/providers/settings';
import { useUI } from '@/providers/ui';

export default function SettingsScreen() {
  const { settings, save } = useSettings();
  const ui = useUI();
  const [draft, setDraft] = React.useState<SettingsState>(settings);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => { setDraft(settings); }, [settings]);

  function setUnit<K extends keyof SettingsState['units']>(key: K, val: SettingsState['units'][K]) {
    setDraft({ ...draft, units: { ...draft.units, [key]: val } });
  }
  function setPreset(p: Preset) {
    setDraft({ ...draft, polling: { ...draft.polling, preset: p } });
  }
  function incRate(delta: number) {
    const r = Math.max(1, Math.min(10, draft.polling.rateHz + delta));
    setDraft({ ...draft, polling: { ...draft.polling, rateHz: r } });
  }
  function setConn<K extends keyof SettingsState['connection']>(key: K, val: boolean) {
    setDraft({ ...draft, connection: { ...draft.connection, [key]: val } });
  }
  function setSafety<K extends keyof SettingsState['safety']>(key: K, val: boolean) {
    setDraft({ ...draft, safety: { ...draft.safety, [key]: val } });
  }
  function setTheme(t: ThemePref) {
    setDraft({ ...draft, theme: t });
  }
  function setDeveloper<K extends keyof SettingsState['developer']>(key: K, val: boolean) {
    setDraft({ ...draft, developer: { ...draft.developer, [key]: val } });
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
    setDraft(DEFAULT_SETTINGS);
    setMessage('Draft reset to defaults');
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  async function handleSave() {
    await save(draft);
    ui.showToast('Settings saved');
    setMessage('Settings applied');
  }

  const { units, polling, connection, safety, theme, developer } = draft;

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

        <Section title="Dashboard">
          <Row label="Theme">
            <Segmented
              value={draft.dashboard?.theme ?? 'default'}
              options={[{ key: 'default', label: 'Default' }, { key: 'performance', label: 'Performance' }, { key: 'eco', label: 'Eco' }]}
              onChange={(v) => setDraft({ ...draft, dashboard: { ...(draft.dashboard ?? DEFAULT_SETTINGS.dashboard!), theme: v as any, showSparklines: draft.dashboard?.showSparklines ?? true, cards: draft.dashboard?.cards ?? DEFAULT_SETTINGS.dashboard!.cards } })}
            />
          </Row>
          <ToggleRow label="Show sparklines" value={draft.dashboard?.showSparklines ?? true} onChange={(val) => setDraft({ ...draft, dashboard: { ...(draft.dashboard ?? DEFAULT_SETTINGS.dashboard!), showSparklines: val, theme: draft.dashboard?.theme ?? 'default', cards: draft.dashboard?.cards ?? DEFAULT_SETTINGS.dashboard!.cards } })} />
          <ThemedText style={{ marginTop: 8, marginBottom: 4 }}>Visible gauges</ThemedText>
          <View style={{ gap: 6 }}>
            {(['rpm','speed','coolant','map','iat','maf','battery','boost'] as const).map((k) => (
              <ToggleRow
                key={k}
                label={k.toUpperCase()}
                value={(draft.dashboard?.cards as any)?.[k] ?? (DEFAULT_SETTINGS.dashboard!.cards as any)[k]}
                onChange={(val) => setDraft({ ...draft, dashboard: { ...(draft.dashboard ?? DEFAULT_SETTINGS.dashboard!), theme: draft.dashboard?.theme ?? 'default', showSparklines: draft.dashboard?.showSparklines ?? true, cards: { ...(draft.dashboard?.cards ?? DEFAULT_SETTINGS.dashboard!.cards), [k]: val } } })}
              />
            ))}
          </View>
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
            <Pressable accessibilityRole="button" accessibilityLabel="Copy last session log" onPress={copyLastSessionLog} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="defaultSemiBold">Copy</ThemedText>
            </Pressable>
          </Row>
        </Section>

        <Section title="Accessibility">
          <ToggleRow label="Large font" value={draft.accessibility?.largeFont ?? false} onChange={(v) => setDraft({ ...draft, accessibility: { ...(draft.accessibility ?? {}), largeFont: v, announceDtcVoice: draft.accessibility?.announceDtcVoice ?? false } })} />
          <ToggleRow label="Announce DTC by voice" value={draft.accessibility?.announceDtcVoice ?? false} onChange={(v) => setDraft({ ...draft, accessibility: { ...(draft.accessibility ?? {}), announceDtcVoice: v, largeFont: draft.accessibility?.largeFont ?? false } })} />
        </Section>

        <View style={{ height: 8 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Save settings" onPress={handleSave} disabled={!dirty} style={({ pressed }) => [styles.saveBtn, (!dirty) && styles.disabled, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Save</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Reset to defaults" onPress={resetDefaults} style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}>
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
  saveBtn: { alignSelf: 'center', backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginTop: 8 },
  resetBtn: { alignSelf: 'center', backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginTop: 8 },
  pressed: { opacity: 0.85 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 10 },
  disabled: { opacity: 0.6 },
});
