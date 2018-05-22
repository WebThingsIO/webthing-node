const {
  Action,
  Event,
  MultipleThings,
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

/**
 * A dimmable light that logs received commands to stdout.
 */
class ExampleDimmableLight extends Thing {
  constructor() {
    super('My Lamp', 'dimmableLight', 'A web connected lamp');

    this.addAvailableAction(
      'fade',
      {
        description: 'Fade the lamp to a given level',
        input: {
          type: 'object',
          required: [
            'level',
            'duration',
          ],
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
        },
      },
      FadeAction);

    this.addAvailableEvent(
      'overheated',
      {description: 'The lamp has exceeded its safe operating temperature',
       type: 'number',
       unit: 'celsius'});

    this.addProperty(this.getOnProperty());
    this.addProperty(this.getLevelProperty());
  }

  getOnProperty() {
    return new Property(
      this,
      'on',
      new Value(true, (v) => console.log('On-State is now', v)),
      {type: 'boolean',
       description: 'Whether the lamp is turned on'});
  }

  getLevelProperty() {
    return new Property(
      this,
      'level',
      new Value(50, (l) => console.log('New light level is', l)),
      {type: 'number',
       description: 'The level of light from 0-100',
       minimum: 0,
       maximum: 100});
  }
}

/**
 * A humidity sensor which updates its measurement every few seconds.
 */
class FakeGpioHumiditySensor extends Thing {
  constructor() {
    super('My Humidity Sensor',
          'multiLevelSensor',
          'A web connected humidity sensor');

    this.addProperty(
      new Property(this,
                   'on',
                   new Value(true),
                   {type: 'boolean',
                    description: 'Whether the sensor is on'}));

    this.level = new Value(0.0);
    this.addProperty(
      new Property(this,
                   'level',
                   this.level,
                   {type: 'number',
                    description: 'The current humidity in %',
                    unit: '%'}));

    // Poll the sensor reading every 3 seconds
    setInterval(() => {
      // Update the underlying value, which in turn notifies all listeners
      this.level.notifyOfExternalUpdate(this.readFromGPIO());
    }, 3000);
  }

  /**
   * Mimic an actual sensor updating its reading every couple seconds.
   */
  readFromGPIO() {
    return 70.0 * Math.random() * (-0.5 + Math.random());
  }
}

function runServer() {
  // Create a thing that represents a dimmable light
  const light = new ExampleDimmableLight();

  // Create a thing that represents a humidity sensor
  const sensor = new FakeGpioHumiditySensor();

  // If adding more than one thing, use MultipleThings() with a name.
  // In the single thing case, the thing's name will be broadcast.
  const server = new WebThingServer(new MultipleThings([light, sensor],
                                                       'LightAndTempDevice'),
                                    8888);

  process.on('SIGINT', () => {
    server.stop();
    process.exit();
  });

  server.start();
}

runServer();
