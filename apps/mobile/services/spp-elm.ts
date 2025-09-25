import { Platform } from 'react-native';
type BluetoothDevice = any;

function getSpp() {
  if (Platform.OS !== 'android') return null;
  try { return require('react-native-bluetooth-classic').default || require('react-native-bluetooth-classic'); } catch { return null; }
}

export type SppDiscovered = { id: string; name?: string | null };

export async function scanForSpp(timeoutMs = 6000): Promise<SppDiscovered[]> {
  if (Platform.OS !== 'android') return [];
  const out: Record<string, SppDiscovered> = {};
  const SPP = getSpp();
  if (!SPP) return [];
  try {
    const enabled = await SPP.isEnabled();
    if (!enabled) {
      try { await SPP.requestBluetoothEnabled(); } catch {}
    }
  } catch {}
  try {
    const bonded: BluetoothDevice[] = await SPP.getBondedDevices();
    bonded.forEach((d: BluetoothDevice) => { out[d.address] = { id: d.address, name: d.name }; });
  } catch {}
  try {
    const discovered: BluetoothDevice[] = await SPP.startDiscovery();
    discovered.forEach((d: BluetoothDevice) => { out[d.address] = { id: d.address, name: d.name }; });
    await SPP.cancelDiscovery();
  } catch {}
  return Object.values(out);
}

export class SppElmTransport {
  private device: BluetoothDevice | null = null;
  private buffer = '';

  async connect(address: string) {
    const SPP = getSpp();
    if (!SPP) throw new Error('SPP unavailable');
    await SPP.cancelDiscovery().catch(() => {});
    const device = await SPP.getDevice(address);
    if (!device) throw new Error('Device not found');
    const res = await device.connect({ delimiter: '\\r', CONNECTOR_TYPE: 'rfcomm' } as any);
    if (!res) throw new Error('SPP connect failed');
    this.device = device;
    device.onDataReceived((event: any) => {
      if (!event?.data) return;
      this.buffer += String(event.data);
    });
  }

  async disconnect() {
    if (this.device) {
      try { await this.device.disconnect(); } catch {}
    }
    this.device = null;
    this.buffer = '';
  }

  private async write(cmd: string) {
    if (!this.device) throw new Error('Not connected');
    await this.device.write(cmd + '\\r');
  }

  async send(cmd: string, timeoutMs = 2500): Promise<string[]> {
    this.buffer = '';
    await this.write(cmd);
    const start = Date.now();
    return await new Promise((resolve) => {
      const tick = () => {
        if (this.buffer.includes('>')) {
          const raw = this.buffer;
          this.buffer = '';
          const lines = raw.replace(/>/g, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          resolve(lines);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve(this.buffer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    });
  }
}
