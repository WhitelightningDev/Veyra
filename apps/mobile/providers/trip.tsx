import React from 'react';
import { useTelemetry } from '@/providers/telemetry';

export type TripSample = {
  t: number;
  rpm: number | null;
  speed: number | null; // km/h
  throttle: number | null; // %
  stft: number | null; // %
  ltft: number | null; // %
  maf: number | null; // g/s
};

export type TripSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  samples: TripSample[];
};

type TripContextValue = {
  active: boolean;
  current?: TripSession;
  trips: TripSession[];
  startTrip: () => void;
  stopTrip: () => void;
};

const TripContext = React.createContext<TripContextValue | null>(null);

export function useTrip() {
  const ctx = React.useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within TripProvider');
  return ctx;
}

export function TripProvider({ children }: { children: React.ReactNode }) {
  const t = useTelemetry();
  const [active, setActive] = React.useState(false);
  const [current, setCurrent] = React.useState<TripSession | undefined>(undefined);
  const [trips, setTrips] = React.useState<TripSession[]>([]);

  // Persist trips (best-effort)
  React.useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Storage = require('@react-native-async-storage/async-storage');
        const raw = await Storage.getItem('trips');
        if (raw) setTrips(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Storage = require('@react-native-async-storage/async-storage');
        await Storage.setItem('trips', JSON.stringify(trips));
      } catch {}
    })();
  }, [trips]);

  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setCurrent((cur) => {
        if (!cur) return cur;
        const sample: TripSample = {
          t: Date.now(),
          rpm: t.rpm,
          speed: t.speed,
          throttle: t.throttle,
          stft: t.stft,
          ltft: t.ltft,
          maf: t.maf,
        };
        return { ...cur, samples: [...cur.samples, sample] };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, t]);

  function startTrip() {
    setCurrent({ id: `trip_${Date.now().toString(36)}`, startedAt: Date.now(), samples: [] });
    setActive(true);
  }
  function stopTrip() {
    setActive(false);
    setCurrent((cur) => {
      if (!cur) return cur;
      const ended = { ...cur, endedAt: Date.now() };
      setTrips((prev) => [ended, ...prev].slice(0, 50));
      // store last trip meta for quick recall
      history.setLastTrip({ id: ended.id, startedAt: ended.startedAt, endedAt: ended.endedAt, samples: ended.samples.length });
      return undefined;
    });
  }

  return (
    <TripContext.Provider value={{ active, current, trips, startTrip, stopTrip }}>
      {children}
    </TripContext.Provider>
  );
}
  const { useHistory } = require('@/providers/history');
  const history = useHistory();
