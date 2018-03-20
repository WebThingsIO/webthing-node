# webthing

Implementation of an HTTP [Web Thing](https://iot.mozilla.org/wot/).

# Example

```javascript
const {Action, Event, Property, Thing, WebThingServer} = require('./index');
const uuidv4 = require('uuid/v4');

class OverheatedEvent extends Event {
  constructor(thing, data) {
    super(thing, 'overheated', data);
  }
}

class FadeAction extends Action {
  constructor(thing, input) {
    super(uuidv4(), thing, 'fade', input);
  }

  performAction() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.thing.setProperty('level', this.input.level);
        this.thing.addEvent(new OverheatedEvent(this.thing, 102));
        resolve();
      }, this.input.duration);
    });
  }
}

function run_server() {
  const thing = new Thing('My Lamp', 'thing', 'A web connected lamp');

  thing.addProperty(
    new Property(thing,
                 'on',
                 {type: 'boolean',
                  description: 'Whether the lamp is turned on'},
                 true));
  thing.addProperty(
    new Property(thing,
                 'level',
                 {type: 'number',
                  description: 'The level of light from 0-100',
                  minimum: 0,
                  maximum: 100},
                 50));

  thing.addAvailableAction(
    'fade',
    {description: 'Fade the lamp to a given level',
     input: {
       type: 'object',
       properties: {
         level: {
           type: 'number',
           minimum: 0,
           maximum: 100,
         },
         duration: {
           type: 'number',
           unit: 'milliseconds',
         },
       },
     }},
    FadeAction);

  thing.addAvailableEvent(
    'overheated',
    {description: 'The lamp has exceeded its safe operating temperature',
     type: 'number',
     unit: 'celcius'});

  const server = new WebThingServer(thing, 8888);

  process.on('SIGINT', () => {
    server.stop();
  });

  server.start();
}

run_server();
```
