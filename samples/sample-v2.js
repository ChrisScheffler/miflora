'use strict';

const miflora = require('../lib/miflora.js');

const discoverOptions = {
	duration: 10000,
	addresses: ['c4:7c:8d:65:d6:1d', 'c4:7c:8d:65:d5:26', 'c4:7c:8d:65:e6:20']
};

miflora.discover(discoverOptions).then(devices => {
	devices.forEach(device => {
		device.query().then(data => {
			console.dir(data, {colors: true});
		}).catch(err => {
			console.error('error while querying device', device, ':', err);
		});
	});
}).catch(err => {
	console.error('well, something went wrong:', err);
});
