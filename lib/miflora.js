const noble = require('noble');
const logDebug = require('debug')('miflora');

const ROOT_SERVICE_UUID = 'fe95';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const MODE_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_ENABLE_BUFFER = Buffer.from([0xA0, 0x1F]);
const BLINK_ENABLE_BUFFER = Buffer.from([0xFD, 0xFF]);
const DEFAULT_DISCOVERY_TIMEOUT = 10000;
const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_ACTION_TIMEOUT = 2000;

/* Helper functions */
const wait = ms => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

const toAddressArray = peripherals => {
	const addresses = [];
	for (const address in peripherals) {
		addresses.push(address);
	}
	return addresses.sort();
};

const withTimeout = (ms, promise) => {
	const timeout = new Promise(async (resolve, reject) => {
		await wait(ms);
		reject(new Error('timeout'));
	});
	return Promise.race([
		promise,
		timeout
	]);
};

const parseData = data => {
	return {
		temperature: data.readUInt16LE(0) / 10,
		lux: data.readUInt32LE(3),
		moisture: data.readUInt16BE(6),
		fertility: data.readUInt16LE(8)
	};
};

const parseFirmware = data => {
	return [
		parseInt(data.toString('hex', 0, 1), 16),
		data.toString('ascii', 2, data.length)
	];
};

const resolveChar = (peripheral, srvUuid, charUuid) => {
	return withTimeout(DEFAULT_ACTION_TIMEOUT, new Promise((resolve, reject) => {
		peripheral.discoverSomeServicesAndCharacteristics([srvUuid], [charUuid], (err, srv, char) => {
			if (err) {
				reject(err);
			} else {
				resolve(char[0]);
			}
		});
	}));
};

