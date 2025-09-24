import React from 'react';

export type TelemetryState = {
  rpm: number | null;
  speed: number | null;
  coolant: number | null;
  map: number | null;
  iat: number | null;
  maf: number | null;
  throttle: number | null; // 0-100 %
  stft: number | null; // %
  ltft: number | null; // %
  batteryV: number | null;
  rateHz: number;
};

type TelemetryContextValue = TelemetryState & {
  setRpm: (v: number | null) => void;
  setSpeed: (v: number | null) => void;
  setCoolant: (v: number | null) => void;
  setMap: (v: number | null) => void;
  setIat: (v: number | null) => void;
  setMaf: (v: number | null) => void;
  setThrottle: (v: number | null) => void;
  setStft: (v: number | null) => void;
  setLtft: (v: number | null) => void;
  setBatteryV: (v: number | null) => void;
  setRateHz: (v: number) => void;
};

const TelemetryContext = React.createContext<TelemetryContextValue | null>(null);

export function useTelemetry() {
  const ctx = React.useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider');
  return ctx;
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [rpm, setRpm] = React.useState<number | null>(null);
  const [speed, setSpeed] = React.useState<number | null>(null);
  const [coolant, setCoolant] = React.useState<number | null>(null);
  const [map, setMap] = React.useState<number | null>(null);
  const [iat, setIat] = React.useState<number | null>(null);
  const [maf, setMaf] = React.useState<number | null>(null);
  const [throttle, setThrottle] = React.useState<number | null>(null);
  const [stft, setStft] = React.useState<number | null>(null);
  const [ltft, setLtft] = React.useState<number | null>(null);
  const [batteryV, setBatteryV] = React.useState<number | null>(null);
  const [rateHz, setRateHz] = React.useState<number>(0);

  const value: TelemetryContextValue = {
    rpm,
    speed,
    coolant,
    map,
    iat,
    maf,
    throttle,
    stft,
    ltft,
    batteryV,
    rateHz,
    setRpm,
    setSpeed,
    setCoolant,
    setMap,
    setIat,
    setMaf,
    setThrottle,
    setStft,
    setLtft,
    setBatteryV,
    setRateHz,
  };

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}
