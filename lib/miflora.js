'use strict';

/* dependencies */
const noble = require('noble');
const colors = require('colors');
const logDebug = require('debug')('miflora');

/* constants */
const ROOT_SERVICE_UUID = 'fe95';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const MODE_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_ENABLE_BUFFER = Buffer.from([0xa0, 0x1f]);

const DEFAULT_DISCOVERY_TIMEOUT = 10000;
const DEFAULT_RW_TIMEOUT = 3000;

/* helper functions */
const wait = (ms) => {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
};

const toAddressArray = (peripherals) => {
	let addresses = [];
	for (let address in peripherals) {
		addresses.push(address);
	}
	return addresses.sort();
}

const withTimeout = (ms, promise) => {
	const timeout = new Promise(async (resolve, reject) => {
		await wait(ms);
		reject('timeout');
	});
	return Promise.race([
		promise,
		timeout
	]);
};

const resolveChar = (peripheral, srvUuid, charUuid) => {
	return new Promise((resolve, reject) => {
		peripheral.discoverSomeServicesAndCharacteristics([srvUuid], [charUuid], (err, srv, char) => {
			if (err) {
				reject(err);
			} else {
				resolve(char[0]);
			}
		});
	});
}

const readChar = (peripheral, srvUuid, charUuid) => {
	return new Promise((resolve, reject) => {
		resolveChar(peripheral, srvUuid, charUuid).then((char) => {
			char.read((err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		}).catch((err) => {
			logDebug('caught %o', err);
			reject(err);
		});
	});
}

const writeChar = (peripheral, srvUuid, charUuid, data) => {
	return new Promise((resolve, reject) => {
		resolveChar(peripheral, srvUuid, charUuid).then((char) => {
			char.write(data, false, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		}).catch((err) => {
			logDebug('caught %o', err);
			reject(err);
		});
	});
}

const getData = (peripheral) => {
	return new Promise((resolve, reject) => {
		logDebug('querying data characteristic');
		readChar(peripheral, DATA_SERVICE_UUID, DATA_CHARACTERISTIC_UUID).then((data) => {
			resolve(parseData(data));
		}).catch((err) => {
			reject(err);
		});
	});
}

const getFirmwareInfo = (peripheral) => {
	return new Promise((resolve, reject) => {
		logDebug('querying firmware characteristic');
		readChar(peripheral, DATA_SERVICE_UUID, FIRMWARE_CHARACTERISTIC_UUID).then((data) => {
			resolve(parseFirmware(data));
		}).catch((err) => {
			reject(err);
		});
	});
}

const enableRealtimeData = (peripheral) => {
	return new Promise((resolve, reject) => {
		logDebug('enableing realtime data');
		writeChar(peripheral, DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID, REALTIME_ENABLE_BUFFER).then(() => {
			readChar(peripheral, DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID).then((data) => {
				if (data.equals(REALTIME_ENABLE_BUFFER)) {
					resolve(data);
				} else {
					reject('error enableing realtime data');
				}
			}).catch((err) => {
				reject(err);
			});
		}).catch((err) => {
			reject(err);
		});
	});
}

const parseData = (data) => {
	let result = {
		temperature: data.readUInt16LE(0) / 10,
		lux: data.readUInt32LE(3),
		moisture: data.readUInt16BE(6),
		fertility: data.readUInt16LE(8)
	};
	return result;
}

const parseFirmware = (data) => {
	let result = {
		battery: parseInt(data.toString('hex', 0, 1), 16),
		firmware: data.toString('ascii', 2, data.length)
	};
	return result;
}

class MiFlora {
	constructor() {
		this.peripherals = {};
		noble.on('discover', function(peripheral) {
			logDebug('discovered \'%s\' @ %s', peripheral.advertisement.localName.green, peripheral.address.cyan);
			this.peripherals[peripheral.address.toLowerCase()] = peripheral;
		}.bind(this));
	}

	discover(timeout = DEFAULT_DISCOVERY_TIMEOUT) {
		return new Promise(async (resolve, reject) => {
			if (this.isScanning) {
				reject('already scanning');
			}
			/*
				don't touch noble.state as it seems to throw an exception if touched
				before noble.startScanning() is called under certain circumstances
				*/
			try {
				logDebug('starting scan');
				this.isScanning = true;
				noble.startScanning([ROOT_SERVICE_UUID], false);
				await wait(timeout);
				noble.stopScanning();
				this.isScanning = false;
				logDebug('finished scan');
				resolve(toAddressArray(this.peripherals));
			} catch (ex) {
				logDebug('caught exception while scanning: %o', ex);
				reject(ex);
			}
		});
	}

	queryDevice(address) {
		return new Promise((resolve, reject) => {
			let peripheral = this.peripherals[address];
			if (!peripheral) {
				reject('no such device ' + address);
			}
			peripheral.once('connect', async () => {
				logDebug('connected to %s', peripheral.address.cyan);
				try {
					let result = {
						address: peripheral.address,
						rssi: peripheral.rssi
					};
					await withTimeout(DEFAULT_RW_TIMEOUT, enableRealtimeData(peripheral));
					result.data = await withTimeout(DEFAULT_RW_TIMEOUT, getData(peripheral));
					result.system = await withTimeout(DEFAULT_RW_TIMEOUT, getFirmwareInfo(peripheral));
					logDebug('finished gathering data');
					peripheral.disconnect();
					resolve(result);
				} catch (e) {
					logDebug('rejecting: %o', e);
					reject(e);
				}
			});
			logDebug('connecting to %s', peripheral.address.cyan);
			peripheral.connect();
		});
	}
}

module.exports = new MiFlora();