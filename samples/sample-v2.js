'use strict';

const MiFlora = require('../lib/miflora2.js');

const miflora = new MiFlora();

miflora.discover({ timeout: 5000 }).then(devices => {
	for (const device of devices) {
		device.connect().then(() => {
			device.queryFirmwareInfo().then(firmwareData => {
				console.log(firmwareData);
				device.querySensorInfo().then(sensorData => {
					console.log(sensorData);
				});
			});
		});
	}
	console.log('done');
}).catch(err => {
	console.error('error while discovering', err);
});
