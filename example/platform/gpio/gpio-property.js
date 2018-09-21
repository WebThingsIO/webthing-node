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
    const valueObject = new Value(value, (value) => {
      this.handleValueChanged && this.handleValueChanged(value);
    });
    super(thing, name, valueObject,
          {
            '@type': 'OnOffProperty',
            label: (metadata && metadata.label) || `On/Off: ${name}`,
            type: 'boolean',
            description: (metadata && metadata.description) ||
              (`GPIO Actuator on pin=${config.pin}`),
          });
    const _this = this;
    this.config = config;

    this.port = gpio.export(config.pin,
                            {direction: 'out',
                             ready: () => {
                               log(`log: GPIO: ${_this.getName()}: open:`);
                               _this.handleValueChanged = (value) => {
                                 try {
                                   log(`log: GPIO: ${_this.getName()}: \
writing: ${value}`);
                                   _this.port.set(value);
                                 } catch (err) {
                                   console.error(`error: GPIO: 
${_this.getName()}: Fail to write: ${err}`);
                                   return err;
                                 }
                               };
                             }});
  }

  close() {
    const _this = this;
    try {
      this.port && this.port.unexport(this.config.pin);
    } catch (err) {
      console.error(`error: GPIO: ${this.getName()}: Fail to close: ${err}`);
      return err;
    }
    log(`log: GPIO: ${_this.getName()}: close:`);
  }
}


class GpioInProperty extends Property {
  constructor(thing, name, value, metadata, config) {
    super(thing, name, new Value(Boolean(value)),
          {
            '@type': 'BooleanProperty',
            label: (metadata && metadata.label) || `On/Off: ${name}`,
            type: 'boolean',
            readOnly: true,
            description:
            (metadata && metadata.description) ||
              (`GPIO Sensor on pin=${config.pin}`),
          });
    const _this = this;
    this.config = config;
    const callback = () => {
      log(`log: GPIO: ${_this.getName()}: open:`);
      _this.port.on('change', (value) => {
        value = Boolean(value);
        log(`log: GPIO: ${_this.getName()}: change: ${value}`);
        _this.value.notifyOfExternalUpdate(value);
      });
    };
    this.port = gpio.export(config.pin,
                            {direction: 'in', ready: callback});
  }

  close() {
    const _this = this;
    try {
      this.inverval && clearInterval(this.inverval);
      this.port && this.port.unexport(this.config.pin);
    } catch (err) {
      console.error(`error: GPIO: ${this.getName()} close:${err}`);
      return err;
    }
    log(`log: GPIO: ${_this.getName()}: close:`);
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
