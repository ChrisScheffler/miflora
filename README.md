# miflora

Node.js package for the Xiaomi Mi Flora Plant Sensor built on top of [noble](https://github.com/noble/noble) and [ES6 promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises).

![product image](http://img.site.huahuacaocao.net/production/production_05_01.png)

[![npm](https://img.shields.io/npm/v/miflora.svg)](https://www.npmjs.com/package/miflora)
![language](https://img.shields.io/github/languages/top/ChrisScheffler/miflora.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
![commit](https://img.shields.io/github/last-commit/ChrisScheffler/miflora.svg)
![firmware](https://img.shields.io/badge/firmware-3.1.8-brightgreen.svg)
[![licence](https://img.shields.io/npm/l/miflora.svg)](LICENSE)

Have a look in the [Wiki](https://github.com/ChrisScheffler/miflora/wiki).

---

## Prerequisites

Please see [the Prerequisites section for noble](https://github.com/noble/noble#prerequisites).

## Install

```sh
npm install miflora
```

## Usage

```javascript
const miflora = require('miflora');

const opts = {
  duration: 60000,
  addresses: ['c4:7c:8d:65:d6:1d', 'c4:7c:8d:65:d5:26', 'c4:7c:8d:65:e6:20']
};

miflora.discover(opts).then(devices => {
  devices.forEach(device => {
    device.query().then(data => {
      console.dir(data);
    }).catch(err => {
      console.error('error while querying device', device, ':', err);
    });
  });
}).catch(err => {
  console.error('well, something went wrong:', err);
});
```

In this example we disover for 60000 milliseconds (60 seconds) **or** until all devices from given `opts.addresses` have been discovered.


### Example output

```javascript
{ address: 'c4:7c:8d:65:e6:20',
  type: 'MiFloraMonitor',
  firmwareInfo: { battery: 100, firmware: '3.1.8' },
  sensorValues: { temperature: 19.8, lux: 86, moisture: 33, fertility: 981 } }
{ address: 'c4:7c:8d:65:d5:26',
  type: 'MiFloraMonitor',
  firmwareInfo: { battery: 99, firmware: '3.1.8' },
  sensorValues: { temperature: 21, lux: 58, moisture: 39, fertility: 706 } }
{ address: 'c4:7c:8d:65:d6:1d',
  type: 'MiFloraMonitor',
  firmwareInfo: { battery: 99, firmware: '3.1.8' },
  sensorValues: { temperature: 20.8, lux: 78, moisture: 34, fertility: 827 } }
```

## References

- https://github.com/demirhanaydin/node-mi-flora
- https://wiki.hackerspace.pl/projects:xiaomi-flora

## Licence

[MIT](LICENSE)