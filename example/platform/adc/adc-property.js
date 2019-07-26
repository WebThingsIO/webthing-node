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
const verbose = !console.log || function() {};

const {
  Property,
  Value,
} = require('webthing');

const adc = require('../adc');

class AdcInProperty extends Property {
  constructor(thing, name, value, metadata, config) {
    super(thing, name, new Value(Number(value)),
          {
            '@type': 'LevelProperty',
            title: (metadata && metadata.title) || `Level: ${name}`,
            type: 'number',
            readOnly: true,
            description:
            (metadata && metadata.description) ||
              (`ADC Sensor on pin=${config.pin}`),
          });
    const self = this;
    config.frequency = config.frequency || 1;
    config.range = config.range || 0xFFF;
    this.period = 1000.0 / config.frequency;
    this.config = config;
    this.port = adc.open(config, (err) => {
      log(`log: ADC: ${self.getName()}: open: ${err} (null expected)`);
      if (err) {
        console.error(`error: ADC: ${self.getName()}: Fail to open:\
 ${config.pin}`);
        return null;
      }
      self.inverval = setInterval(() => {
        let value = Number(self.port.readSync());
        verbose(`log: ADC:\
 ${self.getName()}: update: 0x${value.toString(0xF)}`);
        value = Number(Math.floor(100.0 * value / self.config.range));
        if (value !== self.lastValue) {
          log(`log: ADC: ${self.getName()}: change: ${value}%`);
          self.value.notifyOfExternalUpdate(value);
          self.lastValue = value;
        }
      }, self.period);
    });
  }

  close() {
    try {
      this.inverval && clearInterval(this.inverval);
      this.port && this.port.closeSync();
    } catch (err) {
      console.error(`error: ADC: ${this.getName()} close:${err}`);
      return err;
    }
    log(`log: ADC: ${this.getName()}: close:`);
  }
}

function AdcProperty(thing, name, value, metadata, config) {
  if (config.direction === 'in') {
    return new AdcInProperty(thing, name, value, metadata, config);
  }
  throw 'error: Invalid param';
}

module.exports = AdcProperty;
