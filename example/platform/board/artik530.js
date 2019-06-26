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

const {
  Thing,
} = require('webthing');

const AdcProperty = require('../adc/adc-property');
const GpioProperty = require('../gpio/gpio-property');

class ARTIK530Thing extends Thing {
  constructor(name, type, description) {
    super('urn:dev:ops:my-artik530-1234',
          name || 'ARTIK530',
          type || [],
          description || 'A web connected ARTIK530 or ARTIK720');
    const self = this;
    this.pinProperties = [
      new GpioProperty(this, 'RedLED', false,
                       {description:
                             'Red LED on interposer board (on GPIO28)'},
                       {direction: 'out', pin: 28}),
      new GpioProperty(this, 'BlueLED', false,
                       {description:
                             'Blue LED on interposer board (on GPIO38)'},
                       {direction: 'out', pin: 38}),
      new GpioProperty(this, 'Up', true,
                       {description:
                             'SW403 Button: Nearest board edge,\
 next to red LED (on GPIO30)'},
                       {direction: 'in', pin: 30}),
      new GpioProperty(this, 'Down', true,
                       {description:
                             'SW404 Button: Next to blue LED (on GPIO32)'},
                       {direction: 'in', pin: 32}),
      new AdcProperty(this, 'ADC0', 0,
                      {description: 'Analog port of ARTIK05x'},
                      {direction: 'in',
                       device: '/sys/bus/platform/devices\
/c0053000.adc/iio:device0/in_voltage0_raw'}),
      new AdcProperty(this, 'ADC1', 0,
                      {description: 'Analog port of ARTIK05x'},
                      {direction: 'in',
                       device: '/sys/bus/platform/devices/\
c0053000.adc/iio:device0/in_voltage1_raw'}),
    ];
    this.pinProperties.forEach((property) => {
      self.addProperty(property);
    });
  }

  close() {
    this.pinProperties.forEach((property) => {
      property.close && property.close();
    });
  }
}

module.exports = function() {
  if (!module.exports.instance) {
    module.exports.instance = new ARTIK530Thing();
  }
  return module.exports.instance;
};
