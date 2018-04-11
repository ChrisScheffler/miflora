'use strict';

const logDebug = require('debug')('miflora:device');

const UUID_SERVICE_XIAOMI = 'fe95';
const UUID_SERVICE_DATA = '0000120400001000800000805f9b34fb';
const UUID_CHARACTERISTIC_MODE = '00001a0000001000800000805f9b34fb';
const UUID_CHARACTERISTIC_DATA = '00001a0100001000800000805f9b34fb';
const UUID_CHARACTERISTIC_FIRMWARE = '00001a0200001000800000805f9b34fb';

const MODE_BUFFER_SERIAL = Buffer.from('b0ff', 'hex');
const MODE_BUFFER_REALTIME = {
	Enable: Buffer.from('a01f', 'hex'),
	Disable: Buffer.from('c01f', 'hex')
};

const timeout = (timeout, promiseFuncs) => {
	const promises = [new Promise(promiseFuncs)];
	if (timeout > 0) {
		promises.push(
			new Promise((resolve, reject) => {
				setTimeout(() => {
					return reject(new Error('timeout'));
				}, timeout);
			})
		);
	}
	return Promise.race(promises);
};

/**
 * Represents a Mi Flora device
 * @public
 */
class MiFloraDevice {
	/**
	 * @private
	 * @param {Peripheral} peripheral
	 */
	constructor(peripheral, type) {
		this._peripheral = peripheral;
		this.name = peripheral.advertisement.localName;
		this.address = peripheral.address.toLowerCase();
		this.lastDiscovery = new Date().getTime();
		this.type = type ? type : 'unknown';
		this.responseTemplate = {
			address: this.address,
			type: this.type
		};
		peripheral.on('connect', error => {
			if (error) {
				logDebug('[%s] error while connecting to device: %s', this.address, error);
			} else {
				logDebug('[%s] connected', this.address);
			}
		});
		peripheral.on('disconnect', error => {
			if (error) {
				logDebug('[%s] error while disconnecting: %s', this.address, error);
			} else {
				logDebug('[%s] disconnected', this.address);
			}
		});
	}

	/**
	 * Connects to the device
	 * @public
	 * @returns {Promise} Promise for connection process
	 */
	connect() {
		return timeout(10000, (resolve, reject) => {
			logDebug('[%s] initiating connection', this.address);
			if (this._peripheral.state === 'connected') {
				return resolve();
			}
			this._peripheral.once('connect', async () => {
				try {
					return resolve();
				} catch (error) {
					return reject(error);
				}
			});
			this._peripheral.connect();
		});
	}

	/**
	 * Disconnects from the device
	 * @public
	 * @returns {Promise} Promise for disconnection process
	 */
	disconnect() {
		return timeout(10000, (resolve, reject) => {
			logDebug('[%s] closing connection', this.address);
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
			this._peripheral.disconnect();
		});
	}

	queryFirmwareInfo(plain = false) {
		return timeout(10000, async (resolve, reject) => {
			logDebug('[%s] querying firmware information', this.address);
			try {
				const data = await this._readCharacteristic([UUID_SERVICE_DATA], [UUID_CHARACTERISTIC_FIRMWARE]);
				const response = this.responseTemplate;
				response.firmwareInfo = {
					battery: data.readUInt8(0),
					firmware: data.toString('ascii', 2, data.length)
				};
				logDebug('[%s] successfully queried firmware information: %o', this.address, response.firmwareInfo);
				resolve(plain ? response.firmwareInfo : response);
			} catch (err) {
				reject(err);
			}
		});
	}

	querySensorValues(plain = false) {
		return timeout(10000, async (resolve, reject) => {
			logDebug('[%s] querying sensor values', this.address);
			try {
				await this._setRealtimeDataMode(true);
				const data = await this._readCharacteristic([UUID_SERVICE_DATA], [UUID_CHARACTERISTIC_DATA]);
				const response = this.responseTemplate;
				response.sensorValues = {
					temperature: data.readUInt16LE(0) / 10,
					lux: data.readUInt32LE(3),
					moisture: data.readUInt8(7),
					fertility: data.readUInt16LE(8)
				};
				logDebug('[%s] successfully queried sensor values: %o', this.address, response.sensorValues);
				return resolve(plain ? response.sensorValues : response);
			} catch (error) {
				return reject(error);
			}
		});
	}

	querySerial(plain = false) {
		return timeout(10000, async (resolve, reject) => {
			logDebug('[%s] querying serial number', this.address);
			try {
				await this._setSerialMode();
				const data = await this._readCharacteristic([UUID_SERVICE_DATA], [UUID_CHARACTERISTIC_DATA]);
				const response = this.responseTemplate;
				response.serial = data.toString('hex');
				logDebug('[%s] successfully queried serial: %s', this.address, response.serial);
				return resolve(plain ? response.serial : response);
			} catch (error) {
				return reject(error);
			}
		});
	}

