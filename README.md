# miflora

Node.js package for the Xiaomi Mi Flora Plant Sensor built on top of [noble](https://github.com/noble/noble) and [ES6 promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises).

![product image](http://img.site.huahuacaocao.net/production/production_05_01.png)

![npm](https://img.shields.io/npm/v/miflora.svg)
![language](https://img.shields.io/github/languages/top/ChrisScheffler/miflora.svg)
![codestyle](https://img.shields.io/badge/code_style-XO-blue.svg)
![commit](https://img.shields.io/github/last-commit/ChrisScheffler/miflora.svg)
![firmware](https://img.shields.io/badge/firmware-3.1.8-brightgreen.svg)
![licence](https://img.shields.io/npm/l/miflora.svg)

Have a look in the [Wiki](https://github.com/ChrisScheffler/miflora/wiki).

**Code and readme are work in progress!**

---

## Install

```sh
npm install miflora
```

## Usage

```javascript
const miflora = require('miflora');

miflora.discover().then(devices => {
    devices.forEach(device => {
        miflora.queryDevice(device).then(data => {
            console.log(JSON.stringify(data, null, 2));
        }).catch(err => {
            console.error('error while querying device', device, ':', err);
        });
    });
}).catch(err => {
    console.error('well, something went wrong:', err);
});
```

### Example output

```javascript
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