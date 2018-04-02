const miflora = require('./lib/miflora.js');

miflora.discover(3000).then((m) => {
	console.log("done", m);
	miflora.queryDevice(m[0]).then((d) => {
		console.log(d);
	}).catch((e) => {
		console.log("query error", e);
	});
}).catch((e) => {
	console.log("error:", e);
});