	query() {
		return timeout(10000, async (resolve, reject) => {
			logDebug('[%s] querying multiple information', this.address);
			try {
				const result = this.responseTemplate;
				result.firmwareInfo = await this.queryFirmwareInfo(true);
				result.sensorValues = await this.querySensorValues(true);
				logDebug('[%s] successfully queried multiple information', this.address);
				return resolve(result);
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * @private
	 * @param {ByteBuffer} buffer Bytes to write
	 */
	_setDeviceMode(buffer) {
		return timeout(10000, async (resolve, reject) => {
			try {
				logDebug('[%s] changing device mode', this.address);
				await this._writeCharacteristic([UUID_SERVICE_DATA], [UUID_CHARACTERISTIC_MODE], buffer);
				const data = await this._readCharacteristic([UUID_SERVICE_DATA], [UUID_CHARACTERISTIC_MODE]);
				if (data.equals(buffer)) {
					logDebug('[%s] successfully changed device mode', this.address);
					return resolve(data);
				}
				return reject(new Error('failed to change mode'));
			} catch (err) {
				return reject(err);
			}
		});
	}

	/**
	 * @private
	 */
	_setSerialMode() {
		return timeout(10000, async (resolve, reject) => {
			try {
				logDebug('[%s] enabling serial mode', this.address);
				const buffer = MODE_BUFFER_SERIAL;
				return resolve(await this._setDeviceMode(buffer));
			} catch (err) {
				return reject(err);
			}
		});
	}

	/**
	 * @private
	 */
	_setRealtimeDataMode(enable) {
		return timeout(10000, async (resolve, reject) => {
			try {
				logDebug('[%s] %s realtime data mode', this.address, (enable ? 'enabling' : 'disabling'));
				const buffer = enable ? MODE_BUFFER_REALTIME.Enable : MODE_BUFFER_REALTIME.Disable;
				return resolve(await this._setDeviceMode(buffer));
			} catch (err) {
				return reject(err);
			}
		});
	}

	/**
	 * @private
	 */
	_resolveCharacteristic(serviceUuid, characteristicUuid) {
		return timeout(10000, async (resolve, reject) => {
			try {
				await this.connect();
				logDebug('[%s] resolving characteristic %s:%s', this.address, serviceUuid, characteristicUuid);
				this._peripheral.discoverSomeServicesAndCharacteristics(serviceUuid, characteristicUuid, (error, services, characteristics) => {
					if (error) {
						return reject(error);
					}
					if (characteristics && characteristics.length > 0) {
						logDebug('[%s] successfully resolved characteristic %s:%s', this.address, serviceUuid, characteristicUuid);
						return resolve(characteristics[0]);
					}
					reject(new Error('characteristic not found: ' + characteristicUuid));
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * @private
	 */
	_readCharacteristic(serviceUuid, characteristicUuid) {
		return timeout(10000, async (resolve, reject) => {
			try {
				const char = await this._resolveCharacteristic(serviceUuid, characteristicUuid);
				logDebug('[%s] reading characteristic %s:%s', this.address, serviceUuid, characteristicUuid);
				char.read((error, data) => {
					if (error) {
						return reject(error);
					}
					logDebug('[%s] successfully read value \'0x%s\' from characteristic %s:%s', this.address, data.toString('hex'), serviceUuid, characteristicUuid);
					return resolve(data);
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * @private
	 */
	_writeCharacteristic(serviceUuid, characteristicUuid, data) {
		return timeout(10000, async (resolve, reject) => {
			try {
				const char = await this._resolveCharacteristic(serviceUuid, characteristicUuid);
				logDebug('[%s] writing value \'0x%s\' to characteristic %s:%s', this.address, data.toString('hex'), serviceUuid, characteristicUuid);
				char.write(data, false, error => {
					if (error) {
						return reject(error);
					}
					logDebug('[%s] successfully wrote value \'0x%s\' to characteristic %s:%s', this.address, data.toString('hex'), serviceUuid, characteristicUuid);
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
			const dataItem = peripheral.advertisement.serviceData.find(item => item.uuid === UUID_SERVICE_XIAOMI);
			if (dataItem) {
				const productId = dataItem.data.readUInt16LE(2);
				switch (productId) {
					case 152:
						return new MiFloraDevice(peripheral, 'MiFloraMonitor');
					case 349:
						return new MiFloraDevice(peripheral, 'MiFloraPot');
					default:
						logDebug('found a device with unknown type (%d)', productId);
				}
			}
		}
	}
}

module.exports = MiFloraDevice;
