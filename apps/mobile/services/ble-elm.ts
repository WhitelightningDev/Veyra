import { Platform } from 'react-native';
import { decode as b64decode, encode as b64encode } from 'base-64';

type BleManager = any;
type Device = any;
type Characteristic = any;

function getBle(): { BleManager: BleManager } | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-ble-plx');
  } catch {
    return null;
  }
}

export type Discovered = { id: string; name?: string | null };

export async function scanForElm(timeoutMs = 5000): Promise<Discovered[]> {
  const lib = getBle();
  if (!lib) return [];
  const manager = new lib.BleManager();
  const found = new Map<string, Discovered>();
  return new Promise((resolve) => {
    const sub = manager.onStateChange((state: string) => {
      if (state === 'PoweredOn') {
        sub.remove();
        manager.startDeviceScan(null, { allowDuplicates: false }, (error: any, device: Device) => {
          if (error) return;
          if (!device) return;
          const name = device.name || device.localName || device.id;
          if (name && /obd|elm|obdii|obd2/i.test(String(name))) {
            found.set(device.id, { id: device.id, name: device.name || device.localName });
          }
        });
        setTimeout(() => {
          manager.stopDeviceScan();
          resolve(Array.from(found.values()));
        }, timeoutMs);
      }
    }, true);
  });
}

export class BleElmTransport {
  private manager: BleManager;
  private device: Device | null = null;
  private tx: Characteristic | null = null;
  private rx: Characteristic | null = null;
  private buffer = '';

  constructor(manager?: BleManager) {
    const lib = getBle();
    if (!lib) throw new Error('BLE unavailable');
    this.manager = manager || new lib.BleManager();
  }

  async connect(deviceId: string) {
    const dev = await this.manager.connectToDevice(deviceId, { autoConnect: false });
    this.device = await dev.discoverAllServicesAndCharacteristics();
    // Try common Nordic UART service UUIDs
    const NUS = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
    const services = await this.device.services();
    for (const s of services) {
      const chars = await this.device!.characteristicsForService(s.uuid);
      for (const c of chars) {
        const uuid = String(c.uuid).toUpperCase();
        if (!this.tx && (c.isWritableWithResponse || c.isWritableWithoutResponse)) this.tx = c;
        if (!this.rx && c.isNotifiable) this.rx = c;
      }
    }
    if (!this.tx || !this.rx) throw new Error('UART characteristics not found');
    await this.rx.monitor((error: any, ch: any) => {
      if (error || !ch?.value) return;
      const ascii = b64decode(ch.value);
      this.buffer += ascii;
    });
  }

  async disconnect() {
    if (this.device) {
      try { await this.manager.cancelDeviceConnection(this.device.id); } catch {}
    }
    this.device = null; this.tx = null; this.rx = null; this.buffer = '';
  }

  private async write(cmd: string) {
    if (!this.tx) throw new Error('TX not ready');
    const data = b64encode(cmd + '\r');
    await this.tx.writeWithResponse(data);
  }

  async send(cmd: string, timeoutMs = 2000): Promise<string[]> {
    this.buffer = '';
    await this.write(cmd);
    const start = Date.now();
    return await new Promise((resolve, reject) => {
      const check = () => {
        if (this.buffer.includes('>')) {
          const raw = this.buffer;
          this.buffer = '';
          // split by CR/LF, remove prompt and empty
          const lines = raw.replace(/>/g, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          resolve(lines);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve(this.buffer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }
}
