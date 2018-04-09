'use strict';

const noble = require('noble');
const logDebug = require('debug')('miflora');
const MiFloraDevice = require('./miflora-device.js');

const UUID_SERVICE_XIAOMI = 'fe95';

const getOpt = (options, value, def) => {
	return (options && typeof options[value] !== 'undefined') ? options[value] : def;
};

const wait = ms => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

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
		noble.on('discover', peripheral => {
			const deviceAddress = peripheral.address.toLowerCase();
			if (peripheral.advertisement.serviceData.length === 0) {
				return;
			}
			const exisitingDevice = this._devices[deviceAddress];
			if (!exisitingDevice) {
				const newDevice = MiFloraDevice.from(peripheral);
				if (newDevice) {
					this._devices[deviceAddress] = newDevice;
					logDebug('discovered new device (%s) \'%s\' @ %s', newDevice.type, newDevice.name, newDevice.address);
				}
			}
		});
	}

	/**
     * Start the discovery process
     * @param {object} options - Discovery options
     * @return {Promise} A Promise which resolves with an array of MiFloraDevice
     */
	discover(options) {
		const optDuration = getOpt(options, 'duration', 10000);
		return new Promise(async (resolve, reject) => {
			try {
				await this._ensurePowerOnState();
				await this._startScan();
				await wait(optDuration);
				await this._stopScan();
				return resolve(Object.values(this._devices));
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * @private
	 */
	_ensurePowerOnState() {
		return new Promise(async resolve => {
			if (noble.state === 'poweredOn') {
				return resolve();
			}
			logDebug('waiting for adapter state change');
			noble.on('stateChange', state => {
				if (state === 'poweredOn') {
					return resolve();
				}
			});
		});
	}

	/**
	 * @private
	 */
	_startScan() {
		return new Promise((resolve, reject) => {
			noble.startScanning([UUID_SERVICE_XIAOMI], true, error => {
				if (error) {
					return reject(error);
				}
				return resolve();
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
