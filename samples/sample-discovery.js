const miflora = require('../lib/miflora.js');

const DISCOVERY_TIMEOUT = 10000;

console.log(`miflora sample - discovering devices for ${DISCOVERY_TIMEOUT / 1000} seconds`);

miflora.discover(DISCOVERY_TIMEOUT).then(devices => {
	console.log('\nfinished discovery, found %d devices: %s', devices.length, devices);
}).catch(err => {
	console.error('well, something went wrong: %s', err);
});
