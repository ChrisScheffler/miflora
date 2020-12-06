'use strict';

const miflora = require('../lib/miflora');

const discoverOptions = {
	addresses: ['c4:7c:8d:65:d5:26'],
	ignoreUnknown: true,
	duration: 10000
};

(async function () {
	console.log('> scanning for a max of %s seconds', discoverOptions.duration / 1000);
	try {
		const devices = await miflora.discover(discoverOptions);
		const device = devices.find(entry => entry.address === 'c4:7c:8d:65:d5:26');
		if (device) {
			console.log(await device.query());
		} else {
			console.log('not found');
		}
	} catch (error) {
		console.error(error);
	}
})();
