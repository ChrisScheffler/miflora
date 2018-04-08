'use strict';

const logDebug = require('debug')('miflora:device');

const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const MODE_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';

const REALTIME_FEATURE_BUFFER = {
	Enable: Buffer.from([0xA0, 0x1F]),
	Disable: Buffer.from([0xC0, 0x1F])
};

/**
 * Generic Mi Flora device
 * @see {@link MiFloraPot} MiFloraPot
 * @see {@link MiFloraMonitor} MiFloraMonitor
 */
class MiFloraDevice {

	/**
	 * @private
	 * @param {Peripheral} peripheral
	 */
	constructor(peripheral) {
		this._peripheral = peripheral;
		this._services = new Map();
		this.name = peripheral.advertisement.localName;
		this.address = peripheral.address.toLowerCase();
		this.lastDiscovery = new Date().getTime();
		this.lastRssi = 0;
		this.type = 'unknown';
		peripheral.on('connect', error => {
			if (error) {
				logDebug('error while connecting to device (%s): %s', this.address, error);
			} else {
				logDebug('connected to device (%s)', this.address);
			}
		});
		peripheral.on('disconnect', error => {
			if (error) {
				logDebug('error while disconnecting from device (%s): %s', this.address, error);
			} else {
				logDebug('disconnected from device (%s)', this.address);
			}
		});
	}

	/**
	 * Connects to the device
	 * @public
	 * @returns {Promise} Promise for connection process
	 */
	connect() {
		return new Promise((resolve, reject) => {
			if (this._peripheral.state === 'connected') {
				return resolve();
			}
			this._peripheral.once('connect', async () => {
				try {
					return resolve(await this.getRssi());
				} catch (error) {
					return reject(error);
				}
			});
			logDebug('initiating connection with device (%s)', this.address);
			this._peripheral.connect();
		});
	}

	/**
	 * Disconnects from the device
	 * @public
	 * @returns {Promise} Promise for disconnection process
	 */
	disconnect() {
		return new Promise((resolve, reject) => {
			if (this._peripheral.state === 'disconnected') {
				return resolve();
			}
			this._peripheral.once('disconnect', async () => {
				try {
					return resolve();
				} catch (error) {
					return reject(error);
				}
			});
			logDebug('closing connection with device (%s)', this.address);
			this._peripheral.disconnect();
		});
	}

	/**
	 * Updates RSSI information for the device
	 * @public
	 * @returns {Promise} Promise for RSSI update process
	 */
	getRssi() {
		return new Promise((resolve, reject) => {
			logDebug('refreshing rssi for device (%s)', this.address);
			this._peripheral.updateRssi((error, rssi) => {
				if (error) {
					return reject(error);
				}
				this.lastRssi = rssi;
				return resolve(rssi);
			});
		});
	}

	queryFirmwareInfo() {
		return new Promise(async (resolve, reject) => {
			logDebug('querying firmware information from device (%s)', this.address);
			try {
				const data = await this._readCharacteristic(DATA_SERVICE_UUID, FIRMWARE_CHARACTERISTIC_UUID);
				const firmwareInfo = {
					battery: data.readUInt8(0),
					firmware: data.toString('ascii', 2, data.length)
				};
				logDebug('successfully queried firmware information from device (%s)', this.address);
				resolve(firmwareInfo);
			} catch (err) {
				reject(err);
			}
		});
	}

	querySensorInfo() {
		return new Promise(async (resolve, reject) => {
			logDebug('querying sensor values from device (%s)', this.address);
			try {
				await this._setRealtimeDataMode(true);
				const data = await this._readCharacteristic(DATA_SERVICE_UUID, DATA_CHARACTERISTIC_UUID);
				const realtimeData = {
					temperature: data.readUInt16LE(0) / 10,
					lux: data.readUInt32LE(3),
					moisture: data.readUInt8(7),
					fertility: data.readUInt16LE(8)
				};
				logDebug('successfully queried firmware information (%s) from device (%s)', realtimeData, this.address);
				return resolve(realtimeData);
			} catch (error) {
				return reject(error);
			}
		});
	}

