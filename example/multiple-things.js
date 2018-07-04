const {
  Action,
  Event,
  MultipleThings,
  Property,
  Thing,
  Value,
  WebThingServer,
} = require('webthing');
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
        this.thing.setProperty('brightness', this.input.brightness);
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
    super('My Lamp', ['OnOffSwitch', 'Light'], 'A web connected lamp');

    this.addProperty(
      new Property(
        this,
        'on',
        new Value(true, (v) => console.log('On-State is now', v)),
        {
          '@type': 'OnOffProperty',
          label: 'On/Off',
          type: 'boolean',
          description: 'Whether the lamp is turned on',
        }));

    this.addProperty(
      new Property(
        this,
        'brightness',
        new Value(50, (v) => console.log('Brightness is now', v)),
        {
          '@type': 'BrightnessProperty',
          label: 'Brightness',
          type: 'number',
          description: 'The level of light from 0-100',
          minimum: 0,
          maximum: 100,
          unit: 'percent',
        }));

    this.addAvailableAction(
      'fade',
      {
        label: 'Fade',
        description: 'Fade the lamp to a given level',
        input: {
          type: 'object',
          required: [
            'brightness',
            'duration',
          ],
          properties: {
            brightness: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              unit: 'percent',
            },
            duration: {
              type: 'number',
              minimum: 1,
              unit: 'milliseconds',
            },
          },
        },
      },
      FadeAction);

    this.addAvailableEvent(
      'overheated',
      {
        description: 'The lamp has exceeded its safe operating temperature',
        type: 'number',
        unit: 'celsius',
      });
  }
}

/**
 * A humidity sensor which updates its measurement every few seconds.
 */
class FakeGpioHumiditySensor extends Thing {
  constructor() {
    super('My Humidity Sensor',
          ['MultiLevelSensor'],
          'A web connected humidity sensor');

    this.level = new Value(0.0);
    this.addProperty(
      new Property(
        this,
        'level',
        this.level,
        {
          '@type': 'LevelProperty',
          label: 'Humidity',
          type: 'number',
          description: 'The current humidity in %',
          minimum: 0,
          maximum: 100,
          unit: 'percent',
        }));

    // Poll the sensor reading every 3 seconds
    setInterval(() => {
      // Update the underlying value, which in turn notifies all listeners
      const newLevel = this.readFromGPIO();
      console.log('setting new humidity level:', newLevel);
      this.level.notifyOfExternalUpdate(newLevel);
    }, 3000);
  }

  /**
   * Mimic an actual sensor updating its reading every couple seconds.
   */
  readFromGPIO() {
    return Math.abs(70.0 * Math.random() * (-0.5 + Math.random()));
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
