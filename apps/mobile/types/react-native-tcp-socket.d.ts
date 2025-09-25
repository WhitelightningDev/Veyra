declare module 'react-native-tcp-socket' {
  interface ConnectionOptions { host: string; port: number; tls?: boolean }
  type Socket = {
    write(data: string | Uint8Array, encoding?: string): void;
    on(event: 'data', handler: (data: any) => void): void;
    on(event: 'error', handler: (err: any) => void): void;
    on(event: 'close', handler: () => void): void;
    destroy(): void;
  };
  const TcpSocket: { createConnection(opts: ConnectionOptions, onConnect?: () => void): Socket };
  export default TcpSocket;
}

