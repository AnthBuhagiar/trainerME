// Just the parts of Web Bluetooth (and remembered devices) and Screen Wake Lock the ride player uses.
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
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  /** Chrome: start listening for this device's advertisements (fires "advertisementreceived"). */
  watchAdvertisements?(): Promise<void>;
  /** Chrome: drop the site's permission for this device. */
  forget?(): Promise<void>;
}
interface Bluetooth {
  requestDevice(options: { filters: { services: number[]; name?: string }[]; optionalServices?: number[] }): Promise<BluetoothDevice>;
  /** Chrome: devices this site was given permission for earlier. */
  getDevices?(): Promise<BluetoothDevice[]>;
}
interface Navigator {
  bluetooth?: Bluetooth;
}
