// -*- mode: js; js-indent-level:2;  -*-
// SPDX-License-Identifier: MPL-2.0

/**
 *
 * Copyright 2018-present Samsung Electronics France SAS, and other contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */
const console = require('console');

// Disable logs here by editing to '!console.log'
const log = console.log || function() {};
const verbose = !console.log || function() {};

const {
  Property,
  Value,
} = require('webthing');

const pwm = require('pwm');

class PwmOutProperty extends Property {
  constructor(thing, name, value, metadata, config) {
    if (typeof config === 'undefined') {
      config = {};
    }
    super(thing, name, new Value(Number(value)),
          {
            '@type': 'LevelProperty',
            title: (metadata && metadata.title) || `PWM: ${name} (dutyCycle)`,
            type: 'integer',
            minimum: config.minimum || 0,
            maximum: config.maximum || 100,
            readOnly: false,
            unit: 'percent',
            description:
            (metadata && metadata.description) ||
              (`PWM DutyCycle`),
          });
    const self = this;
    this.config = config;
    if (typeof this.config.pwm == 'undefined') {
      this.config.pwm = {};
    }
    if (typeof this.config.pwm.pin == 'undefined') {
      this.config.pwm.pin = 0;
    }

    if (typeof this.config.pwm.chip == 'undefined') {
      this.config.pwm.chip = 0;
    }
    // secs (eg: 50Hz = 20 ms = 0.02 sec)
    if (typeof this.config.pwm.period == 'undefined') {
      this.config.pwm.period = 0.02;
    }
    // [0..1]
    if (typeof this.config.pwm.dutyCycle == 'undefined') {
      this.config.pwm.dutyCycle = 0.5;
    }
    verbose(`log: opening: ${this.getName()}`);
    this.port = pwm.export(
      this.config.pwm.chip, this.config.pwm.pin,
      (err) => {
        verbose(`log: PWM: ${self.getName()}: open: ${err}`);
        if (err) {
          console.error(`error: PWM: ${self.getName()}: open: ${err}`);
          throw err;
        }
        self.port.freq = 1 / self.config.pwm.period;
        // Linux sysfs uses usecs units
        self.port.setPeriod(
          self.config.pwm.period * 1.E9,
          () => {
            self.port.setDutyCycle(
              self.config.pwm.dutyCycle * (self.config.pwm.period * 1.E9),
              () => {
                self.port.setEnable(1, () => {
                  verbose(`log: ${self.getName()}: Enabled`);
                });
              });
          });

        self.value.valueForwarder = (value) => {
          const usec = Math.floor((self.config.pwm.period * 1.E9) *
                                  (Number(value) / 100.0));
          self.port.setDutyCycle(usec, () => {
            verbose(`log: setDutyCycle: usec=${usec}`);
          });
        };
      });
  }

  close() {
    verbose(`log: PWM: ${this.getName()}: close:`);
    try {
      this.port && this.port.unexport();
    } catch (err) {
      console.error(`error: PWM: ${this.getName()} close:${err}`);
      return err;
    }
    log(`log: PWM: ${this.getName()}: close:`);
  }
}


module.exports = PwmOutProperty;


if (module.parent === null) {
  new PwmOutProperty;
}
