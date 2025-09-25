declare module 'react-native-bluetooth-classic' {
  export type BluetoothDevice = {
    address: string;
    name?: string;
    connect(opts?: any): Promise<boolean>;
    disconnect(): Promise<void>;
    onDataReceived(listener: (event: { data: string }) => void): void;
    write(data: string, encoding?: string): Promise<boolean>;
  };
  const RNBluetoothClassic: {
    isEnabled(): Promise<boolean>;
    requestBluetoothEnabled(): Promise<boolean>;
    getBondedDevices(): Promise<BluetoothDevice[]>;
    startDiscovery(): Promise<BluetoothDevice[]>;
    cancelDiscovery(): Promise<void>;
    getDevice(address: string): Promise<BluetoothDevice | null>;
  };
  export default RNBluetoothClassic;
}

