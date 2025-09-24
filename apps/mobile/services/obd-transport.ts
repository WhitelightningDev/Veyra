// transport interface; actual type imported by consumers when needed

export interface ObdTransport {
  // Send a hex request like '010C' and return raw ASCII lines from the adapter
  send(cmd: string): Promise<string[]>;
}

let _transport: ObdTransport | null = null;

export function setTransport(t: ObdTransport) { _transport = t; }
export function getTransport() { return _transport; }
