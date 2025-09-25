function getTcp() {
  try { return require('react-native-tcp-socket').default || require('react-native-tcp-socket'); } catch { return null; }
}

export class WifiElmTransport {
  private socket: any;
  private buffer = '';
  private connected = false;

  async connect(host = '192.168.0.10', port = 35000) {
    const TcpSocket: any = getTcp();
    if (!TcpSocket) throw new Error('TCP module unavailable');
    await new Promise<void>((resolve, reject) => {
      this.socket = TcpSocket.createConnection({ host, port, tls: false }, () => {
        this.connected = true;
        resolve();
      });
      this.socket.on('data', (data: Buffer) => {
        this.buffer += data.toString('ascii');
      });
      this.socket.on('error', (err: any) => {
        if (!this.connected) reject(err);
      });
      this.socket.on('close', () => { this.connected = false; });
    });
  }

  async disconnect() {
    try { this.socket?.destroy(); } catch {}
    this.connected = false;
    this.buffer = '';
  }

  private async write(cmd: string) {
    if (!this.connected) throw new Error('Not connected');
    this.socket.write(cmd + '\r', 'ascii');
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
