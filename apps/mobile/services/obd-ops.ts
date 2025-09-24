import { parseElmLines, decodeMode06Records, extractCanIdFromRawLine, udsBuildReadDid, udsDecodeDid } from 'core-obd';
import { getTransport } from '@/services/obd-transport';

export type DiscoveredEcu = { id: string; name: string };

export async function discoverEcus(): Promise<DiscoveredEcu[]> {
  const t = getTransport();
  if (!t) return [];
  // Send broadcast 0100; responders will answer with 41 00 ... and CAN IDs like 7E8..7EF
  const lines = await t.send('0100');
  const ids = new Set<string>();
  for (const raw of lines) {
    const id = extractCanIdFromRawLine(raw);
    if (id) ids.add(id);
  }
  return Array.from(ids).map((id) => ({ id, name: labelForEcu(id) }));
}

function labelForEcu(id: string): string {
  const last = id.slice(-1).toUpperCase();
  if (id.toUpperCase().startsWith('7E')) {
    if (last === '0' || last === '8') return 'Engine';
    if (last === '1' || last === '9') return 'TCM';
    if (last === '2' || last === 'A') return 'ABS/ESP';
  }
  return `ECU ${id}`;
}

export type Mode06Item = ReturnType<typeof decodeMode06Records>[number];

export async function readMode06(): Promise<Mode06Item[]> {
  const t = getTransport();
  if (!t) return [];
  // Request all on-board monitor results – many ECUs respond to 0600
  const lines = await t.send('0600');
  const resps = parseElmLines(lines);
  // Find service 06
  const first = resps.find((r) => r.service === '06');
  if (!first) return [];
  return decodeMode06Records(first.data);
}

export type UdsSafeItem = { did: string; label: string; value: string };

export async function udsReadSafe(address: string): Promise<UdsSafeItem[]> {
  const t = getTransport();
  if (!t) return [];
  const dids = ['F190', 'F18C', 'F187'];
  // Set header to target ECU
  await t.send(`ATSH${address}`);
  const out: UdsSafeItem[] = [];
  for (const did of dids) {
    const cmd = udsBuildReadDid(did);
    const lines = await t.send(cmd);
  const resps = parseElmLines(lines);
    // Positive UDS response is 0x62; service field will be '22' request, but parseElmLines maps OBD services. Fallback to raw bytes
    const raw = resps[0];
    if (!raw) continue;
    // Try to detect UDS: first byte likely 0x62
    const b = raw.data;
    if (b.length >= 3 && b[0] === 0x62) {
      const didNum = (b[1] << 8) + b[2];
      const data = b.slice(3);
      const dec = udsDecodeDid(didNum, data);
      out.push({ did, label: dec.label, value: dec.value });
    }
  }
  // Restore broadcast header
  await t.send('ATSH7DF');
  return out;
}
