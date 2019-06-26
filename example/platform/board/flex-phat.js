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

const GpioProperty = require('../gpio/gpio-property');

class FlexPHatThing extends Thing {
  constructor(name, type, description) {
    super('urn:dev:ops:my-flex-phat-1234',
          name || 'FlexPHat',
          type || [],
          description || 'A web connected Flex RaspberryPi Hat');
    const self = this;
    this.gpioProperties = [
      new GpioProperty(this, 'Relay', false,
                       {description:
                             'Actuator (on GPIO5)'},
                       {direction: 'out', pin: 5}),
      new GpioProperty(this, 'BlueLED', false,
                       {description:
                             'Actuator (on GPIO13)'},
                       {direction: 'out', pin: 13}),
      new GpioProperty(this, 'GreenLED', false,
                       {description:
                             'Actuator (on GPIO19)'},
                       {direction: 'out', pin: 19}),
      new GpioProperty(this, 'RedLED', false,
                       {description:
                             'Actuator (on GPIO26)'},
                       {direction: 'out', pin: 26}),
      new GpioProperty(this, 'Button', false,
                       {description:
                             'Push Button (on GPIO11)'},
                       {direction: 'in', pin: 11}),
      new GpioProperty(this, 'GPIO23', false,
                       {description:
                             'Input on GPIO 23 (unwired but modable)'},
                       {direction: 'in', pin: 23}),
    ];
    this.gpioProperties.forEach((property) => {
      self.addProperty(property);
    });
  }

  close() {
    this.gpioProperties.forEach((property) => {
      property.close && property.close();
    });
  }
}

module.exports = function() {
  if (!module.exports.instance) {
    module.exports.instance = new FlexPHatThing();
  }
  return module.exports.instance;
};
