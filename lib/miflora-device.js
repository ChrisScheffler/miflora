'use strict';

const debug = require('debug');

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
		this._service = undefined;
		this._firmwareCharacteristic = undefined;
		this._modeCharacteristic = undefined;
		this._dataCharacteristic = undefined;
		this.name = peripheral.advertisement.localName;
		this.address = MiFloraDevice.normaliseAddress(peripheral.address);
		this.lastDiscovery = new Date().getTime();
		this.isConnected = false;
		this.type = type ? type : 'unknown';
		this.responseTemplate = {
			address: this.address,
			type: this.type
		};
		this.logDebug = debug('miflora:' + this.address);
		peripheral.on('connect', error => {
			if (error) {
				this.logDebug('[%s] error while connecting to device: %s', this.address, error);
			} else {
				this.logDebug('[%s] connected', this.address);
				this.isConnected = true;
			}
		});
		peripheral.on('disconnect', error => {
			if (error) {
				this.logDebug('[%s] error while disconnecting: %s', this.address, error);
			} else {
				this.logDebug('[%s] disconnected', this.address);
				this.isConnected = false;
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
			if (this._peripheral.state === 'connected') {
				return resolve();
			}
			this._peripheral.once('connect', async () => {
				try {
					await this._resolveCharacteristics();
					return resolve();
				} catch (error) {
					return reject(error);
				}
			});
			this.logDebug('[%s] initiating connection', this.address);
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
			this.logDebug('[%s] closing connection', this.address);
			this._peripheral.disconnect();
		});
	}

	queryFirmwareInfo(plain = false) {
		return timeout(10000, async (resolve, reject) => {
			this.logDebug('[%s] querying firmware information', this.address);
			try {
				const data = await this._readCharacteristic(this._firmwareCharacteristic);
				const response = this.responseTemplate;
				response.firmwareInfo = {
					battery: data.readUInt8(0),
					firmware: data.toString('ascii', 2, data.length)
				};
				this.logDebug('[%s] successfully queried firmware information: %o', this.address, response.firmwareInfo);
				resolve(plain ? response.firmwareInfo : response);
			} catch (err) {
				reject(err);
			}
		});
	}

	querySensorValues(plain = false) {
		return timeout(10000, async (resolve, reject) => {
			this.logDebug('[%s] querying sensor values', this.address);
			try {
				await this._setRealtimeDataMode(true);
				const data = await this._readCharacteristic(this._dataCharacteristic);
				const response = this.responseTemplate;
				response.sensorValues = {
					temperature: data.readUInt16LE(0) / 10,
					lux: data.readUInt32LE(3),
					moisture: data.readUInt8(7),
					fertility: data.readUInt16LE(8)
				};
				this.logDebug('[%s] successfully queried sensor values: %o', this.address, response.sensorValues);
				return resolve(plain ? response.sensorValues : response);
			} catch (error) {
				return reject(error);
			}
		});
	}

	querySerial(plain = false) {
		return timeout(10000, async (resolve, reject) => {
			this.logDebug('[%s] querying serial number', this.address);
			try {
				await this._setSerialMode();
				const data = await this._readCharacteristic(this._dataCharacteristic);
				const response = this.responseTemplate;
				response.serial = data.toString('hex');
				this.logDebug('[%s] successfully queried serial: %s', this.address, response.serial);
				return resolve(plain ? response.serial : response);
			} catch (error) {
				return reject(error);
			}
		});
	}

	query() {
		return timeout(10000, async (resolve, reject) => {
			this.logDebug('[%s] querying multiple information', this.address);
			try {
				const result = this.responseTemplate;
				result.firmwareInfo = await this.queryFirmwareInfo(true);
				result.sensorValues = await this.querySensorValues(true);
				this.logDebug('[%s] successfully queried multiple information', this.address);
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
				this.logDebug('[%s] changing device mode', this.address);
				await this._writeCharacteristic(this._modeCharacteristic, buffer);
				const data = await this._readCharacteristic(this._modeCharacteristic);
				if (data.equals(buffer)) {
					this.logDebug('[%s] successfully changed device mode', this.address);
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
				this.logDebug('[%s] enabling serial mode', this.address);
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
				this.logDebug('[%s] %s realtime data mode', this.address, (enable ? 'enabling' : 'disabling'));
				const buffer = enable ? MODE_BUFFER_REALTIME.Enable : MODE_BUFFER_REALTIME.Disable;
				return resolve(await this._setDeviceMode(buffer));
			} catch (err) {
				return reject(err);
			}
		});
	}

	_resolveCharacteristics() {
		return timeout(10004, async (resolve, reject) => {
			try {
				await this.connect();
				this.logDebug('[%s] resolving characteristic', this.address);
				this._peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
					if (error) {
						return reject(error);
					}
					this.logDebug('[%s] successfully resolved characteristics (%d/%d)', this.address, services.length, characteristics.length);
					this._service = this._peripheral.services.find(entry => entry.uuid === UUID_SERVICE_DATA);
					this._firmwareCharacteristic = this._service.characteristics.find(entry => entry.uuid === UUID_CHARACTERISTIC_FIRMWARE);
					this._modeCharacteristic = this._service.characteristics.find(entry => entry.uuid === UUID_CHARACTERISTIC_MODE);
					this._dataCharacteristic = this._service.characteristics.find(entry => entry.uuid === UUID_CHARACTERISTIC_DATA);
					this.resolved = true;
					return resolve();
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * @private
	 */
	_readCharacteristic(characteristic) {
		return timeout(10000, async (resolve, reject) => {
			try {
				if (!this.isConnected) {
					await this.connect();
				}
				characteristic.read((error, data) => {
					if (error) {
						return reject(error);
					}
					this.logDebug('[%s] successfully read value \'0x%s\' from characteristic %s', this.address, data.toString('hex'), characteristic);
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
	_writeCharacteristic(characteristic, data) {
		return timeout(10000, async (resolve, reject) => {
			try {
				if (!this.isConnected) {
					await this.connect();
				}
				characteristic.write(data, false, error => {
					if (error) {
						return reject(error);
					}
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
				}
			}
		}
	}

	static normaliseAddress(address) {
		return address.replace(/-/g, ':').toLowerCase();
	}
}

module.exports = MiFloraDevice;
