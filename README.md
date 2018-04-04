# miflora

Node.js package for the Xiaomi Mi Flora Plant Sensor developed by [HuaHuaCaoCao](http://www.huahuacaocao.com/product).
![product image](http://img.site.huahuacaocao.net/production/production_05_01.png)

This package is based on and inspired by [demirhanaydin/node-mi-flora](https://github.com/demirhanaydin/node-mi-flora).

It uses [noble](https://github.com/noble/noble) for BLE communication and [ES6 Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) instead of callbacks.

Tested with sensor firmware version `3.1.8`.

**Code and readme are work in progress!**

---

## Install

> pending...

```sh
npm install miflora
```

or

```sh
git clone https://github.com/ChrisScheffler/miflora
npm install
```

## Usage

```javascript
const miflora = require('miflora');

miflora.discover().then(devices => {
  for (let idx in devices) {
    miflora.queryDevice(devices[idx]).then(data => {
      console.log(data);
    });
  }
});
```

#### Example output

```javascript
{ address: 'c4:7c:8d:xx:xx:xx',
  rssi: -77,
  data: { temperature: 20.5, lux: 39, moisture: 30, fertility: 365 },
  system: { battery: 99, firmware: '3.1.8' } }
{ address: 'c4:7c:8d:xx:xx:xx',
  rssi: -71,
  data: { temperature: 20.7, lux: 21, moisture: 35, fertility: 445 },
  system: { battery: 92, firmware: '3.1.8' } }
{ address: 'c4:7c:8d:xx:xx:xx',
  rssi: -69,
  data: { temperature: 21, lux: 6, moisture: 33, fertility: 400 },
  system: { battery: 95, firmware: '3.1.8' } }
{ address: 'c4:7c:8d:xx:xx:xx',
  rssi: -75,
  data: { temperature: 19.9, lux: 43, moisture: 41, fertility: 946 },
  system: { battery: 99, firmware: '3.1.8' } }
{ address: 'c4:7c:8d:xx:xx:xx',
  rssi: -66,
  data: { temperature: 20, lux: 26, moisture: 70, fertility: 1388 },
  system: { battery: 100, firmware: '3.1.8' } }
```

## References

- https://github.com/demirhanaydin/node-mi-flora
- https://wiki.hackerspace.pl/projects:xiaomi-flora
