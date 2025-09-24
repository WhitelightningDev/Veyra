import React from 'react';

export type ClearedEntry = { ts: number; codes: string[] };
export type LastTripMeta = { id: string; startedAt: number; endedAt?: number; samples?: number };

type HistoryState = {
  cleared: ClearedEntry[];
  lastTrip?: LastTripMeta;
};

type HistoryContextValue = HistoryState & {
  addCleared: (codes: string[]) => Promise<void>;
  setLastTrip: (meta: LastTripMeta) => Promise<void>;
};

const HistoryContext = React.createContext<HistoryContextValue | null>(null);

export function useHistory() {
  const ctx = React.useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [cleared, setCleared] = React.useState<ClearedEntry[]>([]);
  const [lastTrip, setLastTripState] = React.useState<LastTripMeta | undefined>(undefined);

  React.useEffect(() => {
    (async () => {
      try {
        const Storage = require('@react-native-async-storage/async-storage');
        const raw = await Storage.getItem('history');
        if (raw) {
          const h = JSON.parse(raw) as HistoryState;
          setCleared(h.cleared ?? []);
          setLastTripState(h.lastTrip);
        }
      } catch {}
    })();
  }, []);

  async function persist(next: HistoryState) {
    try {
      const Storage = require('@react-native-async-storage/async-storage');
      await Storage.setItem('history', JSON.stringify(next));
    } catch {}
  }

  async function addCleared(codes: string[]) {
    const entry: ClearedEntry = { ts: Date.now(), codes };
    const next = [entry, ...cleared].slice(0, 5);
    setCleared(next);
    await persist({ cleared: next, lastTrip });
  }

  async function setLastTrip(meta: LastTripMeta) {
    setLastTripState(meta);
    await persist({ cleared, lastTrip: meta });
  }

  return (
    <HistoryContext.Provider value={{ cleared, lastTrip, addCleared, setLastTrip }}>
      {children}
    </HistoryContext.Provider>
  );
}

