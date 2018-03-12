# webthing

Implementation of an HTTP [Web Thing](https://iot.mozilla.org/wot/).

# Example

```javascript
'use strict';

const {Action, Event, Property, Thing, WebThingServer} = require('webthing');
const uuidv4 = require('uuid/v4');

class RebootEvent extends Event {
  constructor(thing) {
    super(thing, 'reboot', 'Going down for reboot');
  }
}

class RebootAction extends Action {
  constructor(thing, params) {
    super(uuidv4(), thing, 'reboot', params);
  }

  performAction() {
    return new Promise((resolve, reject) => {
      this.thing.addEvent(new RebootEvent(this.thing));
      resolve();
    });
  }
}

function run_server() {
  const thing = new Thing('WoT Pi', 'thing', 'A WoT-connected Raspberry Pi');

  thing.addProperty(
    new Property(thing,
                 'temperature',
                 {type: 'number',
                  unit: 'celsius',
                  description: 'An ambient temperature sensor'}));
  thing.addProperty(
    new Property(thing,
                 'humidity',
                 {type: 'number',
                  unit: 'percent'}));
  thing.addProperty(
    new Property(thing,
                 'led',
                 {type: 'boolean',
                  description: 'A red LED'}));

  thing.addActionDescription('reboot', 'Reboot the device', RebootAction);
  thing.addEventDescription('reboot', 'Going down for reboot');

  const server = new WebThingServer(thing, 8888);
  server.start();
}

run_server();
```
