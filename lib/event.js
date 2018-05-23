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
   * @param {*} data (Optional) Data associated with the event
   */
  constructor(thing, name, data) {
    this.thing = thing;
    this.name = name;
    this.data = typeof data !== 'undefined' ? data : null;
    this.time = utils.timestamp();
  }

  /**
   * Get the event description.
   *
   * @returns {Object} Description of the event as an object.
   */
  asEventDescription() {
    const description = {
      [this.name]: {
        timestamp: this.time,
      },
    };

    if (this.data !== null) {
      description[this.name].data = this.data;
    }

    return description;
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
   * Get the event's data.
   *
   * @returns {*} The data.
   */
  getData() {
    return this.data;
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
