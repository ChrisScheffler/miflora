'use strict';

const noble = require('@abandonware/noble');
const logDebug = require('debug')('miflora');
const MiFloraDevice = require('./miflora-device');

const getOpt = (options, value, def) => {
	return (options && typeof options[value] !== 'undefined') ? options[value] : def;
};

const intToHex = value => {
	const result = value.toString(16);
	return (result.length % 2 === 1) ? '0' + result : result;
};

const UUID_SERVICE_XIAOMI = 'fe95';

class MiFlora {
	constructor() {
		this._devices = {};
		noble.on('stateChange', state => {
			logDebug('adapter changed to to \'%s\'', state);
		});
		noble.on('scanStart', () => {
			logDebug('discovery started');
		});
		noble.on('scanStop', () => {
			logDebug('discovery finished');
		});
	}

	/**
	* Start the discovery process
	* @public
	* @param {object} options - Discovery options
	* @return {Promise} A Promise which resolves with an array of MiFloraDevice
	*/
	discover(options) {
		const optDuration = getOpt(options, 'duration', 10000);
		const optAddresses = getOpt(options, 'addresses', []);
		const optIgnoreUnknown = getOpt(options, 'ignoreUnknown', false);
		const clearDevices = getOpt(options, 'clearDevices', false);
		
		if (clearDevices) {
			this._devices = {};	
		}
		
		if (Number.isNaN(optDuration)) {
			throw new TypeError('argument [duration] must be a number');
		}

		if (!Array.isArray(optAddresses)) {
			throw new TypeError('argument [addresses] must be an array');
		}

		if (typeof optIgnoreUnknown !== typeof true) {
			throw new TypeError('argument [skipUnknown] must be of type boolean');
		}

		optAddresses.forEach((address, idx) => {
			optAddresses[idx] = MiFloraDevice.normaliseAddress(address);
		});

		return new Promise((resolve, reject) => {
			this._ensurePowerOnState().then(() => {
				this._startScan(optAddresses, optDuration, optIgnoreUnknown).then(() => {
					this._stopScan().then(() => {
						resolve(Object.values(this._devices));
					});
				}, error => {
					reject(error);
				});
			});
		});
	}

	/**
	* Returns a Promise which resolves when the adapter is ready
	* @private
	*/
	_ensurePowerOnState() {
		return new Promise(resolve => {
			if (noble.state === 'poweredOn') {
				resolve();
				return;
			}

			logDebug('waiting for adapter state change');
			noble.on('stateChange', state => {
				if (state === 'poweredOn') {
					resolve();
				}
			});
		});
	}

	/**
	* Returns true if all given addresses have been discovered
	* @private
	* @param {String[]} addresses
	*/
	_checkDiscovered(addresses) {
		let result = true;
		addresses.forEach(address => {
			result &= (this._devices[address] !== undefined);
		});
		return result;
	}

	/**
	* @private
	*/
	_startScan(addresses, duration, ignoreUnknown) {
		return new Promise((resolve, reject) => {
			logDebug('starting discovery with %sms duration', duration);
			if (addresses && addresses.length > 0) {
				logDebug('(discovery will be stopped when %o %s found)', addresses, addresses.length === 1 ? 'is' : 'are');
				if (this._checkDiscovered(addresses)) {
					resolve();
					return;
				}
			}

			const timeout = setTimeout(() => {
				logDebug('duration reached, stopping discovery');
				resolve();
			}, duration);

			noble.on('discover', peripheral => {
				let deviceAddress = peripheral.address;
				if (deviceAddress === '') {
					const serviceData = peripheral.advertisement.serviceData.find(item => item.uuid === UUID_SERVICE_XIAOMI);
					if (serviceData && serviceData.data && serviceData.data.length > 10) {
						for (let i = 10; i > 4; i--) {
							deviceAddress += intToHex(serviceData.data.readUInt8(i));
							if (i > 5) {
								deviceAddress += ':';
							}
						}

						logDebug('fixing peripheral with address %s', deviceAddress);
						peripheral.address = deviceAddress;
					} else {
						logDebug('skipping unknown advertisment %o', peripheral.advertisement);
						return;
					}
				}

				deviceAddress = MiFloraDevice.normaliseAddress(peripheral.address);
				if (ignoreUnknown && !addresses.find(addr => addr === deviceAddress)) {
					logDebug('ignoring device with address %s', deviceAddress);
					return;
				}

				const exisitingDevice = this._devices[deviceAddress];
				if (!exisitingDevice) {
					const newDevice = MiFloraDevice.from(peripheral);
					if (newDevice) {
						this._devices[deviceAddress] = newDevice;
						logDebug('discovered %s @ %s', newDevice.type, newDevice.address);
					}
				}

				if (addresses && addresses.length > 0 && this._checkDiscovered(addresses)) {
					logDebug('found all requested devices, stopping discovery');
					if (timeout) {
						clearTimeout(timeout);
					}

					resolve();
				}
			});

			noble.startScanning([UUID_SERVICE_XIAOMI], true, error => {
				if (error) {
					reject(error);
				}
			});
		});
	}

	/**
	* @private
	*/
	_stopScan() {
		return new Promise(resolve => {
			noble.stopScanning(() => {
				return resolve();
			});
		});
	}
}

module.exports = new MiFlora();
