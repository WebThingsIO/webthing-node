/**
 * Utility functions.
 */

'use strict';

const localIPv4Address = require('local-ipv4-address');

module.exports = {
  /**
   * Get the current time.
   *
   * @returns {String} The current time in the form YYYY-mm-ddTHH:MM:SS+00:00
   */
  timestamp: function() {
    const date = new Date().toISOString();
    return date.replace(/\.\d{3}Z/, '+00:00');
  },

  /**
   * Get the default local IP address.
   *
   * @returns {Promise} which resolves to the IP address as a string.
   */
  getIP: function() {
    return localIPv4Address();
  },
};
