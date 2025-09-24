import React from 'react';
import { Pressable, StyleSheet, View, Animated, Easing } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useSettings } from '@/providers/settings';
import { useTelemetry } from '@/providers/telemetry';
import { useUI } from '@/providers/ui';
import { useTrip } from '@/providers/trip';
import { getTransport } from '@/services/obd-transport';
import { parseElmLines, decode } from 'core-obd';

type Preset = 'Basic' | 'Performance' | 'Diagnostics';

export default function DashboardScreen() {
  const { settings, save } = useSettings();
  const telemetry = useTelemetry();
  const ui = useUI();
  const trip = useTrip();
  const [polling, setPolling] = React.useState(false);
  const preset = settings.polling.preset as Preset;
  const [rpm, setRpm] = React.useState<number | null>(null);
  const [speed, setSpeed] = React.useState<number | null>(null);
  const [coolant, setCoolant] = React.useState<number | null>(null);
  const [map, setMap] = React.useState<number | null>(null);
  const [iat, setIat] = React.useState<number | null>(null);
  const [maf, setMaf] = React.useState<number | null>(null);
  const [batt, setBatt] = React.useState<number | null>(null);
  const [showPresets, setShowPresets] = React.useState(false);
  const [tickTimes, setTickTimes] = React.useState<number[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [throttle, setThrottle] = React.useState<number | null>(null);
  const [stft, setStft] = React.useState<number | null>(null);
  const [ltft, setLtft] = React.useState<number | null>(null);

  const cfg = React.useMemo(() => {
    const base = preset === 'Performance'
      ? { pids: { rpm: true, speed: true, coolant: true, map: true, iat: true, maf: true } }
      : preset === 'Diagnostics'
      ? { pids: { rpm: true, speed: false, coolant: true, map: true, iat: true, maf: true } }
      : { pids: { rpm: true, speed: true, coolant: true, map: false, iat: false, maf: false } };
    return { hz: settings.polling.rateHz, ...base };
  }, [preset, settings.polling.rateHz]);

  React.useEffect(() => {
    let cancelled = false;
    const tr = getTransport();
    if (!polling || !tr) return;
    const pids: string[] = [];
    if (cfg.pids.rpm) pids.push('010C');
    if (cfg.pids.speed) pids.push('010D');
    if (cfg.pids.coolant) pids.push('0105');
    if (cfg.pids.map) pids.push('010B');
    if (cfg.pids.iat) pids.push('010F');
    if (cfg.pids.maf) pids.push('0110');
    pids.push('0111','0106','0107');
    let idx = 0;
    const interval = Math.max(100, Math.round(1000 / cfg.hz));
    const id = setInterval(async () => {
      if (cancelled) return;
      try {
        const cmd = pids[idx % pids.length]!;
        idx++;
        const lines = await tr.send(cmd);
        const resps = parseElmLines(lines);
        const resp = resps.find((r) => r.service === '01' && r.pid === cmd.slice(2));
        if (resp) {
          const dec = decode(`01${resp.pid}`, resp.data);
          if ('rpm' in dec) setRpm(dec.rpm as number);
          if ('speed_kph' in dec) setSpeed(dec.speed_kph as number);
          if ('coolant_c' in dec) setCoolant(dec.coolant_c as number);
          if ('map_kpa' in dec) setMap(dec.map_kpa as number);
          if ('iat_c' in dec) setIat(dec.iat_c as number);
          if ('maf_gps' in dec) setMaf(dec.maf_gps as number);
          if ('throttle_pct' in dec) setThrottle(dec.throttle_pct as number);
          if ('stft1_pct' in dec) setStft(dec.stft1_pct as number);
          if ('ltft1_pct' in dec) setLtft(dec.ltft1_pct as number);
          setTickTimes((prev) => [...prev.slice(-19), Date.now()]);
        }
        if (idx % (pids.length * 5) === 0) {
          const rv = await tr.send('ATRV');
          const m = rv.join(' ').match(/([0-9]+\.[0-9])\s*V/i);
          if (m) setBatt(parseFloat(m[1]!));
        }
      } catch {}
    }, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [polling, cfg]);

  const approxHz = React.useMemo(() => {
    if (tickTimes.length < 2) return 0;
    const ms = tickTimes[tickTimes.length - 1] - tickTimes[0];
    const ticks = tickTimes.length - 1;
    return ms > 0 ? +(ticks / (ms / 1000)).toFixed(1) : 0;
  }, [tickTimes]);

  // Publish telemetry
  React.useEffect(() => { telemetry.setRpm(rpm ?? null); }, [rpm]);
  React.useEffect(() => { telemetry.setSpeed(speed ?? null); }, [speed]);
  React.useEffect(() => { telemetry.setCoolant(coolant ?? null); }, [coolant]);
  React.useEffect(() => { telemetry.setMap(map ?? null); }, [map]);
  React.useEffect(() => { telemetry.setIat(iat ?? null); }, [iat]);
  React.useEffect(() => { telemetry.setMaf(maf ?? null); }, [maf]);
  React.useEffect(() => { telemetry.setThrottle(throttle ?? null); }, [throttle]);
  React.useEffect(() => { telemetry.setStft(stft ?? null); }, [stft]);
  React.useEffect(() => { telemetry.setLtft(ltft ?? null); }, [ltft]);
  React.useEffect(() => { telemetry.setBatteryV(batt ?? null); }, [batt]);
  React.useEffect(() => { telemetry.setRateHz(approxHz); }, [approxHz]);

  // Adapter detection: warn if rate below target
  const targetHz = settings.polling.rateHz;
  const slow = approxHz > 0 && approxHz < Math.max(1, targetHz * 0.7);
  const warnedRef = React.useRef(false);
  React.useEffect(() => {
    if (slow && !warnedRef.current) {
      ui.showToast(`Polling rate ${approxHz.toFixed(1)} Hz below target ${targetHz} Hz. Adapter may be slow.`);
      warnedRef.current = true;
    }
    if (!slow) warnedRef.current = false;
  }, [slow, approxHz, targetHz, ui]);

  function startStop() {
    setPolling((p) => !p);
    if (!polling) {
      setMessage(null);
    }
  }

  async function choosePreset(p: Preset) {
    await save({ ...settings, polling: { ...settings.polling, preset: p } });
    setShowPresets(false);
  }

  function readDtc() { require('expo-router').router.push('/dtcs'); }
  function openFreeze() { require('expo-router').router.push('/freeze'); }
  function openVehicle() { require('expo-router').router.push('/vehicle'); }
  function openReadiness() { require('expo-router').router.push('/readiness'); }
  function openAdvanced() { require('expo-router').router.push('/advanced'); }
  function openLogs() { require('expo-router').router.push('/logs'); }
  function openSettings() { require('expo-router').router.push('/settings'); }
  function readFreeze() {
    setMessage('Reading Freeze Frame… (stub)');
  }
  function saveSnapshot() {
    setMessage('Snapshot saved. (stub)');
  }
  function startTrip() { if (!trip.active) trip.startTrip(); }
  function stopTrip() { if (trip.active) trip.stopTrip(); }

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

      <MiniStatus approxHz={approxHz} targetHz={targetHz} slow={slow} battery={batt} />

      {!polling && (
        <ThemedText style={styles.empty}>Not polling yet. Tap Start.</ThemedText>
      )}

      <View style={styles.grid}>
        { (settings.dashboard?.cards.rpm ?? true) && (
          <Tile label="RPM" value={rpm} unit="rpm" large spark={settings.dashboard?.showSparklines} dataKey="rpm" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.speed ?? true) && (
          <Tile label="Speed" value={convertSpeed(speed, settings.units.speed)} unit={settings.units.speed === 'mph' ? 'mph' : 'km/h'} large spark={settings.dashboard?.showSparklines} dataKey="speed" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.coolant ?? true) && (
          <Tile label="Coolant" value={convertTemp(coolant, settings.units.temp)} unit={settings.units.temp === 'F' ? '°F' : '°C'} spark={settings.dashboard?.showSparklines} dataKey="coolant" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.map ?? false) && (
          <Tile label="MAP" value={convertPressure(map, settings.units.pressure)} unit={settings.units.pressure === 'psi' ? 'psi' : 'kPa'} spark={settings.dashboard?.showSparklines} dataKey="map" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.iat ?? false) && (
          <Tile label="IAT" value={convertTemp(iat, settings.units.temp)} unit={settings.units.temp === 'F' ? '°F' : '°C'} spark={settings.dashboard?.showSparklines} dataKey="iat" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.maf ?? false) && (
          <Tile label="MAF" value={maf} unit="g/s" spark={settings.dashboard?.showSparklines} dataKey="maf" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.boost ?? false) && (
          <Tile label="Boost" value={map == null ? null : convertPressure(Math.max(0, map - 100), settings.units.pressure)} unit={settings.units.pressure === 'psi' ? 'psi' : 'kPa'} spark={settings.dashboard?.showSparklines} dataKey="boost" themeKey={settings.dashboard?.theme ?? 'default'} />
        )}
        { (settings.dashboard?.cards.battery ?? true) && (<BatteryTile value={batt} />) }
      </View>

      <View style={styles.quickRow}>
        <Pressable onPress={readDtc} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Read DTCs</ThemedText>
        </Pressable>
        <Pressable onPress={openFreeze} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Freeze Frame</ThemedText>
        </Pressable>
        <Pressable onPress={openVehicle} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Vehicle Info</ThemedText>
        </Pressable>
      </View>
      <View style={styles.quickRow}>
        <Pressable onPress={openAdvanced} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Advanced Scan</ThemedText>
        </Pressable>
        <Pressable onPress={openLogs} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Logs</ThemedText>
        </Pressable>
        <Pressable onPress={openSettings} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Settings</ThemedText>
        </Pressable>
        <Pressable onPress={openReadiness} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Readiness</ThemedText>
        </Pressable>
      </View>
      <View style={styles.quickRow}>
        {trip.active ? (
          <>
            <Pressable onPress={stopTrip} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Stop Trip</ThemedText>
            </Pressable>
            <ThemedText style={{ alignSelf: 'center', opacity: 0.8 }}>Recording… {trip.current?.samples.length ?? 0} samples</ThemedText>
          </>
        ) : (
          <Pressable onPress={startTrip} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Start Trip</ThemedText>
          </Pressable>
        )}
      </View>

      {message && <ThemedText style={styles.message}>{message}</ThemedText>}
    </ThemedView>
  );
}

const histInit: Record<string, number[]> = { rpm: [], speed: [], coolant: [], map: [], iat: [], maf: [], boost: [] };
function useHistory(key: keyof typeof histInit, value: number | null) {
  const [data, setData] = React.useState<number[]>([]);
  React.useEffect(() => {
    if (value == null || Number.isNaN(value)) return;
    setData((prev) => [...prev.slice(-59), value]);
  }, [value]);
  return data;
}

function Tile({ label, value, unit, large, spark, dataKey, themeKey }: { label: string; value: number | null; unit: string; large?: boolean; spark?: boolean; dataKey?: keyof typeof histInit; themeKey: 'default' | 'performance' | 'eco' }) {
  const hist = useHistory(dataKey ?? 'rpm', value);
  const theme = tileTheme(themeKey, label);
  return (
    <View style={[styles.tile, large && styles.tileLarge, theme.tile]}>
      <ThemedText style={[styles.tileLabel, theme.label]}>{label}</ThemedText>
      {value === null ? (
        <Shimmer height={large ? 36 : 28} />
      ) : (
        <AnimatedNumber value={value} format={(v) => v.toFixed(label === 'RPM' ? 0 : 1)} style={[styles.tileValue, large && styles.tileValueLarge, theme.value]} />
      )}
      {spark && hist.length > 2 && (
        <View style={{ height: 28, marginTop: 4 }}>
          <Sparkline values={hist} color={theme.spark} />
        </View>
      )}
      <ThemedText style={[styles.tileUnit, theme.unit]}>{unit}</ThemedText>
    </View>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-3, max - min);
  const y = (v: number) => 100 - ((v - min) / range) * 100;
  const points = values.map((v, i) => `${i} ${y(v).toFixed(2)}`).join(' L ');
  const d = `M ${points}`;
  return (
    <Svg viewBox={`0 0 ${Math.max(1, n - 1)} 100`} width="100%" height="100%">
      <Path d={d} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function AnimatedNumber({ value, format, style }: { value: number; format: (v: number) => string; style: any }) {
  const anim = React.useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = React.useState(value);
  React.useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    return () => anim.removeListener(id);
  }, [value]);
  return <ThemedText type="defaultSemiBold" style={style}>{format(display)}</ThemedText>;
}

function Shimmer({ height = 20 }: { height?: number }) {
  const op = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(op, { toValue: 0.4, duration: 700, useNativeDriver: false }),
    ])).start();
  }, []);
  return <Animated.View style={{ height, borderRadius: 6, backgroundColor: '#9ca3af55', opacity: op }} />;
}

