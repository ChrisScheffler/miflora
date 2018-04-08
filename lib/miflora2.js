'use strict';

const noble = require('noble');
const logDebug = require('debug')('miflora');
const MiFloraDevice = require('./miflora-device.js');

const ROOT_SERVICE_UUID = 'fe95';

const getOpt = (options, value, def) => {
	return (options && typeof options[value] !== 'undefined') ? options[value] : def;
};

const wait = ms => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

Promise.timeout = (timeout, promise) => {
	return Promise.race([
		promise,
		new Promise((resolve, reject) => {
			setTimeout(() => {
				return reject(new Error('timeout'));
			}, timeout);
		})
	]);
};

class MiFlora {
	/**
     * Create an instance of the controller
     */
	constructor() {
		this._devices = new Map();
		this.isScanning = false;
		noble.on('scanStart', () => {
			logDebug('discovery started');
		});
		noble.on('scanStop', () => {
			logDebug('discovery finished');
		});
		noble.on('discover', peripheral => {
			const deviceAddress = peripheral.address.toLowerCase();
			if (peripheral.advertisement.serviceData.length === 0) {
				return;
			}
			const device = this._devices.get(deviceAddress);
			if (!device) {
				const newDevice = MiFloraDevice.from(peripheral);
				this._devices.set(deviceAddress, newDevice);
				logDebug('discovered %s \'%s\' @ %s', newDevice.type, newDevice.name, newDevice.address);
			}
		});
	}

	/**
     * Start the discovery process
     * @param {object} options - Discovery options
     * @return {Promise} A Promise which resolves with an array of MiFloraDevice
     */
	discover(options) {
		const timeout = getOpt(options, 'timeout', 10000);
		return new Promise(async (resolve, reject) => {
			if (this.isScanning) {
				return reject(new Error('already scanning'));
			}
			try {
				this.isScanning = true;
				await new Promise((resolve, reject) => {
					noble.startScanning([ROOT_SERVICE_UUID], true, error => {
						if (error) {
							return reject(error);
						}
						return resolve();
					});
				});
				await wait(timeout);
				await new Promise(resolve => {
					noble.stopScanning(() => {
						return resolve();
					});
				});
				return resolve(this._devices.values());
			} catch (error) {
				return reject(error);
			} finally {
				this.isScanning = false;
			}
		});
	}
}

module.exports = MiFlora;
