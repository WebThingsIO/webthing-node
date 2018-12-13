// -*- mode: js; js-indent-level:2;  -*-
// SPDX-License-Identifier: MPL-2.0

/**
 *
 * Copyright 2018-present Samsung Electronics France SAS, and other contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

const console = require('console');

// Disable logs here by editing to '!console.log'
const log = console.log || function() {};

const {
  Property,
  Value,
} = require('webthing');

const gpio = require('gpio');

class GpioOutProperty extends Property {
  constructor(thing, name, value, metadata, config) {
    super(thing, name, new Value(Boolean(value)),
          {
            '@type': 'OnOffProperty',
            title: (metadata && metadata.title) || `On/Off: ${name}`,
            type: 'boolean',
            description: (metadata && metadata.description) ||
              (`GPIO Actuator on pin=${config.pin}`),
          });
    const self = this;
    this.config = config;
    this.port = gpio.export(config.pin,
                            {direction: 'out',
                             ready: () => {
                               log(`log: GPIO: ${self.getName()}: open:`);
                               self.value.valueForwarder = (value) => {
                                 try {
                                   log(`log: GPIO: ${self.getName()}: \
writing: ${value}`);
                                   self.port.set(value);
                                 } catch (err) {
                                   console.error(`error: GPIO: 
${self.getName()}: Fail to write: ${err}`);
                                   return err;
                                 }
                               };
                             }});
  }

  close() {
    try {
      this.port && this.port.unexport(this.config.pin);
    } catch (err) {
      console.error(`error: GPIO: ${this.getName()}: Fail to close: ${err}`);
      return err;
    }
    log(`log: GPIO: ${this.getName()}: close:`);
  }
}

class GpioInProperty extends Property {
  constructor(thing, name, value, metadata, config) {
    super(thing, name, new Value(Boolean(value)),
          {
            '@type': 'BooleanProperty',
            title: (metadata && metadata.title) || `On/Off: ${name}`,
            type: 'boolean',
            readOnly: true,
            description:
            (metadata && metadata.description) ||
              (`GPIO Sensor on pin=${config.pin}`),
          });
    const self = this;
    this.config = config;
    const callback = () => {
      log(`log: GPIO: ${self.getName()}: open:`);
      self.port.on('change', (value) => {
        value = Boolean(value);
        log(`log: GPIO: ${self.getName()}: change: ${value}`);
        self.value.notifyOfExternalUpdate(value);
      });
    };
    this.port = gpio.export(config.pin,
                            {direction: 'in', ready: callback});
  }

  close() {
    try {
      this.port && this.port.unexport(this.config.pin);
    } catch (err) {
      console.error(`error: GPIO: ${this.getName()} close:${err}`);
      return err;
    }
    log(`log: GPIO: ${this.getName()}: close:`);
  }
}

function GpioProperty(thing, name, value, metadata, config) {
  if (config.direction === 'out') {
    return new GpioOutProperty(thing, name, value, metadata, config);
  } else if (config.direction === 'in') {
    return new GpioInProperty(thing, name, value, metadata, config);
  }
  throw 'error: Invalid param';
}

module.exports = GpioProperty;
