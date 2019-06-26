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

class TrafficPHatThing extends Thing {
  constructor(name, type, description) {
    super('urn:dev:ops:my-traffic-phat-1234',
          name || 'TrafficPHat',
          type || [],
          description || 'A web connected Traffic RaspberryPi Hat');
    const self = this;
    this.pinProperties = [
      new GpioProperty(this, 'Red', false, {
        description: 'LED on GPIO2 (Pin2)',
      }, {
        direction: 'out',
        pin: 2,
      }), new GpioProperty(this, 'Orange', false, {
        description: 'LED on GPIO3 (Pin5)',
      }, {
        direction: 'out',
        pin: 3,
      }), new GpioProperty(this, 'Green', false, {
        description: 'LED on GPIO4 (Pin7)',
      }, {
        direction: 'out',
        pin: 4,

      }), new GpioProperty(this, 'B1', true, {
        description: 'SW1 Sensor Button on GPIO3 (Pin33)',
      }, {
        direction: 'in',
        pin: 13,
      }), new GpioProperty(this, 'B2', true, {
        description: 'SW2 Sensor button on GPIO19 (Pin35)',
      }, {
        direction: 'in',
        pin: 19,
      }), new GpioProperty(this, 'B3', true, {
        description: 'SW3 Sensor button on GPIO26 (Pin37)',
      }, {
        direction: 'in',
        pin: 26,
      }),
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
    module.exports.instance = new TrafficPHatThing();
  }
  return module.exports.instance;
};
