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

const {
  Thing,
} = require('webthing');

const AdcProperty = require('../adc/adc-property');
const PwmProperty = require('../pwm/pwm-property');


class ARTIK1020Thing extends Thing {
  constructor(name, type, description) {
    super('urn:dev:ops:my-artik1020-1234',
          name || 'ARTIK1020',
          type || [],
          description || 'A web connected ARTIK1020');
    const self = this;
    this.pinProperties = [
      new AdcProperty(this, 'ADC0', 0,
                      {description: 'A0 on J24 of board'},
                      {direction: 'in',
                       device: '/sys/devices/12d10000.adc/iio:device0\
/in_voltage0_raw'}),
      new AdcProperty(this, 'ADC1', 0,
                      {description: 'A1 on J24 of board'},
                      {direction: 'in',
                       device: '/sys/devices/12d10000.adc/iio:device0\
/in_voltage1_raw'}),
      new AdcProperty(this, 'ADC2', 0,
                      {description: 'A2 on J24 of board'},
                      {direction: 'in',
                       device: '/sys/devices/12d10000.adc/iio:device0\
/in_voltage2_raw'}),
      new AdcProperty(this, 'ADC3', 0,
                      {description: 'A3 on J24 of board'},
                      {direction: 'in',
                       device: '/sys/devices/12d10000.adc/iio:device0\
/in_voltage5_raw'}),
      new AdcProperty(this, 'ADC4', 0,
                      {description: 'A4 on J24 of board'},
                      {direction: 'in',
                       device: '/sys/devices/12d10000.adc/iio:device0\
/in_voltage6_raw'}),
      new AdcProperty(this, 'ADC5', 0,
                      {description: 'A5 on J24 of board'},
                      {direction: 'in',
                       device: '/sys/devices/12d10000.adc/iio:device0\
/in_voltage7_raw'}),
      new PwmProperty(this, 'PWM0', 50,
                      {description: 'XPWMO1 on J26[6] of board (pwm0)'}),

      new PwmProperty(this, 'PWM1', 50,
                      {description: 'XPWMO0 on J26[5] of board (pwm1)'},
                      {pwm: {pin: 1}}),
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
    module.exports.instance = new ARTIK1020Thing();
  }
  return module.exports.instance;
};
