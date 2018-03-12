/**
 * Utility functions.
 */

'use strict';

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
};
