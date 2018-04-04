const miflora = require('../lib/miflora.js');

const DISCOVERY_TIMEOUT = 10000;

console.log(`miflora sample - discovering devices for ${DISCOVERY_TIMEOUT / 1000} seconds`);

miflora.discover(DISCOVERY_TIMEOUT).then(devices => {
    console.log('\nfinished discovery, found', devices.length, 'devices:', devices, '\n');

    /* Query each device in parallel */
    devices.forEach(device => {
        miflora.queryDevice(device).then(data => {
            console.log('device "%s" answered:\n', device, JSON.stringify(data, null, 2));
        }).catch(err => {
            console.error('error while querying device', device, ':', err);
        });
    });
}).catch(err => {
    console.error('well, something went wrong:', err);
});
