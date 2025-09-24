// Core OBD helpers: request builders, ELM line parsing, PID & DTC decoders

export type ObdResponse = {
  service: string; // e.g. "01", "03", "09"
  pid?: string;    // e.g. "0C" for RPM when service === "01"
  data: number[];  // payload bytes after service(+pid)
  raw: string;     // original, cleaned ascii line(s)
};

// ------------------------------
// Request builders
// ------------------------------
export function reqMode01(pidHex: string): string {
  // Example: reqMode01("0C") -> "010C"
  return `01${pidHex.toUpperCase().padStart(2, "0")}`;
}
export function reqMode03(): string { return "03"; }
export function reqMode04(): string { return "04"; }
export function reqMode09(pidHex: string): string { return `09${pidHex.toUpperCase().padStart(2, "0")}`; }

// ------------------------------
// PID decoders (Mode 01)
// ------------------------------
export const pidDecoders: Record<string, (bytes: number[]) => Record<string, number>> = {
  // 010C – Engine RPM = ((A*256)+B)/4
  "010C": (d) => {
    const a = d[0] ?? 0;
    const b = d[1] ?? 0;
    return { rpm: ((a << 8) + b) / 4 };
  },
  // 010D – Vehicle Speed (km/h)
  "010D": (d) => ({ speed_kph: d[0] ?? 0 }),
  // 0105 – Coolant Temperature (°C) = A - 40
  "0105": (d) => ({ coolant_c: (d[0] ?? 0) - 40 }),
  // 0110 – MAF air flow rate (g/s) = ((A*256)+B)/100
  "0110": (d) => {
    const a = d[0] ?? 0;
    const b = d[1] ?? 0;
    return { maf_gps: ((a << 8) + b) / 100 };
  },
  // 010F – Intake Air Temperature (°C)
  "010F": (d) => ({ iat_c: (d[0] ?? 0) - 40 }),
  // 010B – Intake Manifold Absolute Pressure (kPa)
  "010B": (d) => ({ map_kpa: d[0] ?? 0 }),
  // 0111 – Throttle position (%) = A*100/255
  "0111": (d) => ({ throttle_pct: Math.round(((d[0] ?? 0) * 10000) / 255) / 100 }),
  // 0106 – Short Term Fuel Trim Bank 1 (%) = (A-128)*100/128
  "0106": (d) => ({ stft1_pct: Math.round((((d[0] ?? 0) - 128) * 10000) / 128) / 100 }),
  // 0107 – Long Term Fuel Trim Bank 1 (%) = (A-128)*100/128
  "0107": (d) => ({ ltft1_pct: Math.round((((d[0] ?? 0) - 128) * 10000) / 128) / 100 }),
};

export function decode(servicePid: string, dataBytes: number[]) {
  const fn = pidDecoders[servicePid.toUpperCase()];
  return fn ? fn(dataBytes) : { raw: dataBytes };
}

// ------------------------------
// DTC decoding (Mode 03 / 07 / 0A payload bytes after the service byte)
// ------------------------------
const DTC_LETTERS = ["P", "C", "B", "U"] as const;
export function decodeDtcs(bytes: number[]): string[] {
  // Each DTC is two bytes: A, B. 0x00 0x00 means no more codes.
  const out: string[] = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const A = bytes[i]!;
    const B = bytes[i + 1]!;
    if (A === 0x00 && B === 0x00) break;
    const typeIdx = (A & 0b11000000) >>> 6; // 0..3 -> P/C/B/U
    const letter = DTC_LETTERS[typeIdx] || "P";
    const d1 = (A & 0b00110000) >>> 4;    // first digit
    const d2 = (A & 0b00001111);          // second digit
    const d3 = (B & 0b11110000) >>> 4;    // third digit
    const d4 = (B & 0b00001111);          // fourth digit
    out.push(`${letter}${d1}${d2}${d3}${d4}`);
  }
  return out;
}

// ------------------------------
// VIN from Mode 09 PID 02 (best‑effort for single‑frame or joined frames)
// ------------------------------
export function decodeVinFromBytes(bytes: number[]): string {
  // Strategy: extract printable ASCII bytes (0x20..0x7E), join, then trim to 17 chars if present
  const ascii = bytes.filter(b => b >= 0x20 && b <= 0x7e).map(b => String.fromCharCode(b)).join("");
  // If a longer blob appears, return the first 17 as VIN‑like
  if (ascii.length >= 17) return ascii.slice(0, 17);
  return ascii;
}

