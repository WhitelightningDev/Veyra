import React from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useUI } from '@/providers/ui';
import { EmptyState } from '@/components/empty-state';

type Device = { id: string; name: string };
type UiState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

export default function ConnectScreen() {
  const ui = useUI();
  const [uiState, setUiState] = React.useState<UiState>('idle');
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  // Very light status detection; real BLE permission/state checks can be wired later
  const isWeb = Platform.OS === 'web';
  const bluetoothAvailable = React.useMemo(() => {
    if (!isWeb) return true; // assume available on native; actual check done by BLE lib
    if (typeof navigator === 'undefined') return false;
    return Boolean((navigator as any).bluetooth);
  }, [isWeb]);
  const [permissionsOk] = React.useState<boolean>(true);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (uiState === 'scanning') {
      setError(null);
      setDevices([]);
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer!);
            const found: Device[] = permissionsOk
              ? [
                  { id: 'AA:BB:CC:DD:EE:01', name: 'ELM327 v1.5' },
                  { id: 'AA:BB:CC:DD:EE:02', name: 'OBDLink LX' },
                ]
              : [];
            if (found.length === 0) {
              setUiState('error');
              setError(permissionsOk ? 'No devices found nearby.' : 'Bluetooth permissions are missing.');
            } else {
              setDevices(found);
              setUiState('idle');
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [uiState, permissionsOk, bluetoothAvailable]);

  function onScan() {
    if (!permissionsOk) {
      setError('Missing Bluetooth permissions.');
      setUiState('error');
      return;
    }
    ui.setBleStatus('scanning');
    setUiState('scanning');
  }

  async function connectTo(device: Device) {
    ui.setBleStatus('scanning');
    setUiState('connecting');
    setError(null);
    // Navigate to initialization flow
    router.push('/init');
  }

  function useDemoMode() {
    setError(null);
    setUiState('connected');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>
        Connect to OBD Adapter
      </ThemedText>

      {isWeb && (
        <EmptyState
          title="Web build: BLE not available"
          description="Bluetooth connections require the native app. You can use Demo Mode to explore the UI."
          icon="bluetooth-disabled"
          primaryLabel="Use Demo Mode"
          onPrimary={useDemoMode}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiState === 'scanning' ? 'Scanning for adapters' : 'Scan for Adapters'}
        onPress={onScan}
        disabled={uiState === 'scanning' || uiState === 'connecting'}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.btnPressed,
          (uiState === 'scanning' || uiState === 'connecting') && styles.btnDisabled,
        ]}
      >
        <ThemedText type="defaultSemiBold" style={styles.primaryBtnText}>
          {uiState === 'scanning' ? 'Scanning…' : 'Scan for Adapters'}
        </ThemedText>
        {uiState === 'scanning' && (
          <View style={styles.inlineRight}>
            <ActivityIndicator color="#fff" />
            <ThemedText type="defaultSemiBold" style={styles.countdown}>
              {countdown}s
            </ThemedText>
          </View>
        )}
      </Pressable>

      <View style={styles.statusRow}>
        <StatusPill
          label={isWeb ? 'Web Bluetooth' : 'Bluetooth'}
          value={!isWeb ? (bluetoothAvailable ? 'On' : 'Off') : bluetoothAvailable ? 'Available' : 'Unsupported'}
          ok={!isWeb ? bluetoothAvailable : true}
        />
        <StatusPill label="Permissions" value={permissionsOk ? 'OK' : 'Missing'} ok={permissionsOk} />
      </View>

      {!isWeb && (
      <FlatList
        data={devices}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={devices.length > 0 ? (
          <ThemedText type="subtitle" style={styles.subheading}>
            Discovered devices
          </ThemedText>
        ) : null}
        renderItem={({ item }) => (
          <View style={styles.deviceRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.name || 'Unknown'}</ThemedText>
              <ThemedText style={styles.deviceId}>{item.id}</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Connect to ${item.name || 'Unknown'} ${item.id}`}
              onPress={() => connectTo(item)}
              disabled={uiState === 'connecting' || uiState === 'connected'}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            >
              <ThemedText type="defaultSemiBold" style={styles.secondaryBtnText}>
                {uiState === 'connecting' ? 'Connecting…' : 'Connect'}
              </ThemedText>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={uiState !== 'scanning' ? (
          <ThemedText style={styles.emptyText}>No devices yet. Tap scan to search.</ThemedText>
        ) : null}
        contentContainerStyle={{ paddingBottom: 12 }}
        style={styles.list}
      />)}

      <Pressable onPress={useDemoMode} style={({ pressed }) => [styles.linkBtn, pressed && styles.btnPressed]}>
        <ThemedText type="defaultSemiBold" style={styles.linkBtnText}>
          Use Demo Mode
        </ThemedText>
      </Pressable>

      {uiState === 'error' && !!error && (
        <EmptyState
          title={error.includes('permissions') ? 'Bluetooth permissions required' : error.includes('devices') ? 'No devices found' : 'Connection issue'}
          description={error}
          icon={error.includes('permissions') ? 'lock' : error.includes('devices') ? 'bluetooth' : 'error-outline'}
          primaryLabel={error.includes('permissions') ? 'Open Settings' : 'Retry Scan'}
          onPrimary={() => {
            if (error.includes('permissions')) {
              try { require('react-native').Linking.openSettings(); } catch {}
            } else {
              onScan();
            }
          }}
          secondaryLabel="Use Demo Mode"
          onSecondary={useDemoMode}
        />
      )}

      {uiState === 'connected' && (
        <ThemedText type="defaultSemiBold" style={styles.connectedText}>
          Connected.
        </ThemedText>
      )}
    </ThemedView>
  );
}

function StatusPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={[styles.pill, ok ? styles.pillOk : styles.pillErr]}>
      <ThemedText type="defaultSemiBold" style={styles.pillText}>
        {label}: {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  header: {
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.tint,
    gap: 10,
  },
  primaryBtnText: {
    color: '#fff',
  },
  inlineRight: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdown: {
    color: '#fff',
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pillOk: {
    backgroundColor: '#16a34a33',
  },
  pillErr: {
    backgroundColor: '#dc262633',
  },
  pillText: {
    fontSize: 12,
  },
  subheading: {
    marginTop: 12,
    marginBottom: 4,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000022',
  },
  deviceId: {
    opacity: 0.6,
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
  },
  secondaryBtnText: {
    color: Colors.light.text,
  },
  linkBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  linkBtnText: {
    color: Colors.light.tint,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 12,
  },
  connectedText: {
    color: '#16a34a',
    textAlign: 'center',
  },
});
