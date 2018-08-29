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

class ARTIK530Thing extends Thing {
  constructor(name, type, description) {
    super(name || 'ARTIK530',
          type || [],
          description || 'A web connected ARTIK530 or ARTIK720');
    const _this = this;
    this.gpioProperties = [
      new GpioProperty(this, 'RedLED', false,
                       {description:
                             'Red LED on interposer board (on GPIO28)'},
                       {direction: 'out', pin: 28}),
      new GpioProperty(this, 'BlueLED', false,
                       {description:
                             'Blue LED on interposer board (on GPIO38)'},
                       {direction: 'out', pin: 38}),
      new GpioProperty(this, 'Up', false,
                       {description:
                             'SW403 Button: Nearest board edge,\
 next to red LED (on GPIO30)'},
                       {direction: 'in', pin: 30}),
      new GpioProperty(this, 'Down', false,
                       {description:
                             'SW404 Button: Next to blue LED (on GPIO32)'},
                       {direction: 'in', pin: 32}),
    ];
    this.gpioProperties.forEach((property) => {
      _this.addProperty(property);
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
    module.exports.instance = new ARTIK530Thing();
  }
  return module.exports.instance;
};
