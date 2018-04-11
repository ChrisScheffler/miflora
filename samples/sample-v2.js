'use strict';

const miflora = require('../lib/miflora.js');

const discoverOptions = {
	duration: 60000,
	addresses: ['c4:7c:8d:65:e6:20']
};

(async function () {
	console.log('> scanning for a max of %s seconds', discoverOptions.duration / 1000);
	const devices = await miflora.discover(discoverOptions);
	if (devices) {
		console.log('> querying the device');
		const data = await devices[0].query();
		console.dir(data);
	}
})();
