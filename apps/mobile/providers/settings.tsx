import React from 'react';

export type TempUnit = 'C' | 'F';
export type SpeedUnit = 'kmh' | 'mph';
export type PressureUnit = 'kPa' | 'psi';
export type Preset = 'Basic' | 'Performance' | 'Diagnostics';
export type ThemePref = 'system' | 'light' | 'dark';

export type SettingsState = {
  units: { temp: TempUnit; speed: SpeedUnit; pressure: PressureUnit };
  polling: { rateHz: number; preset: Preset };
  connection: {
    autoReconnect: boolean;
    rememberLast: boolean;
    preferClassicAndroid?: boolean;
    wifiHost?: string;
    wifiPort?: number;
    bleServiceUuid?: string;
    bleWriteUuid?: string;
    bleNotifyUuid?: string;
  };
  safety: { warnLowBatt: boolean; blockClearWhenRunning: boolean };
  theme: ThemePref;
  developer: { showRawElm: boolean };
  dashboard?: {
    theme: 'default' | 'performance' | 'eco';
    showSparklines: boolean;
    cards: {
      rpm: boolean; speed: boolean; coolant: boolean; map: boolean; iat: boolean; maf: boolean; battery: boolean; boost: boolean;
    };
  };
  accessibility?: { largeFont: boolean; announceDtcVoice: boolean };
};

export const DEFAULT_SETTINGS: SettingsState = {
  units: { temp: 'C', speed: 'kmh', pressure: 'kPa' },
  polling: { rateHz: 2, preset: 'Basic' },
  connection: {
    autoReconnect: true,
    rememberLast: true,
    preferClassicAndroid: false,
    wifiHost: '192.168.0.10',
    wifiPort: 35000,
    bleServiceUuid: '',
    bleWriteUuid: '',
    bleNotifyUuid: ''
  },
  safety: { warnLowBatt: true, blockClearWhenRunning: true },
  theme: 'system',
  developer: { showRawElm: false },
  dashboard: {
    theme: 'default',
    showSparklines: true,
    cards: { rpm: true, speed: true, coolant: true, map: false, iat: false, maf: false, battery: true, boost: false },
  },
  accessibility: { largeFont: false, announceDtcVoice: false },
};

type SettingsContextValue = {
  settings: SettingsState;
  save: (next: SettingsState) => Promise<void>;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
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

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const storage = useOptionalAsyncStorage();
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!storage) return;
        const raw = await storage.getItem('settings');
        if (raw && mounted) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {}
    })();
    return () => { mounted = false; };
  }, [storage]);

  const save = React.useCallback(async (next: SettingsState) => {
    setSettings(next);
    try {
      if (storage) await storage.setItem('settings', JSON.stringify(next));
    } catch {}
  }, [storage]);

  return (
    <SettingsContext.Provider value={{ settings, save }}>
      {children}
    </SettingsContext.Provider>
  );
}
