import React from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { DTC_LIBRARY, lookupDtc, type DtcEntry } from '@/constants/dtc';

type DtcItem = {
  code: string;
};

export default function DtcsScreen() {
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
      setCodes([{ code: 'P0101' }, { code: 'P0300' }, { code: 'P0420' }]);
      setLoading(false);
    }, 700);
  }

  function onClearPressed() {
    setConfirmClear('askSnapshot');
  }

  function doClear(save: boolean) {
    if (save) {
      // TODO: capture snapshot (codes + optional freeze frame)
      setMessage('Snapshot saved.');
    }
    setCodes([]);
    setConfirmClear(null);
    setMessage('Codes cleared.');
  }

  function openSearchWeb(code: string) {
    const q = encodeURIComponent(`${code} trouble code`);
    Linking.openURL(`https://duckduckgo.com/?q=${q}`).catch(() => {});
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Diagnostic Trouble Codes</ThemedText>

      <View style={styles.actions}>
        <Pressable onPress={readCodes} disabled={loading} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>{loading ? 'Reading…' : 'Read Codes'}</ThemedText>
        </Pressable>
        <Pressable onPress={onClearPressed} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Clear Codes</ThemedText>
        </Pressable>
      </View>

      {codes.length === 0 && !loading && (
        <ThemedText style={styles.empty}>No codes loaded. Tap Read Codes.</ThemedText>
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

      <DetailsSheet entry={showDetails} onClose={() => setShowDetails(null)} onSearch={openSearchWeb} />
    </ThemedView>
  );
}

function SeverityBadge({ sev }: { sev: DtcEntry['severity'] }) {
  const bg = sev === 'Critical' ? '#dc2626' : sev === 'Warning' ? '#f59e0b' : '#6b7280';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="defaultSemiBold" style={styles.badgeText}>{sev}</ThemedText>
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

function DtcRow({ entry, onPress }: { entry: DtcEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed] }>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedText type="defaultSemiBold" style={styles.code}>{entry.code}</ThemedText>
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
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>Save current codes + freeze frame before clearing?</ThemedText>
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

function DetailsSheet({ entry, onClose, onSearch }: { entry: DtcEntry | null; onClose: () => void; onSearch: (code: string) => void }) {
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
              <Pressable onPress={() => onSearch(entry.code)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <ThemedText type="defaultSemiBold">Search web</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push(`/freeze?code=${entry.code}`)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <ThemedText type="defaultSemiBold">Freeze Frame</ThemedText>
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
  causesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#aaa', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#00000022' },
  message: { textAlign: 'center', opacity: 0.8, marginTop: 8 },
  modalBackdrop: { position: 'absolute', inset: 0, backgroundColor: '#0008' },
  modalCard: { position: 'absolute', left: 20, right: 20, top: '35%', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', inset: 0, backgroundColor: '#0007' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 4, backgroundColor: '#00000033', borderRadius: 2, marginBottom: 8 },
});
