'use strict';

const miflora = require('../lib/miflora');

const discoverOptions = {
	addresses: ['c4:7c:8d:66:c6:41'],
	ignoreUnknown: true,
	duration: 10000
};

(async function () {
	console.log('> scanning for a max of %s seconds', discoverOptions.duration / 1000);
	const devices = await miflora.discover(discoverOptions);
	const device = devices.find(entry => entry.address === 'c4:7c:8d:66:c6:41');
	if (device) {
		console.log(await device.query());
	} else {
		console.log('not found');
	}
})();
