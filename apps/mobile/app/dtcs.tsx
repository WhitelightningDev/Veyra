import React from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { DTC_LIBRARY, lookupDtc, rankLikelyCauses, type DtcEntry } from '@/constants/dtc';
import { useUI } from '@/providers/ui';
import { useSettings } from '@/providers/settings';
import { useTelemetry } from '@/providers/telemetry';
import { useHistory } from '@/providers/history';
import { EmptyState } from '@/components/empty-state';
import { router } from 'expo-router';

type DtcItem = {
  code: string;
};

export default function DtcsScreen() {
  const ui = useUI();
  const { settings } = useSettings();
  const telemetry = useTelemetry();
  const history = useHistory();
  const [codes, setCodes] = React.useState<DtcItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [confirmClear, setConfirmClear] = React.useState<null | 'askSnapshot'>(null);
  const [showDetails, setShowDetails] = React.useState<DtcEntry | null>(null);

  async function readCodes() {
    setLoading(true);
    setMessage(null);
    // Simulate a short read; wire to core-obd later using tryDecodeDtcResponse
    setTimeout(() => {
      setCodes([{ code: 'P0101' }, { code: 'P2463' }, { code: 'P13DF' }]);
      setLoading(false);
      ui.showToast('Codes loaded');
    }, 700);
  }

  function onClearPressed() {
    const rpm = telemetry.rpm ?? 0;
    if (settings.safety.blockClearWhenRunning && rpm > 0) {
      ui.confirm({
        title: 'Engine running',
        message: 'RPM indicates the engine is running. Block Clear Codes? You can override to proceed.',
        cancelText: 'Cancel',
        confirmText: 'Override',
        onConfirm: () => setConfirmClear('askSnapshot'),
      });
      return;
    }
    setConfirmClear('askSnapshot');
  }

  function doClear(save: boolean) {
    if (save) {
      // TODO: capture snapshot (codes + optional freeze frame)
      setMessage('Snapshot saved.');
      ui.showToast('Snapshot saved');
    }
    // record cleared
    if (codes.length) history.addCleared(codes.map((c) => c.code));
    setCodes([]);
    setConfirmClear(null);
    setMessage('Codes cleared.');
    ui.showToast('Codes cleared');
  }

  function openSearchWeb(code: string, onFail: (msg: string) => void) {
  const q = encodeURIComponent(`${code} trouble code`);
  const online = typeof navigator !== 'undefined' ? (navigator as any).onLine !== false : true;
  if (!online) {
    onFail('Offline: cannot open web search.');
    return;
  }
  Linking.openURL(`https://duckduckgo.com/?q=${q}`).catch(() => onFail('Failed to open browser.'));
}

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Diagnostic Trouble Codes</ThemedText>

      {codes.length > 0 && (
        <View style={styles.suspectBox}>
          <ThemedText type="defaultSemiBold">Top suspects</ThemedText>
          <View style={styles.causesRow}>
            {rankLikelyCauses(codes.map((c) => c.code)).slice(0, 3).map((r) => (
              <View key={r.cause} style={styles.chip}><ThemedText style={styles.chipText}>{r.cause}</ThemedText></View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Read Codes" onPress={readCodes} disabled={loading} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>{loading ? 'Reading…' : 'Read Codes'}</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Clear Codes" onPress={onClearPressed} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Clear Codes</ThemedText>
        </Pressable>
        {codes.length > 1 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Compare Freeze Frames" onPress={() => router.push(`/freeze-compare?codes=${encodeURIComponent(codes.map((c)=>c.code).join(','))}`)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="defaultSemiBold">Compare Freeze Frames</ThemedText>
          </Pressable>
        )}
      </View>

      {codes.length === 0 && !loading && (
        <EmptyState
          title="No DTCs found"
          description="Read codes to retrieve current trouble codes."
          icon="report-problem"
          primaryLabel="Read Codes"
          onPrimary={readCodes}
          secondaryLabel="Freeze Frame"
          onSecondary={() => router.push('/freeze')}
        />
      )}

      <FlatList
        data={codes}
        keyExtractor={(i) => i.code}
        renderItem={({ item }) => <DtcRow entry={lookupDtc(item.code)} onPress={() => setShowDetails(lookupDtc(item.code))} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      {message && <ThemedText style={styles.message}>{message}</ThemedText>}

      <ConfirmClearModal
        visible={confirmClear === 'askSnapshot'}
        onCancel={() => setConfirmClear(null)}
        onNo={() => doClear(false)}
        onYes={() => doClear(true)}
      />

      <DetailsSheet entry={showDetails} onClose={() => setShowDetails(null)} onSearch={(code) => openSearchWeb(code, (msg) => ui.setError(msg))} onAnnounce={(text) => announce(text, settings.accessibility?.announceDtcVoice ?? false)} />
    </ThemedView>
  );
}

function SeverityBadge({ sev }: { sev: DtcEntry['severity'] }) {
  const style = sev === 'Critical'
    ? { bg: '#ef444433', border: '#ef4444', icon: 'priority-high', fg: '#7f1d1d' }
    : sev === 'Warning'
    ? { bg: '#f59e0b33', border: '#f59e0b', icon: 'error-outline', fg: '#78350f' }
    : { bg: '#6b728033', border: '#6b7280', icon: 'info-outline', fg: '#374151' };
  return (
    <View accessibilityRole="text" accessibilityLabel={`Severity ${sev}`} style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}> 
      <MaterialIcons name={style.icon as any} size={14} color={style.fg} style={{ marginRight: 4 }} />
      <ThemedText type="defaultSemiBold" style={[styles.badgeText, { color: style.fg }]}>{sev}</ThemedText>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText}>{label}</ThemedText>
    </View>
  );
}

async function copyToClipboard(text: string) {
  try {
    const Clipboard = require('expo-clipboard');
    if (Clipboard?.setStringAsync) return Clipboard.setStringAsync(text);
  } catch {}
  if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
    // @ts-ignore
    return (navigator as any).clipboard.writeText(text);
  }
}

function DtcRow({ entry, onPress }: { entry: DtcEntry; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for code ${entry.code}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed] }
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="defaultSemiBold" style={styles.code}>{entry.code}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Copy code ${entry.code}`}
              onPress={(e) => { e.stopPropagation(); copyToClipboard(entry.code); }}
              hitSlop={8}
              style={({ pressed }) => [styles.copyChip, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="content-copy" size={14} color="#555" />
              <ThemedText style={styles.copyText}>Copy</ThemedText>
            </Pressable>
          </View>
          <SeverityBadge sev={entry.severity} />
        </View>
        <ThemedText>{entry.short}</ThemedText>
        <View style={styles.causesRow}>
          {entry.causes.slice(0, 4).map((c) => (
            <Chip key={c} label={c} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function ConfirmClearModal({ visible, onCancel, onYes, onNo }: { visible: boolean; onCancel: () => void; onYes: () => void; onNo: () => void }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <View />
      </Pressable>
      <View style={styles.modalCard}>
      <ThemedText accessibilityRole="header" type="defaultSemiBold" style={{ marginBottom: 8 }}>Save current codes + freeze frame before clearing?</ThemedText>
        <View style={styles.modalActions}>
          <Pressable onPress={onNo} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="defaultSemiBold">No</ThemedText>
          </Pressable>
          <Pressable onPress={onYes} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Yes</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function announce(text: string, enabled: boolean) {
  if (!enabled) return;
  try {
    const Speech = require('expo-speech');
    if (Speech?.speak) Speech.speak(text);
  } catch {}
}

function DetailsSheet({ entry, onClose, onSearch, onAnnounce }: { entry: DtcEntry | null; onClose: () => void; onSearch: (code: string) => void; onAnnounce: (text: string) => void }) {
  React.useEffect(() => {
    if (entry) onAnnounce(`${entry.code}. ${entry.short}`);
  }, [entry]);
  return (
    <Modal transparent animationType="slide" visible={!!entry} onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <View />
      </Pressable>
      {entry && (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText type="title">{entry.code}</ThemedText>
              <SeverityBadge sev={entry.severity} />
            </View>
            <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>{entry.short}</ThemedText>
            <ThemedText style={{ marginTop: 8 }}>{entry.description}</ThemedText>

            {entry.symptoms.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <ThemedText type="defaultSemiBold">Typical symptoms</ThemedText>
                {entry.symptoms.map((s) => (
                  <ThemedText key={s}>• {s}</ThemedText>
                ))}
              </View>
            )}

            {entry.quickChecks.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <ThemedText type="defaultSemiBold">Quick checks</ThemedText>
                {entry.quickChecks.map((s) => (
                  <ThemedText key={s}>• {s}</ThemedText>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search web for this code"
                onPress={() => onSearch(entry.code)}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <ThemedText type="defaultSemiBold">Search web</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Freeze Frame"
                onPress={() => router.push(`/freeze?code=${entry.code}`)}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <ThemedText type="defaultSemiBold">Freeze Frame</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy code"
                onPress={() => copyToClipboard(entry.code)}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <ThemedText type="defaultSemiBold">Copy</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  primary: { backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  pressed: { opacity: 0.8 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 12 },
  row: { paddingVertical: 12 },
  code: { fontSize: 18 },
  suspectBox: { paddingVertical: 8 },
  copyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: '#bbb', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  copyText: { fontSize: 12 },
  causesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#aaa', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  badgeText: { },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#00000022' },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
  modalBackdrop: { position: 'absolute', inset: 0, backgroundColor: '#0008' },
  modalCard: { position: 'absolute', left: 20, right: 20, top: '35%', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', inset: 0, backgroundColor: '#0007' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 4, backgroundColor: '#00000033', borderRadius: 2, marginBottom: 8 },
});
