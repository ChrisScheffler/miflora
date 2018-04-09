'use strict';

const miflora = require('../lib/miflora.js');

miflora.discover({ duration: 5000 }).then(devices => {
	console.dir(devices);
}).catch(err => {
	console.error('error while discovering', err);
});
