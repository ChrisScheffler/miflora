const miflora = require('./lib/miflora.js');

miflora.discover(10000).then(devices => {
	console.log('done', devices);
	// query all
	miflora.queryAll().then(data => {
		console.log(data);
	})

	// query first
/*	
	miflora.queryDevice(devices[0]).then(data => {
		console.dir(data);
	}).catch(e => {
		console.log('query error', e);
	});
*/
}).catch(e => {
	console.log('error:', e);
});
