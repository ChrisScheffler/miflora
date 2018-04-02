const miflora = require('./lib/miflora.js');

miflora.discover(5000).then(devices => {
	console.log('done', devices);
	miflora.queryDevice(devices[0]).then(data => {
		console.dir(data);
	}).catch(e => {
		console.log('query error', e);
	});
}).catch(e => {
	console.log('error:', e);
});
