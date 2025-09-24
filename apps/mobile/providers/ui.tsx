import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type BleStatus = 'disconnected' | 'scanning' | 'connected';

type UIContextValue = {
  bleStatus: BleStatus;
  setBleStatus: (s: BleStatus) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  confirm: (opts: { title?: string; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string; cancelText?: string }) => void;
};

const UIContext = React.createContext<UIContextValue | null>(null);

export function useUI() {
  const ctx = React.useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [bleStatus, setBleStatus] = React.useState<BleStatus>('disconnected');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [confirmState, setConfirmState] = React.useState<null | {
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>(null);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const confirm = React.useCallback((opts: UIContextValue['confirm'] extends (a: infer A) => any ? A : never) => {
    setConfirmState(opts);
  }, []);

  const value: UIContextValue = {
    bleStatus,
    setBleStatus,
    busy,
    setBusy,
    error,
    setError,
    toast,
    showToast,
    confirm,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <LoadingOverlay visible={busy} />
      <Toast message={toast} />
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </UIContext.Provider>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <Pressable onPress={onDismiss} style={styles.bannerWrap}>
      <ThemedView style={styles.banner}>
        <ThemedText style={styles.bannerText}>{message}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" />
      <ThemedText style={{ marginTop: 8 }}>Working…</ThemedText>
    </View>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <ThemedText style={styles.toastText}>{message}</ThemedText>
    </View>
  );
}

function ConfirmModal({ state, onClose }: { state: NonNullable<Parameters<UIContextValue['confirm']>[0]> | null; onClose: () => void }) {
  if (!state) return null;
  const { title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' } = state;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} visible>
      <Pressable style={styles.backdrop} onPress={onClose}><View /></Pressable>
      <View style={styles.card}>
        {title && <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>{title}</ThemedText>}
        <ThemedText style={{ marginBottom: 10 }}>{message}</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => { onCancel?.(); onClose(); }} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
            <ThemedText>{cancelText}</ThemedText>
          </Pressable>
          <Pressable onPress={() => { onConfirm(); onClose(); }} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}>
            <ThemedText style={{ color: '#fff' }}>{confirmText}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, padding: 8 },
  banner: { padding: 8, borderRadius: 8, backgroundColor: '#dc262633' },
  bannerText: { color: '#991b1b', textAlign: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0006' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 20, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111a' },
  toastText: { color: '#fff', textAlign: 'center' },
  backdrop: { position: 'absolute', inset: 0, backgroundColor: '#0007' },
  card: { position: 'absolute', left: 20, right: 20, top: '35%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  btn: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  btnPrimary: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
});

