/**
 * Utility functions.
 */

'use strict';

const os = require('os');

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
   * Get all IP addresses.
   *
   * @returns {string[]} Array of addresses.
   */
  getAddresses: function() {
    const addresses = new Set();

    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach((iface) => {
      ifaces[iface].forEach((addr) => {
        const address = addr.address.toLowerCase();

        // Filter out link-local addresses.
        if (addr.family === 'IPv6' && !address.startsWith('fe80:')) {
          addresses.add(`[${address}]`);
        } else if (addr.family === 'IPv4' && !address.startsWith('169.254.')) {
          addresses.add(address);
        }
      });
    });

    return Array.from(addresses).sort();
  },
};
