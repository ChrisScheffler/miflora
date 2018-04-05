const MiFlora = require('../lib/miflora2.js');
const util = require('util')


let miflora = new MiFlora();

miflora.discover({ timeout: 10000 }).then(() => {
    console.log('scan done, rendering...');
    for (address in miflora.devices) {
        console.log(util.inspect(miflora.devices[address], { depth: 1, colors: true }))
    }
    console.log('done');
}).catch(err => {
    console.error('1error while discovering', err);
});
