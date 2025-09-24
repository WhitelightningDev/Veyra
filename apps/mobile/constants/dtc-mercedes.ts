import type { DtcEntry } from '@/constants/dtc';

// Minimal offline Mercedes-specific DTCs (examples)
export const DTC_MERCEDES: Record<string, DtcEntry> = {
  P13DF: {
    code: 'P13DF',
    short: 'AdBlue system malfunction',
    description: 'SCR/AdBlue system has detected a malfunction. Possible issues with dosing module, pump pressure, or NOx sensors.',
    severity: 'Warning',
    causes: ['AdBlue pump/pressure', 'Dosing module', 'NOx sensor', 'Wiring/connectors'],
    symptoms: ['Check AdBlue warning', 'Reduced power (limp mode)', 'Higher NOx emissions'],
    quickChecks: ['Check reductant level', 'Scan SCR faults', 'Verify pump pressure'],
  },
  P2463: {
    code: 'P2463',
    short: 'DPF soot accumulation',
    description: 'Diesel Particulate Filter has excessive soot loading. Regeneration incomplete or inhibited.',
    severity: 'Warning',
    causes: ['DPF clogged', 'Short trips / regen inhibited', 'Differential pressure sensor', 'Exhaust leaks'],
    symptoms: ['Reduced power', 'High backpressure', 'Regen requests'],
    quickChecks: ['Check DPF differential pressure', 'Inspect exhaust leaks', 'Verify regen history'],
  },
  P20E8: {
    code: 'P20E8',
    short: 'Reductant pressure too low',
    description: 'SCR reductant pressure below threshold. Check pump, lines, and leaks.',
    severity: 'Warning',
    causes: ['AdBlue pump', 'Leaks/lines', 'Crystallization', 'Relay/wiring'],
    symptoms: ['AdBlue warning', 'Reduced NOx conversion'],
    quickChecks: ['Measure pressure', 'Check lines for crystallization', 'Test pump actuation'],
  },
  P229F: {
    code: 'P229F',
    short: 'NOx sensor 2 Bank 1 range/performance',
    description: 'Downstream NOx sensor signal out of range. Could be sensor aging, wiring or SCR related issues.',
    severity: 'Warning',
    causes: ['NOx sensor downstream', 'Wiring/connectors', 'SCR efficiency issues'],
    symptoms: ['Emissions warning', 'Check engine light'],
    quickChecks: ['Check live NOx', 'Inspect wiring/connector', 'Check SCR efficiency'],
  },
  P2BA9: {
    code: 'P2BA9',
    short: 'NOx exceedance – insufficient deNOx',
    description: 'Exceedance of NOx limits. SCR system not reducing NOx sufficiently.',
    severity: 'Warning',
    causes: ['SCR catalyst', 'Ammonia slip', 'Dosing quantity', 'NOx sensors'],
    symptoms: ['Emissions warning', 'Possible derate'],
    quickChecks: ['Check SCR conversion', 'Verify dosing', 'Compare upstream/downstream NOx'],
  },
};