const readChar = (peripheral, srvUuid, charUuid) => {
	return withTimeout(DEFAULT_ACTION_TIMEOUT, new Promise(async (resolve, reject) => {
		try {
			const char = await resolveChar(peripheral, srvUuid, charUuid);
			char.read((err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		} catch (err) {
			reject(err);
		}
	}));
};

const writeChar = (peripheral, srvUuid, charUuid, data) => {
	return withTimeout(DEFAULT_ACTION_TIMEOUT, new Promise(async (resolve, reject) => {
		try {
			const char = await resolveChar(peripheral, srvUuid, charUuid);
			char.write(data, false, err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		} catch (err) {
			reject(err);
		}
	}));
};

const getData = peripheral => {
	return new Promise(async (resolve, reject) => {
		logDebug('querying data characteristic');
		try {
			const data = await readChar(peripheral, DATA_SERVICE_UUID, DATA_CHARACTERISTIC_UUID);
			resolve(parseData(data));
		} catch (err) {
			reject(err);
		}
	});
};

const getFirmwareInfo = peripheral => {
	return new Promise(async (resolve, reject) => {
		logDebug('querying firmware characteristic');
		try {
			const data = await readChar(peripheral, DATA_SERVICE_UUID, FIRMWARE_CHARACTERISTIC_UUID);
			resolve(parseFirmware(data));
		} catch (err) {
			reject(err);
		}
	});
};

const enableRealtimeData = peripheral => {
	return new Promise(async (resolve, reject) => {
		logDebug('enableing realtime data');
		try {
			await writeChar(peripheral, DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID, REALTIME_ENABLE_BUFFER);
			const data = await readChar(peripheral, DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID);
			if (data.equals(REALTIME_ENABLE_BUFFER)) {
				resolve(data);
			} else {
				reject(new Error('error enableing realtime data'));
			}
		} catch (err) {
			reject(err);
		}
	});
};

const enableBlink = peripheral => {
	return new Promise(async (resolve, reject) => {
		logDebug('enableing blinking');
		try {
			await writeChar(peripheral, DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID, BLINK_ENABLE_BUFFER);
			const data = await readChar(peripheral, DATA_SERVICE_UUID, MODE_CHARACTERISTIC_UUID);
			if (data.equals(BLINK_ENABLE_BUFFER)) {
				resolve(data);
			} else {
				reject(new Error('error enableing blinking'));
			}
		} catch (err) {
			reject(err);
		}
	});
};

const getRssi = peripheral => {
	return new Promise((resolve, reject) => {
		if (!peripheral) {
			reject(new Error('invalid argument'));
		}
		peripheral.updateRssi((err, rssi) => {
			if (err) {
				reject(err);
			} else {
				resolve(rssi);
			}
		});
	});
};

const connect = peripheral => {
	return withTimeout(DEFAULT_CONNECT_TIMEOUT, new Promise(async (resolve, reject) => {
		if (!peripheral) {
			reject(new Error('invalid argument'));
		}
		if (peripheral.state === 'connected') {
			resolve(peripheral.rssi);
		}
		peripheral.once('connect', async () => {
			logDebug('connected to %s', peripheral.address);
			try {
				[peripheral.battery, peripheral.firmware] = await getFirmwareInfo(peripheral);
				resolve(await getRssi(peripheral));
			} catch (err) {
				reject(err);
			}
		});
		logDebug('connecting to %s', peripheral.address);
		peripheral.connect();
	}));
};

const disconnect = peripheral => {
	return new Promise((resolve, reject) => {
		if (!peripheral) {
			reject(new Error('invalid argument'));
		}
		peripheral.once('disconnect', () => {
			logDebug('disconnected from %s', peripheral.address);
			resolve();
		});
		logDebug('disconnecting from %s', peripheral.address);
		peripheral.disconnect();
	});
};

class MiFlora {
	constructor() {
		this.peripherals = {};

		noble.on('scanStart', () => {
			logDebug('scan started');
		});
		noble.on('scanStop', () => {
			logDebug('scan stopped');
		});

		noble.on('discover', peripheral => {
			logDebug('discovered \'%s\' @ %s', peripheral.advertisement.localName, peripheral.address);
			this.peripherals[peripheral.address.toLowerCase()] = peripheral;
		});
	}

	discover(timeout) {
		timeout = timeout ? timeout : DEFAULT_DISCOVERY_TIMEOUT;
		return new Promise(async (resolve, reject) => {
			if (this.isScanning) {
				reject(new Error('already scanning'));
			}
			/*
				Don't touch noble.state as it seems to throw an exception if touched
				before noble.startScanning() is called under certain circumstances.
			*/
			try {
				logDebug('starting discovery for %dms', timeout);
				this.isScanning = true;
				noble.startScanning([ROOT_SERVICE_UUID], false);
				await wait(timeout);
				noble.stopScanning();
				this.isScanning = false;
				resolve(toAddressArray(this.peripherals));
			} catch (err) {
				logDebug('caught exception while scanning: %o', err);
				reject(err);
			}
		});
	}

	findDevice(address, doDisconnect = false) {
		return new Promise(async (resolve, reject) => {
			const peripheral = this.peripherals[address];
			if (!peripheral) {
				reject(new Error('no such device:', address));
			}
			try {
				await connect(peripheral);
				if (peripheral.firmware === '3.1.8') {
					await enableBlink(peripheral);
				}
				resolve();
			} catch (err) {
				logDebug('rejecting: %o', err);
				reject(err);
			} finally {
				if (doDisconnect && peripheral && peripheral.state === 'connected') {
					try {
						await disconnect(peripheral);
					} catch (err) {
						logDebug('error disconnecting from %s', peripheral.address);
					}
				}
			}
		});
	}

	queryDevice(address, doDisconnect = false) {
		return new Promise(async (resolve, reject) => {
			const peripheral = this.peripherals[address];
			if (!peripheral) {
				reject(new Error('no such device ' + address));
			}
			try {
				const result = {};
				result.address = peripheral.address;
				result.rssi = await connect(peripheral);
				result.battery = peripheral.battery;
				result.firmware = peripheral.firmware;
				if (peripheral.firmware === '3.1.8') {
					await enableRealtimeData(peripheral);
					result.data = await getData(peripheral);
				}
				logDebug('finished gathering data');
				resolve(result);
			} catch (err) {
				logDebug('rejecting: %o', err);
				reject(err);
			} finally {
				if (doDisconnect && peripheral.state === 'connected') {
					try {
						await disconnect(peripheral);
					} catch (err) {
						logDebug('error disconnecting from %s', peripheral.address);
					}
				}
			}
		});
	}

	queryAll() {
		return new Promise(async resolve => {
			const result = [];
			const tasks = toAddressArray(this.peripherals);
			for (const idx in tasks) {
				try {
					result.push(await this.queryDevice(tasks[idx]));
				} catch (err) {
					console.error(err);
				}
			}
			resolve(result);
		});
	}
}

module.exports = new MiFlora();
