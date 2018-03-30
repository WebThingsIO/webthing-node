const {
  Action,
  Event,
  Property,
  Thing,
  Value,
  WebThingServer,
} = require('../index');
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

function makeThing() {
  const thing = new Thing('My Lamp', 'thing', 'A web connected lamp');

  thing.addProperty(
    new Property(thing,
                 'on',
                 new Value(true, () => {}),
                 {type: 'boolean',
                  description: 'Whether the lamp is turned on'}));
  thing.addProperty(
    new Property(thing,
                 'level',
                 new Value(50, () => {}),
                 {type: 'number',
                  description: 'The level of light from 0-100',
                  minimum: 0,
                  maximum: 100}));

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
     unit: 'celsius'});

  return thing;
}

function runServer() {
  const thing = makeThing();

  // If adding more than one thing here, be sure to set the second
  // parameter to some string, which will be broadcast via mDNS.
  // In the single thing case, the thing's name will be broadcast.
  const server = new WebThingServer([thing], null, 8888);

  process.on('SIGINT', () => {
    server.stop();
    process.exit();
  });

  server.start();
}

runServer();
