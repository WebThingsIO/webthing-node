/**
 * High-level Event base class implementation.
 */

'use strict';

const utils = require('./utils');

/**
 * An Event represents an individual event from a thing.
 */
class Event {
  /**
   * Initialize the object.
   *
   * @param {Object} thing Thing this event belongs to
   * @param {String} name Name of the event
   * @param {String} description (Optional) Description of the event
   */
  constructor(thing, name, description) {
    this.thing = thing;
    this.name = name;
    this.description = description || '';
    this.time = utils.timestamp();
  }

  /**
   * Get the event description.
   *
   * @returns {Object} Description of the event as an object.
   */
  asEventDescription() {
    return {
      [this.name]: {
        timestamp: this.time,
      },
    };
  }

  /**
   * Get the thing associated with this event.
   *
   * @returns {Object} The thing.
   */
  getThing() {
    return this.thing;
  }

  /**
   * Get the event's name.
   *
   * @returns {String} The name.
   */
  getName() {
    return this.name;
  }

  /**
   * Get the event's description.
   *
   * @returns {String} The description.
   */
  getDescription() {
    return this.description;
  }

  /**
   * Get the event's timestamp.
   *
   * @returns {String} The time.
   */
  getTime() {
    return this.time;
  }
}

module.exports = Event;
