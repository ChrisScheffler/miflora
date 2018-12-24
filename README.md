# miflora

Node.js package for the Xiaomi Mi Flora Plant Sensor built on top of [noble](https://github.com/noble/noble).

[![npm](https://img.shields.io/npm/v/miflora.svg)](https://www.npmjs.com/package/miflora)
![language](https://img.shields.io/github/languages/top/ChrisScheffler/miflora.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
![commit](https://img.shields.io/github/last-commit/ChrisScheffler/miflora.svg)
![firmware](https://img.shields.io/badge/firmware-3.1.9-brightgreen.svg)
[![licence](https://img.shields.io/npm/l/miflora.svg)](LICENSE)

Have a look in the [Wiki](https://github.com/ChrisScheffler/miflora/wiki) for more information on the sensor.

---

## Prerequisites

Please see [the Prerequisites section for noble](https://github.com/noble/noble#prerequisites).

## Install

```bash
npm install miflora
```

## Usage

The library uses [async/await](https://javascript.info/async-await) code syntax instead of [Promises chaining](https://javascript.info/promise-chaining) in order to execute asynchronous code sequentially. Since all internal code is based on [Promises](https://javascript.info/promise-basics) you still can use the  `method().then().catch()`-pattern regardless.

*All examples use async/await syntax.*

### Discover devices

```javascript
const devices = await miflora.discover();
console.log('devices discovered: ', devices.length);
```

In this example we listen for 10000 (*default value*) milliseconds (10 seconds) and print out the number of detected devices.

### Discover devices (advanced)

```javascript
const opts = {
  duration: 60000,
  ignoreUnknown: true,
  addresses: ['c4:7c:8d:65:d6:1d', 'c4:7c:8d:65:d5:26', 'c4:7c:8d:65:e6:20']
};
const devices = await miflora.discover(opts);
console.log('devices discovered: ', devices.length);
```

This time we listen for 60000 milliseconds (60 seconds) **or** until all devices from given `opts.addresses` have been discovered and print out the number of detected devices. If `opt.ignoreUnknown` is true, devices which are not in `opt.addresses` will be ignored in result.

### Query device information

All query methods implicitly initiate a connection if none exists. You can call `device.connect()` explicitly if you like nevertheless.

The library however **doesn't** perform a disconnect implicitly. You can call `device.disconnect()` when you have finished you queries or let you disconnect automatically from the device after 10 seconds.

#### Firmaware & Battery

```javascript
const data = await device.queryFirmwareInfo();
console.log(data);
```

Example output:

```javascript
{ address: 'c4:7c:8d:65:e6:20',
  type: 'MiFloraMonitor',
  firmwareInfo: { battery: 100, firmware: '3.1.9' } }
```

#### Sensor values

```javascript
const data = await device.querySensorValues();
console.log(data);
```

Example output:

```javascript
{ address: 'c4:7c:8d:65:e6:20',
  type: 'MiFloraMonitor',
  sensorValues: { temperature: 21.1, lux: 104, moisture: 36, fertility: 1049 } }
```

#### Serial Number

```javascript
const data = await device.querySerial();
console.log(data);
```

#### Combined query

```javascript
const data = await device.query();
console.log(data);
```

## Debugging

The library uses [Debug](https://github.com/visionmedia/debug) with the logger names `miflora` and `miflora:device`.
You can start your script with prefixing DEBUG=miflora* to see all debug output.

```bash
DEBUG=miflora* node yourapp.js
```

## References

- https://github.com/demirhanaydin/node-mi-flora
- https://wiki.hackerspace.pl/projects:xiaomi-flora

## Licence

[MIT](LICENSE)