function tileTheme(theme: 'default' | 'performance' | 'eco', label: string) {
  if (theme === 'performance') {
    const accent = label === 'RPM' ? '#ef4444' : '#eab308';
    return { tile: { backgroundColor: '#0b0b0b' }, label: { color: '#9ca3af' }, value: { color: accent }, unit: { color: '#9ca3af' }, spark: accent };
  }
  if (theme === 'eco') {
    const accent = '#22c55e';
    return { tile: { backgroundColor: '#0b1a0b' }, label: { color: '#a3e635' }, value: { color: accent }, unit: { color: '#a3e635' }, spark: accent };
  }
  return { tile: {}, label: {}, value: {}, unit: {}, spark: '#64748b' };
}

function convertTemp(v: number | null, unit: 'C' | 'F') {
  if (v == null) return v;
  return unit === 'F' ? (v * 9) / 5 + 32 : v;
}
function convertSpeed(v: number | null, unit: 'kmh' | 'mph') {
  if (v == null) return v;
  return unit === 'mph' ? v * 0.621371 : v;
}
function convertPressure(v: number | null, unit: 'kPa' | 'psi') {
  if (v == null) return v;
  return unit === 'psi' ? v * 0.145038 : v;
}

function MiniStatus({ approxHz, targetHz, slow, battery }: { approxHz: number; targetHz: number; slow: boolean; battery: number | null }) {
  return (
    <View style={styles.statusBar}>
      <ThemedText style={styles.statusItem}>Protocol: ISO 15765-4</ThemedText>
      <ThemedText style={styles.statusItem}>Adapter: {slow ? 'Slow/Clone?' : 'ELM327 v1.5'}</ThemedText>
      <ThemedText style={styles.statusItem}>Rate: {approxHz.toFixed(1)} Hz (target {targetHz})</ThemedText>
      <ThemedText style={styles.statusItem}>Battery: {battery == null ? '—' : `${battery.toFixed(1)} V`} {batteryState(battery)}</ThemedText>
      <ThemedText style={styles.statusItem}>FE: {formatFe(approxHz)}</ThemedText>
    </View>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function randDelta(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function batteryState(v: number | null) {
  if (v == null) return '';
  if (v < 11.8) return '(cranking/low)';
  if (v >= 13.5) return '(charging)';
  return '(ok)';
}

function BatteryTile({ value }: { value: number | null }) {
  const state = batteryState(value);
  const color = value == null ? '#00000010' : value < 11.8 ? '#dc262633' : value >= 13.5 ? '#16a34a33' : '#00000010';
  return (
    <View style={[styles.tile, { flexBasis: '48%', backgroundColor: color }]}> 
      <ThemedText style={styles.tileLabel}>Battery</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.tileValue}>{value == null ? '--' : value.toFixed(1)}</ThemedText>
      <ThemedText style={styles.tileUnit}>V {state}</ThemedText>
    </View>
  );
}

// Fuel economy estimation from MAF and speed
function estimateFuelLph(maf_gps: number | null) {
  if (maf_gps == null || maf_gps <= 0) return null;
  const afr = 14.7; // gasoline
  const fuel_gps = maf_gps / afr; // grams fuel per second
  const fuel_kgps = fuel_gps / 1000;
  const density = 0.745; // kg/L gasoline
  const fuel_lps = fuel_kgps / density;
  return fuel_lps * 3600; // L/h
}
function formatFe(hz: number) {
  // Use latest maf and speed from local state/logs if available
  // In this simplified view, omit exact units conversion and show placeholder until wired
  return '~';
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
