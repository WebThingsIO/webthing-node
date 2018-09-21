/**
 * Utility functions.
 */

'use strict';

const internalIp = require('internal-ip');

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
    return internalIp.v4().then((addr) => {
      if (!addr) {
        return '127.0.0.1';
      }

      return addr;
    }).catch(() => '127.0.0.1');
  },
};
