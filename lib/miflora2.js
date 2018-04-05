const noble = require('noble');
const MiFloraDevice = require('./miflora-device.js');
const logDebug = require('debug')('miflora');

const ROOT_SERVICE_UUID = 'fe95';


const getOpt = (options, value, def) => {
    return options && typeof options[value] !== 'undefined' ? options[value] : def;
};

const wait = ms => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

Promise.timeout = function (timeout, promise) {
    return Promise.race([
        promise,
        new Promise(function (resolve, reject) {
            setTimeout(function () {
                return reject(new Error('timeout'));
            }, timeout);
        })
    ]);
}

module.exports = class MiFlora {
    constructor() {
        this._noble = noble;
        this.devices = {};
        this.isScanning = false;

        noble.on('discover', peripheral => {
            const deviceAddress = peripheral.address.toLowerCase();
            const device = this.devices[deviceAddress];
            if (!device) {
                logDebug('discovered \'%s\' @ %s', peripheral.advertisement.localName, deviceAddress);
                this.devices[peripheral.address.toLowerCase()] = new MiFloraDevice(this, deviceAddress);
            }
        });
    }

    _startDiscovery() {
        return new Promise((resolve, reject) => {
            this._noble.startScanning([ROOT_SERVICE_UUID], false, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    _stopDiscovery() {
        return new Promise(resolve => {
            this._noble.stopScanning(() => {
                return resolve();
            });
        });        
    }

    discover(options) {
        const timeout = getOpt(options, "timeout", 10000);
        return new Promise(async (resolve, reject) => {
            if (this.isScanning) {
                return reject(new Error('already scanning'));
            }
            try {
                this.isScanning = true;
                logDebug('starting discovery for %d ms', timeout);
                await this._startDiscovery();
                await wait(timeout);
                await this._stopDiscovery();
                logDebug('finished discovery');
                this.isScanning = false;
                return resolve(this.devices);
            } catch (err) {
                return reject(err);
            }
        });
    }
}