	_setRealtimeDataMode(enable) {
		return new Promise(async (resolve, reject) => {
			try {
				logDebug('%s realtime data on device (%s)', enable ? "enabling" : "disabling", this.address);
				const buffer = enable ? REALTIME_FEATURE_BUFFER.Enable : REALTIME_FEATURE_BUFFER.Disable;
				await this._writeCharacteristic(DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID, buffer);
				const data = await this._readCharacteristic(DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID);
				if (data.equals(buffer)) {
					logDebug('successfully %s realtime data on device (%s)', enable ? "enabled" : "disabled", this.address);
					return resolve(data);
				}
				return reject(new Error('error enableing realtime data'));
			} catch (err) {
				return reject(err);
			}
		});
	}

	_resolveCharacteristic(serviceUuid, characteristicUuid) {
		return new Promise(async (resolve, reject) => {
			try {
				if (this._peripheral.state != 'connected') {
					await this.connect();
				}
				logDebug('resolving characteristic %s:%s on device (%s)', serviceUuid, characteristicUuid, this.address);
				this._peripheral.discoverSomeServicesAndCharacteristics([serviceUuid], [characteristicUuid], (error, services, characteristics) => {
					if (error) {
						return reject(error);
					}
					if (characteristics && characteristics.length > 0) {
						logDebug('successfully resolved characteristic %s:%s on device (%s)', serviceUuid, characteristicUuid, this.address);
						return resolve(characteristics[0]);
					}
					reject(new Error('characteristic not found: ' + characteristicUuid));
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	_readCharacteristic(serviceUuid, characteristicUuid) {
		return new Promise(async (resolve, reject) => {
			try {
				if (this._peripheral.state != 'connected') {
					await this.connect();
				}
				logDebug('reading characteristic %s:%s on device (%s)', serviceUuid, characteristicUuid, this.address);
				const char = await this._resolveCharacteristic(serviceUuid, characteristicUuid);
				char.read((error, data) => {
					if (error) {
						return reject(error);
					}
					logDebug('successfully read value \'0x%s\' from characteristic %s:%s on device (%s)', data.toString('hex'), serviceUuid, characteristicUuid, this.address);
					return resolve(data);
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	_writeCharacteristic(serviceUuid, characteristicUuid, data) {
		return new Promise(async (resolve, reject) => {
			try {
				if (this._peripheral.state != 'connected') {
					await this.connect();
				}
				logDebug('writing value \'0x%s\' to characteristic %s:%s on device (%s)', data.toString('hex'), serviceUuid, characteristicUuid, this.address);
				const char = await this._resolveCharacteristic(serviceUuid, characteristicUuid);
				char.write(data, true, error => {
					if (error) {
						return reject(error);
					}
					logDebug('successfully wrote value \'0x%s\' to characteristic %s:%s on device (%s)', data.toString('hex'), serviceUuid, characteristicUuid, this.address);
					return resolve();
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
     * Factory method to create an instance from given Peripheral.
     * @private
     * @static
     * @param {Peripheral} peripheral
     */
	static from(peripheral) {
		if (peripheral && peripheral.advertisement && peripheral.advertisement.serviceData) {
			const dataItem = peripheral.advertisement.serviceData.find(item => item.uuid === 'fe95');
			if (dataItem) {
				const productId = dataItem.data.readUInt16LE(2);
				switch (productId) {
					case 152:
						return new MiFloraMonitor(peripheral);
					case 349:
						return new MiFloraPot(peripheral);
					default:
						return new MiFloraDevice(peripheral);
				}
			}
		}
		throw new Error('unknown device encountered: ' + peripheral);
	}
}
/**
 * Extension of MiFloraDevice representing a Mi Flora Pot device
 * @private
 * @extends MiFloraDevice
 */
class MiFloraPot extends MiFloraDevice {
	constructor(peripheral) {
		super(peripheral);
		this.type = 'FloraPot';
	}
}

/**
 * Extension of MiFloraDevice representing a Mi Flora Monitor device
 * @private
 * @extends MiFloraDevice
 */
class MiFloraMonitor extends MiFloraDevice {
	constructor(peripheral) {
		super(peripheral);
		this.type = 'FloraMonitor';
	}
}

module.exports = MiFloraDevice;
