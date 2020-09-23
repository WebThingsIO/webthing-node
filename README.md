# webthing

[![Build Status](https://github.com/WebThingsIO/webthing-node/workflows/Node.js%20package/badge.svg)](https://github.com/WebThingsIO/webthing-node/workflows/Node.js%20package)
[![NPM](https://img.shields.io/npm/v/webthing.svg)](https://www.npmjs.com/package/webthing)
[![license](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)

Implementation of an HTTP [Web Thing](https://iot.mozilla.org/wot/).

# Installation

`webthing` can be installed via `npm`, as such:

```shell
$ npm install webthing
```

# Example

In this example we will set up a dimmable light and a humidity sensor (both using fake data, of course). Both working examples can be found in [here](https://github.com/WebThingsIO/webthing-node/tree/master/example).

## Dimmable Light

Imagine you have a dimmable light that you want to expose via the web of things API. The light can be turned on/off and the brightness can be set from 0% to 100%. Besides the name, description, and type, a [`Light`](https://iot.mozilla.org/schemas/#Light) is required to expose two properties:
* `on`: the state of the light, whether it is turned on or off
    * Setting this property via a `PUT {"on": true/false}` call to the REST API toggles the light.
* `brightness`: the brightness level of the light from 0-100%
    * Setting this property via a PUT call to the REST API sets the brightness level of this light.

First we create a new Thing:

```javascript
const light = new Thing('urn:dev:ops:my-lamp-1234',
                        'My Lamp',
                        ['OnOffSwitch', 'Light'],
                        'A web connected lamp');
```

Now we can add the required properties.

The **`on`** property reports and sets the on/off state of the light. For this, we need to have a `Value` object which holds the actual state and also a method to turn the light on/off. For our purposes, we just want to log the new state if the light is switched on/off.

```javascript
light.addProperty(
  new Property(
    light,
    'on',
    new Value(true, (v) => console.log('On-State is now', v)),
    {
      '@type': 'OnOffProperty',
      title: 'On/Off',
      type: 'boolean',
      description: 'Whether the lamp is turned on',
    }));
```

The **`brightness`** property reports the brightness level of the light and sets the level. Like before, instead of actually setting the level of a light, we just log the level.

```javascript
light.addProperty(
  new Property(
    light,
    'brightness',
    new Value(50, v => console.log('Brightness is now', v)),
    {
      '@type': 'BrightnessProperty',
      title: 'Brightness',
      type: 'number',
      description: 'The level of light from 0-100',
      minimum: 0,
      maximum: 100,
      unit: 'percent',
    }));
```

Now we can add our newly created thing to the server and start it:

```javascript
// If adding more than one thing, use MultipleThings() with a name.
// In the single thing case, the thing's name will be broadcast.
const server = new WebThingServer(SingleThing(light), 8888);

process.on('SIGINT', () => {
  server.stop().then(() => process.exit()).catch(() => process.exit());
});

server.start().catch(console.error);
```

This will start the server, making the light available via the WoT REST API and announcing it as a discoverable resource on your local network via mDNS.

## Sensor

Let's now also connect a humidity sensor to the server we set up for our light.

A [`MultiLevelSensor`](https://iot.mozilla.org/schemas/#MultiLevelSensor) (a sensor that returns a level instead of just on/off) has one required property (besides the name, type, and optional description): **`level`**. We want to monitor this property and get notified if the value changes.

First we create a new Thing:

```javascript
const sensor = new Thing('urn:dev:ops:my-humidity-sensor-1234',
                         'My Humidity Sensor',
                         ['MultiLevelSensor'],
                         'A web connected humidity sensor');
```

Then we create and add the appropriate property:
* `level`: tells us what the sensor is actually reading
    * Contrary to the light, the value cannot be set via an API call, as it wouldn't make much sense, to SET what a sensor is reading. Therefore, we are creating a *readOnly* property.

    ```javascript
    const level = new Value(0.0);

    sensor.addProperty(
      new Property(
        sensor,
        'level',
        level,
        {
          '@type': 'LevelProperty',
          title: 'Humidity',
          type: 'number',
          description: 'The current humidity in %',
          minimum: 0,
          maximum: 100,
          unit: 'percent',
          readOnly: true,
        }));
    ```

Now we have a sensor that constantly reports 0%. To make it usable, we need a thread or some kind of input when the sensor has a new reading available. For this purpose we start a thread that queries the physical sensor every few seconds. For our purposes, it just calls a fake method.

```javascript
// Poll the sensor reading every 3 seconds
setInterval(() => {
  // Update the underlying value, which in turn notifies all listeners
  level.notifyOfExternalUpdate(readFromGPIO());
}, 3000);
```

This will update our `Value` object with the sensor readings via the `this.level.notifyOfExternalUpdate(readFromGPIO());` call. The `Value` object now notifies the property and the thing that the value has changed, which in turn notifies all websocket listeners.

# Adding to Gateway

To add your web thing to the WebThings Gateway, install the "Web Thing" add-on and follow the instructions [here](https://github.com/WebThingsIO/thing-url-adapter#readme).

# Resources

* https://iot.mozilla.org/things/
* https://hacks.mozilla.org/2018/05/creating-web-things-with-python-node-js-and-java/
* https://nodejs.org/en/
* https://github.com/rzr/webthing-iotjs/wiki
* https://youtu.be/Z-oiFl6gwGw
