'use strict';

const miflora = require('../lib/miflora.js');

const discoverOptions = {
	addresses: ['c4:7c:8d:65:d5:26'],
	ignoreUnknown: true,
	duration: 30000
};

(async function () {
	console.log('> scanning for a max of %s seconds', discoverOptions.duration / 1000);
	const devices = await miflora.discover(discoverOptions);
	const device = devices.find(entry => entry.address === 'c4:7c:8d:65:d5:26');
	if (device) {
		await device.query();
	} else {
		console.log('not found');
	}
})();