// ------------------------------
// ELM327 line parsing
// ------------------------------
function cleanLine(line: string): string {
  return line
    .replace(/\r|\n/g, " ")
    .replace(/>/g, " ")
    .replace(/SEARCHING\.?/gi, " ")
    .replace(/BUS\s+INIT\.?/gi, " ")
    .replace(/STOPPED/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hexPairsFrom(line: string): string[] {
  // Handle ISO-TP prefixed lines like "07E8 10 14 41 0C 1A F8 ..." or "1: 49 02 ..."
  // 1) If there's a colon, keep the part after it (e.g. "1: 49 02 ...")
  // 2) Tokenize into hex pairs
  // 3) Drop everything before the first positive OBD response byte (0x40 + mode => 0x41,0x42,0x43,0x44,0x47,0x49,0x4A)
  const afterColon = line.includes(":") ? line.split(":").pop() || line : line;
  const tokens = (afterColon.match(/[0-9A-Fa-f]{2}/g) || []).map(t => t.toUpperCase());

  const isPositiveResp = (t: string) => t.length === 2 && t.charAt(0) === "4" && /^[0-9A-F]$/.test(t.charAt(1));
  const firstIdx = tokens.findIndex(isPositiveResp);
  return firstIdx >= 0 ? tokens.slice(firstIdx) : tokens;
}

function toBytes(hexPairs: string[]): number[] {
  return hexPairs.map(h => parseInt(h, 16)).filter(n => !Number.isNaN(n));
}

export function parseElmLines(lines: string[]): ObdResponse[] {
  // Accepts raw ascii lines read until ">" prompt. Returns parsed responses per usable line.
  const out: ObdResponse[] = [];

  for (const raw of lines) {
    const l = cleanLine(raw);
    if (!l) continue;
    const pairs = hexPairsFrom(l);
    if (pairs.length < 2) continue;
    const bytes = toBytes(pairs);
    if (bytes.length < 2) continue;

    // Positive response first byte usually = 0x40 + request mode
    // e.g. 0x41 -> Mode 01, 0x43 -> Mode 03, 0x49 -> Mode 09
    const resp = bytes[0]!;
    if (resp < 0x40) continue; // Not a positive response
    const service = (resp - 0x40).toString(16).toUpperCase().padStart(2, "0");

    if (service === "01" || service === "09") {
      if (bytes.length < 3) continue; // need service + pid + data
      const pid = bytes[1]!.toString(16).toUpperCase().padStart(2, "0");
      const data = bytes.slice(2);
      out.push({ service, pid, data, raw: l });
    } else {
      // Services like 03, 07, 0A (DTCs) have only service + data
      const data = bytes.slice(1);
      out.push({ service, data, raw: l });
    }
  }

  return out;
}

// ------------------------------
// Convenience helpers for common flows
// ------------------------------
export function tryDecodePidResponse(resp: ObdResponse): Record<string, unknown> | null {
  if (resp.service !== "01" || !resp.pid) return null;
  const key = `01${resp.pid}`;
  return decode(key, resp.data);
}

export function tryDecodeDtcResponse(resp: ObdResponse): string[] | null {
  if (resp.service !== "03" && resp.service !== "07" && resp.service !== "0A") return null;
  return decodeDtcs(resp.data);
}

export function tryDecodeVin(resp: ObdResponse): string | null {
  if (resp.service !== "09" || resp.pid !== "02") return null;
  return decodeVinFromBytes(resp.data);
}

// ------------------------------
// Readiness (Mode 01 PID 01) minimal decode
// ------------------------------
export type Readiness0101 = {
  milOn: boolean;
  dtcCount: number;
  ignitionType: "spark" | "compression";
  raw: number[];
};

export function decodeReadiness0101(bytes: number[]): Readiness0101 | null {
  if (bytes.length < 4) return null;
  const A = bytes[0]!;
  const B = bytes[1]!;
  // const C = bytes[2]!;
  // const D = bytes[3]!;
  const milOn = (A & 0x80) !== 0;
  const dtcCount = A & 0x7f;
  const ignitionType = (B & 0x08) !== 0 ? "compression" : "spark";
  return { milOn, dtcCount, ignitionType, raw: bytes.slice(0, 4) };
}

// ------------------------------
// Mode 06 (On-board monitoring) – simple record decode
// ------------------------------
export type Mode06Record = {
  tid: number; // Test ID
  cid: number; // Component ID
  value: number; // measured value (word)
  min: number; // min limit (word)
  max: number; // max limit (word)
  pass: boolean;
};

export function decodeMode06Records(bytes: number[]): Mode06Record[] {
  // Heuristic: many ECUs return repeating 8-byte groups: TID, CID, VAL(2B), MIN(2B), MAX(2B)
  const out: Mode06Record[] = [];
  for (let i = 0; i + 7 < bytes.length; i += 8) {
    const tid = bytes[i]!;
    const cid = bytes[i + 1]!;
    const value = (bytes[i + 2]! << 8) + bytes[i + 3]!;
    const min = (bytes[i + 4]! << 8) + bytes[i + 5]!;
    const max = (bytes[i + 6]! << 8) + bytes[i + 7]!;
    out.push({ tid, cid, value, min, max, pass: value >= min && value <= max });
  }
  return out;
}

// ------------------------------
// Helpers to extract CAN ID from ELM raw lines (best-effort)
// ------------------------------
export function extractCanIdFromRawLine(raw: string): string | null {
  const m = raw.trim().match(/^([0-9A-Fa-f]{3,4})\b/);
  if (!m) return null;
  const id = m[1]!.toUpperCase();
  // Typical response IDs 7E8..7EF, filter plausible IDs
  if (/^(7E[0-9A-F])$/.test(id) || /^[0-9A-F]{3}$/.test(id) || /^[0-9A-F]{4}$/.test(id)) return id;
  return null;
}

// ------------------------------
// UDS helpers (ReadDataByIdentifier 0x22) – minimal decoding
// ------------------------------
export type UdsDidResult = { did: number; label: string; value: string };

export function udsBuildReadDid(didHex: string): string {
  // e.g. didHex = 'F190' (VIN)
  return `22${didHex.toUpperCase()}`;
}

export function udsDecodeDid(did: number, data: number[]): UdsDidResult {
  const hex = did.toString(16).toUpperCase().padStart(4, "0");
  if (hex === "F190") {
    const val = data.map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "")).join("").trim();
    return { did, label: "VIN (UDS)", value: val };
  }
  if (hex === "F18C") {
    // Mileage/odometer (vendor specific). Interpret big-endian integer if plausible
    let v = 0;
    for (const b of data) v = (v << 8) + b;
    return { did, label: "Odometer", value: `${v} km` };
  }
  if (hex === "F187") {
    const s = data.map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "")).join("").trim();
    return { did, label: "ECU Serial", value: s };
  }
  return { did, label: `DID 0x${hex}`, value: data.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ") };
}
