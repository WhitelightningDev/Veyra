import React from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { EmptyState } from '@/components/empty-state';
import { router } from 'expo-router';
import { useUI } from '@/providers/ui';
import { useTrip } from '@/providers/trip';
import { useHistory } from '@/providers/history';

type LiveSample = { t: number; rpm?: number; speed?: number; coolant?: number };
type LiveSession = {
  id: string;
  startedAt: Date;
  durationSec: number;
  avgHz: number;
  samples: LiveSample[];
};

type Snapshot = {
  id: string;
  createdAt: Date;
  codes: string[];
  freeze?: Record<string, string | number>;
};

type TabKey = 'logs' | 'snapshots';

export default function LogsExportsScreen() {
  const [tab, setTab] = React.useState<TabKey>('logs');
  const trips = useTrip();
  const history = useHistory();
  const [sessions, setSessions] = React.useState<LiveSession[]>(() => demoSessions());
  const [shots, setShots] = React.useState<Snapshot[]>(() => demoSnapshots());
  const [selectedSession, setSelectedSession] = React.useState<LiveSession | null>(null);
  const [selectedShot, setSelectedShot] = React.useState<Snapshot | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const ui = useUI();

  function openDataUrl(mime: string, content: string) {
    const encoded = encodeURIComponent(content);
    const url = `data:${mime};charset=utf-8,${encoded}`;
    Linking.openURL(url).catch(() => {
      setMessage('Unable to open exporter. Long-press to copy text.');
      ui.setError('Export failed');
    });
  }

  function exportSessionJSON(s: LiveSession) {
    const json = JSON.stringify(
      {
        id: s.id,
        startedAt: s.startedAt.toISOString(),
        durationSec: s.durationSec,
        avgHz: s.avgHz,
        samples: s.samples,
      },
      null,
      2,
    );
    openDataUrl('application/json', json);
  }
  function exportSessionCSV(s: LiveSession) {
    const cols = ['t', 'rpm', 'speed', 'coolant'];
    const header = cols.join(',');
    const rows = s.samples.map((r) => cols.map((c) => JSON.stringify((r as any)[c] ?? '')).join(',')).join('\n');
    openDataUrl('text/csv', `${header}\n${rows}\n`);
  }

  function exportShotJSON(sh: Snapshot) {
    const json = JSON.stringify(
      {
        id: sh.id,
        createdAt: sh.createdAt.toISOString(),
        codes: sh.codes,
        freeze: sh.freeze ?? null,
      },
      null,
      2,
    );
    openDataUrl('application/json', json);
  }
  function exportShotCSV(sh: Snapshot) {
    const keys = sh.freeze ? Object.keys(sh.freeze) : [];
    const header = ['createdAt', 'codes', ...keys].join(',');
    const row = [
      JSON.stringify(sh.createdAt.toISOString()),
      JSON.stringify(sh.codes.join(' ')),
      ...keys.map((k) => JSON.stringify(String(sh.freeze?.[k] ?? ''))),
    ].join(',');
    openDataUrl('text/csv', `${header}\n${row}\n`);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Logs & Exports</ThemedText>

      <View style={styles.tabsRow}>
        <TabBtn active={tab === 'logs'} onPress={() => setTab('logs')} label="Live Logs" />
        <TabBtn active={tab === 'snapshots'} onPress={() => setTab('snapshots')} label="Snapshots" />
      </View>

      {tab === 'logs' ? (
        (sessions.length === 0 && trips.trips.length === 0) ? (
          <EmptyState
            title="No live logs yet"
            description="Start live polling to record a session."
            icon="timeline"
            primaryLabel="Go to Dashboard"
            onPrimary={() => router.push('/(tabs)')}
            secondaryLabel="Settings"
            onSecondary={() => router.push('/settings')}
          />
        ) : (
          <FlatList
            data={[...trips.trips.map(tripToSession), ...sessions]}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <LogRow
                s={item}
                onPress={() => setSelectedSession(item)}
                onExportJSON={() => exportSessionJSON(item)}
                onExportCSV={() => exportSessionCSV(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )
      ) : shots.length === 0 ? (
        <EmptyState
          title="No snapshots yet"
          description="Save a snapshot from DTCs or Freeze Frame."
          icon="save-alt"
          primaryLabel="Go to DTCs"
          onPrimary={() => router.push('/dtcs')}
          secondaryLabel="Freeze Frame"
          onSecondary={() => router.push('/freeze')}
        />
      ) : (
        <FlatList
          data={shots}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SnapshotRow
              sh={item}
              onPress={() => setSelectedShot(item)}
              onExportJSON={() => exportShotJSON(item)}
              onExportCSV={() => exportShotCSV(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      {message && <ThemedText style={styles.message}>{message}</ThemedText>}

      {/* Quick History */}
      <View style={{ marginTop: 8 }}>
        {history.lastTrip && (
          <ThemedText style={styles.dim}>Last trip: {new Date(history.lastTrip.startedAt).toLocaleString()} • samples {history.lastTrip.samples ?? 0}</ThemedText>
        )}
        {history.cleared.length > 0 && (
          <ThemedText style={styles.dim}>Last cleared DTCs: {history.cleared.slice(0,5).map((c)=>c.codes.join(' ')).join(' | ')}</ThemedText>
        )}
      </View>

      <SessionDetailModal s={selectedSession} onClose={() => setSelectedSession(null)} />
      <SnapshotDetailModal sh={selectedShot} onClose={() => setSelectedShot(null)} />
    </ThemedView>
  );
}

function TabBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}>
      <ThemedText type="defaultSemiBold" style={[styles.tabText, active && styles.tabTextActive]}>{label}</ThemedText>
    </Pressable>
  );
}

function LogRow({ s, onPress, onExportJSON, onExportCSV }: { s: LiveSession; onPress: () => void; onExportJSON: () => void; onExportCSV: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowWrap, pressed && styles.pressed]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">Session {s.id.slice(0, 6)}</ThemedText>
        <ThemedText style={styles.dim}>
          {s.durationSec}s • {s.avgHz.toFixed(1)} Hz • {s.samples.length} samples
        </ThemedText>
      </View>
      <View style={styles.rowActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Export CSV" onPress={onExportCSV} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">CSV</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Export JSON" onPress={onExportJSON} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">JSON</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );
}

function SnapshotRow({ sh, onPress, onExportJSON, onExportCSV }: { sh: Snapshot; onPress: () => void; onExportJSON: () => void; onExportCSV: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowWrap, pressed && styles.pressed]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">Snapshot {sh.id.slice(0, 6)}</ThemedText>
        <ThemedText style={styles.dim}>
          {sh.createdAt.toLocaleString()} • {sh.codes.length} codes • {sh.freeze ? 'with Freeze' : 'no Freeze'}
        </ThemedText>
      </View>
      <View style={styles.rowActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Export CSV" onPress={onExportCSV} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">CSV</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Export JSON" onPress={onExportJSON} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">JSON</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );
}

function SessionDetailModal({ s, onClose }: { s: LiveSession | null; onClose: () => void }) {
  return (
    <Modal transparent animationType="slide" visible={!!s} onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}><View /></Pressable>
      {s && (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <ThemedText type="title">Session {s.id.slice(0, 6)}</ThemedText>
            <ThemedText style={styles.dim}>{s.startedAt.toLocaleString()}</ThemedText>
            <ThemedText style={{ marginTop: 8 }}>{s.durationSec}s • {s.avgHz.toFixed(1)} Hz • {s.samples.length} samples</ThemedText>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>t</ThemedText>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>rpm</ThemedText>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>speed</ThemedText>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>coolant</ThemedText>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>thr</ThemedText>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>stft</ThemedText>
                <ThemedText style={[styles.key, { fontWeight: '600' }]}>ltft</ThemedText>
              </View>
              {s.samples.slice(0, 50).map((r) => (
                <View key={r.t} style={styles.tableRow}>
                  <ThemedText style={styles.key}>{r.t}</ThemedText>
                  <ThemedText style={styles.key}>{r.rpm ?? ''}</ThemedText>
                  <ThemedText style={styles.key}>{r.speed ?? ''}</ThemedText>
                  <ThemedText style={styles.key}>{r.coolant ?? ''}</ThemedText>
                  <ThemedText style={styles.key}>{(r as any).throttle ?? ''}</ThemedText>
                  <ThemedText style={styles.key}>{(r as any).stft ?? ''}</ThemedText>
                  <ThemedText style={styles.key}>{(r as any).ltft ?? ''}</ThemedText>
                </View>
              ))}
              {s.samples.length > 50 && (
                <ThemedText style={styles.dim}>… {s.samples.length - 50} more rows</ThemedText>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

function SnapshotDetailModal({ sh, onClose }: { sh: Snapshot | null; onClose: () => void }) {
  return (
    <Modal transparent animationType="slide" visible={!!sh} onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}><View /></Pressable>
      {sh && (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <ThemedText type="title">Snapshot {sh.id.slice(0, 6)}</ThemedText>
            <ThemedText style={styles.dim}>{sh.createdAt.toLocaleString()}</ThemedText>
            <ThemedText style={{ marginTop: 8 }}>{sh.codes.join(', ') || 'No codes'}</ThemedText>
            {sh.freeze && (
              <View style={styles.table}>
                {Object.entries(sh.freeze).map(([k, v]) => (
                  <View key={k} style={styles.tableRow}>
                    <ThemedText style={styles.key}>{k}</ThemedText>
                    <ThemedText style={styles.val}>{String(v)}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

function demoSessions(): LiveSession[] {
  // create a small fake session
  const now = Date.now();
  const samples: LiveSample[] = [];
  for (let i = 0; i < 60; i++) {
    samples.push({ t: i, rpm: 800 + Math.round(Math.random() * 1200), speed: Math.round(Math.random() * 90), coolant: 70 + Math.round(Math.random() * 20) });
  }
  return [
    { id: 'sess_' + now.toString(36), startedAt: new Date(now - 60000), durationSec: 60, avgHz: 1, samples },
  ];
}

// Convert TripSession to LiveSession shape for rendering/export
function tripToSession(trip: import('@/providers/trip').TripSession): LiveSession {
  const samples: LiveSample[] = trip.samples.map((s) => ({ t: Math.floor((s.t - trip.startedAt) / 1000), rpm: s.rpm ?? undefined, speed: s.speed ?? undefined, coolant: undefined }));
  return {
    id: trip.id,
    startedAt: new Date(trip.startedAt),
    durationSec: Math.max(0, Math.floor(((trip.endedAt ?? Date.now()) - trip.startedAt) / 1000)),
    avgHz: samples.length / Math.max(1, (samples[samples.length - 1]?.t ?? 1)),
    samples,
  };
}

function demoSnapshots(): Snapshot[] {
  const freeze: Record<string, string | number> = {
    RPM: '1500 rpm',
    Speed: '45 km/h',
    Coolant: '85 °C',
  };
  return [
    { id: 'shot_' + Date.now().toString(36), createdAt: new Date(), codes: ['P0101', 'P0420'], freeze },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { textAlign: 'center', marginBottom: 6 },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tab: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  tabActive: { backgroundColor: '#00000010' },
  tabText: { },
  tabTextActive: { },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#00000022' },
  rowWrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowActions: { flexDirection: 'row', gap: 6 },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  pressed: { opacity: 0.8 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 12 },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
  dim: { opacity: 0.7 },
  sheetBackdrop: { position: 'absolute', inset: 0, backgroundColor: '#0007' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 4, backgroundColor: '#00000033', borderRadius: 2, marginBottom: 8 },
  table: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#0002', marginTop: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0002' },
  key: { width: '40%' },
  val: { flex: 1, textAlign: 'right' },
});
