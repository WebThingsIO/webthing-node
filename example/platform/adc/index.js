// -*- mode: js; js-indent-level:2;  -*-
// SPDX-License-Identifier: ISC
/**
 * Copyright 2018-present Samsung Electronics France SAS, and other contributors
 *
 * This Source Code Form is subject to the terms of the ICS Licence:
 * https://spdx.org/licenses/ISC.html#licenseText
 */

const fs = require('fs');

function Adc() {
  this.open = function(config, callback) {
    this.config = config;
    fs.access(config.device, fs.R_OK, callback);
    return this;
  };

  this.readSync = function() {
    const contents = fs.readFileSync(this.config.device, 'ascii');
    return contents;
  };

  this.closeSync = function() {
  };
}

module.exports = new Adc();
