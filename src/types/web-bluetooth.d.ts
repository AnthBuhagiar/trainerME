// Just the parts of Web Bluetooth and Screen Wake Lock the ride player uses.
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  writeValueWithResponse(value: Uint8Array): Promise<void>;
}
interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: number): Promise<BluetoothRemoteGATTCharacteristic>;
}
interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: number): Promise<BluetoothRemoteGATTService>;
}
interface BluetoothDevice extends EventTarget {
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}
interface Bluetooth {
  requestDevice(options: { filters: { services: number[] }[]; optionalServices?: number[] }): Promise<BluetoothDevice>;
}
interface Navigator {
  bluetooth?: Bluetooth;
}
