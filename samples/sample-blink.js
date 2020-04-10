'use strict';

const miflora = require('../lib/miflora');

const delay = timeout => {
	return new Promise(resolve => {
		setTimeout(resolve, timeout);
	});
};

const discoverOptions = {
	addresses: ['c4:7c:8d:66:c6:41'],
	ignoreUnknown: true,
	duration: 30000
};

(async function () {
	console.log('> scanning for a max of %s seconds', discoverOptions.duration / 1000);
	const devices = await miflora.discover(discoverOptions);
	const device = devices.find(entry => entry.address === 'c4:7c:8d:66:c6:41');
	if (device) {
		await device.connect();
		await delay(3000);
		await device.blink();
	} else {
		console.log('not found');
	}
})();
