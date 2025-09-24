export type DtcSeverity = 'Info' | 'Warning' | 'Critical';

export type DtcEntry = {
  code: string;
  short: string;
  description: string;
  severity: DtcSeverity;
  causes: string[];
  symptoms: string[];
  quickChecks: string[];
};

export type RankedCause = { cause: string; score: number };

import { DTC_MERCEDES } from '@/constants/dtc-mercedes';

export const DTC_LIBRARY: Record<string, DtcEntry> = {
  P0101: {
    code: 'P0101',
    short: 'MAF Sensor Range/Performance',
    description:
      'The Mass Air Flow (MAF) sensor signal is outside the expected range. This can affect fuel delivery and engine performance.',
    severity: 'Warning',
    causes: ['MAF sensor', 'Vacuum leak', 'Air filter', 'Intake leaks', 'Wiring/connectors'],
    symptoms: ['Rough idle', 'Poor acceleration', 'Stalling', 'Reduced fuel economy'],
    quickChecks: ['Inspect air filter', 'Check for intake/vacuum leaks', 'Clean MAF sensor'],
  },
  P0300: {
    code: 'P0300',
    short: 'Random/Multiple Cylinder Misfire',
    description:
      'The engine control module detected random or multiple cylinder misfires. This can damage the catalytic converter if left unresolved.',
    severity: 'Critical',
    causes: ['Ignition coils', 'Spark plugs', 'Fuel pressure', 'Vacuum leak', 'Injector issues'],
    symptoms: ['Shaking/rough idle', 'Loss of power', 'Check Engine light flashing'],
    quickChecks: ['Check misfire counters', 'Inspect plugs/coils', 'Check fuel trims/pressure'],
  },
  P0420: {
    code: 'P0420',
    short: 'Catalyst Efficiency Below Threshold (Bank 1)',
    description:
      'The catalytic converter efficiency is below the calibrated threshold for Bank 1. Upstream/downstream O2 sensor comparison indicates poor conversion.',
    severity: 'Warning',
    causes: ['Catalytic converter', 'Exhaust leak', 'O2 sensors', 'Rich/lean condition'],
    symptoms: ['Reduced performance', 'Failed emissions test', 'Possible sulfur smell'],
    quickChecks: ['Check for exhaust leaks', 'Inspect O2 sensor activity', 'Verify fuel trims'],
  },
};

export function lookupDtc(code: string): DtcEntry {
  const key = code.toUpperCase();
  if (DTC_MERCEDES[key]) return DTC_MERCEDES[key];
  if (DTC_LIBRARY[key]) return DTC_LIBRARY[key];
  return {
    code: key,
    short: 'Unknown code',
    description: 'No local description found for this code.',
    severity: inferSeverity(key),
    causes: ['Unknown'],
    symptoms: [],
    quickChecks: [],
  };
}

function inferSeverity(code: string): DtcSeverity {
  // Simple heuristic: P03xx misfire -> Critical, P0xxx default Warning, others Info
  if (/^P03\d{2}$/i.test(code)) return 'Critical';
  if (/^P0\d{3}$/i.test(code)) return 'Warning';
  return 'Info';
}

export function rankLikelyCauses(codes: string[]): RankedCause[] {
  const tallies: Record<string, number> = {};
  for (const c of codes) {
    const e = lookupDtc(c);
    const weight = e.severity === 'Critical' ? 2 : e.severity === 'Warning' ? 1 : 0.5;
    for (const cause of e.causes) {
      tallies[cause] = (tallies[cause] ?? 0) + weight;
    }
  }
  return Object.entries(tallies)
    .map(([cause, score]) => ({ cause, score }))
    .sort((a, b) => b.score - a.score);
}
