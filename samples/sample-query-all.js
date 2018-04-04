const miflora = require('../lib/miflora.js');

const DISCOVERY_TIMEOUT = 10000;

console.log(`miflora sample - discovering devices for ${DISCOVERY_TIMEOUT / 1000} seconds`);

miflora.discover(DISCOVERY_TIMEOUT).then(devices => {
    console.log('\nfinished discovery, found', devices.length, 'devices:', devices, '\n');

    /* Query all known devices in series */
    miflora.queryAll().then(data => {
        console.log('queryAll returned %d answers:\n%s', data.length, JSON.stringify(data, null, 2));
    }).catch(err => {
        console.error('error while querying devices: %s', err);
    });
}).catch(err => {
    console.error('well, something went wrong: %s', err);
});
