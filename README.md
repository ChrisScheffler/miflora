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
    devices.forEach(device => {
        miflora.queryDevice(device).then(data => {
            console.log('%s:\n%s', device, JSON.stringify(data, null, 2));
        }).catch(err => {
            console.error('error while querying device', device, ':', err);
        });
    });
}).catch(err => {
    console.error('well, something went wrong:', err);
});
```

#### Example output

```javascript
c4:7c:8d:65:e5:20:
 {
  "address": "c4:7c:8d:65:e5:20",
  "rssi": -61,
  "battery": 100,
  "firmware": "3.1.8",
  "data": {
    "temperature": 22.1,
    "lux": 324,
    "moisture": 22,
    "fertility": 290
  }
}
c4:7c:8d:65:d5:26:
 {
  "address": "c4:7c:8d:65:d5:26",
  "rssi": -80,
  "battery": 98,
  "firmware": "3.1.8",
  "data": {
    "temperature": 20.5,
    "lux": 164,
    "moisture": 31,
    "fertility": 300
  }
}
c4:7c:8d:65:d5:1d:
 {
  "address": "c4:7c:8d:65:d5:1d",
  "rssi": -77,
  "battery": 99,
  "firmware": "3.1.8",
  "data": {
    "temperature": 22,
    "lux": 311,
    "moisture": 26,
    "fertility": 450
  }
}
```

## References

- https://github.com/demirhanaydin/node-mi-flora
- https://wiki.hackerspace.pl/projects:xiaomi-flora
