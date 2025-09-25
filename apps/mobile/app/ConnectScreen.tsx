import React from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useUI } from '@/providers/ui';
import { EmptyState } from '@/components/empty-state';
import { scanForElm, BleElmTransport } from '@/services/ble-elm';
import { scanForSpp, SppElmTransport } from '@/services/spp-elm';
import { WifiElmTransport } from '@/services/wifi-elm';
import { setTransport } from '@/services/obd-transport';
import { useSettings } from '@/providers/settings';
import type { BleServiceInfo } from '@/services/ble-elm';

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
  const [bleScanning, setBleScanning] = React.useState<boolean>(false);
  const { settings, save } = useSettings();
  const initialMode: 'BLE'|'SPP'|'WIFI' = (Platform.OS === 'android' && (settings.connection.preferClassicAndroid ?? false)) ? 'SPP' : 'BLE';
  const [mode, setMode] = React.useState<'BLE'|'SPP'|'WIFI'>(initialMode);
  const [bleService, setBleService] = React.useState<string>(String(settings.connection.bleServiceUuid || ''));
  const [bleWrite, setBleWrite] = React.useState<string>(String(settings.connection.bleWriteUuid || ''));
  const [bleNotify, setBleNotify] = React.useState<string>(String(settings.connection.bleNotifyUuid || ''));
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerData, setPickerData] = React.useState<BleServiceInfo[]>([]);
  const [pickerDevice, setPickerDevice] = React.useState<Device | null>(null);
  const [wifiHost, setWifiHost] = React.useState<string>(String(settings.connection.wifiHost || '192.168.0.10'));
  const [wifiPort, setWifiPort] = React.useState<string>(String(settings.connection.wifiPort || 35000));

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (uiState !== 'scanning' || isWeb) return;
      setError(null);
      setDevices([]);
      setBleScanning(true);
      try {
        const found = mode === 'SPP' && Platform.OS === 'android' ? await scanForSpp(6000) : await scanForElm(5000);
        if (cancelled) return;
        if (!found.length) {
          setUiState('error');
          setError('No devices found nearby.');
        } else {
          setDevices(found.map((d) => ({ id: d.id, name: d.name || 'Unknown' })));
          setUiState('idle');
        }
      } catch (e) {
        if (!cancelled) { setUiState('error'); setError(String((e as any)?.message ?? e)); }
      } finally {
        setBleScanning(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uiState, isWeb]);

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
    try {
      if (mode === 'SPP' && Platform.OS === 'android') {
        const t = new SppElmTransport();
        await t.connect(device.id);
        setTransport({ send: (cmd: string) => t.send(cmd) });
      } else if (mode === 'BLE') {
        const t = new BleElmTransport();
        await t.connect(device.id, { service: bleService || undefined, write: bleWrite || undefined, notify: bleNotify || undefined });
        setTransport({ send: (cmd: string) => t.send(cmd) });
      } else {
        throw new Error('Use the Wi‑Fi Connect button to connect via TCP');
      }
      router.push('/init');
    } catch (e) {
      setUiState('error');
      setError(String((e as any)?.message ?? e));
      ui.setBleStatus('disconnected');
    }
  }

  async function connectWifi(host = '192.168.0.10', port = 35000) {
    ui.setBleStatus('scanning');
    setUiState('connecting');
    setError(null);
    try {
      const t = new WifiElmTransport();
      await t.connect(host, port);
      setTransport({ send: (cmd: string) => t.send(cmd) });
      router.push('/init');
    } catch (e) {
      setUiState('error');
      setError(String((e as any)?.message ?? e));
      ui.setBleStatus('disconnected');
    }
  }

  async function openBlePicker(device: Device) {
    try {
      setPickerDevice(device);
      const t = new BleElmTransport();
      const infos = await t.inspect(device.id);
      setPickerData(infos);
      setPickerOpen(true);
    } catch (e) {
      setError(String((e as any)?.message ?? e));
    }
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

      {!isWeb && (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          <Pressable onPress={() => setMode('BLE')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed, mode==='BLE' && { borderColor: Colors.light.tint }]}>
            <ThemedText>BLE</ThemedText>
          </Pressable>
          {Platform.OS === 'android' && (
            <Pressable onPress={() => setMode('SPP')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed, mode==='SPP' && { borderColor: Colors.light.tint }]}>
              <ThemedText>SPP</ThemedText>
            </Pressable>
          )}
          <Pressable onPress={() => setMode('WIFI')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed, mode==='WIFI' && { borderColor: Colors.light.tint }]}>
            <ThemedText>Wi‑Fi</ThemedText>
          </Pressable>
          {mode === 'BLE' && (
            <>
              <Pressable onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
                <ThemedText>Pick UUIDs</ThemedText>
              </Pressable>
            </>
          )}
          {mode === 'WIFI' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Host"
                  value={wifiHost}
                  onChangeText={setWifiHost}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  style={[styles.input, { width: 100, textAlign: 'right' }]}
                  placeholder="Port"
                  value={wifiPort}
                  onChangeText={setWifiPort}
                  keyboardType="number-pad"
                />
                <Pressable onPress={async ()=>{
                  await save({ ...settings, connection: { ...settings.connection, wifiHost, wifiPort: parseInt(wifiPort,10) || 0 } });
                }} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
                  <ThemedText>Save</ThemedText>
                </Pressable>
              </View>
              <Pressable onPress={() => connectWifi(wifiHost, parseInt(wifiPort,10) || 0)} style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
                <ThemedText type="defaultSemiBold" style={styles.primaryBtnText}>Connect {wifiHost}:{wifiPort}</ThemedText>
              </Pressable>
            </>
          )}
        </View>
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

      {!isWeb && mode !== 'WIFI' && (
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
            {mode === 'BLE' && (
              <Pressable onPress={() => openBlePicker(item)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
                <ThemedText>Discover</ThemedText>
              </Pressable>
            )}
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

      {pickerOpen && (
        <View style={{ position: 'absolute', left: 12, right: 12, top: 80, bottom: 80, backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
          <ThemedText type="defaultSemiBold">BLE Services</ThemedText>
          <View style={{ marginTop: 8 }}>
            {pickerData.map((s) => (
              <View key={s.uuid} style={{ marginBottom: 8 }}>
                <Pressable onPress={() => setBleService(s.uuid)} style={({ pressed }) => [{ paddingVertical: 6 }, pressed && { opacity: 0.8 }]}>
                  <ThemedText>{s.uuid}{bleService.toUpperCase()===s.uuid ? ' ✓' : ''}</ThemedText>
                </Pressable>
                {s.characteristics.map((c) => (
                  <View key={c.uuid} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingLeft: 12 }}>
                    <Pressable onPress={() => setBleWrite(c.uuid)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed, bleWrite.toUpperCase()===c.uuid ? { borderColor: Colors.light.tint } : null]}>
                      <ThemedText>Write</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => setBleNotify(c.uuid)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed, bleNotify.toUpperCase()===c.uuid ? { borderColor: Colors.light.tint } : null]}>
                      <ThemedText>Notify</ThemedText>
                    </Pressable>
                    <ThemedText>{c.uuid}</ThemedText>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <Pressable onPress={() => setPickerOpen(false)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
              <ThemedText>Close</ThemedText>
            </Pressable>
            <Pressable disabled={!pickerDevice || !bleService || !bleWrite || !bleNotify} onPress={async () => {
              if (pickerDevice) {
                await save({ ...settings, connection: { ...settings.connection, bleServiceUuid: bleService, bleWriteUuid: bleWrite, bleNotifyUuid: bleNotify } });
                connectTo(pickerDevice);
              }
              setPickerOpen(false);
            }} style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
              <ThemedText type="defaultSemiBold" style={styles.primaryBtnText}>Connect with UUIDs</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

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
  input: { minWidth: 140, borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
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
