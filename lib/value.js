/**
 * An observable, settable value interface.
 */

'use strict';

const EventEmitter = require('events');

/**
 * A property value.
 *
 * This is used for communicating between the Thing representation and the
 * actual physical thing implementation.
 *
 * Notifies all observers when the underlying value changes through an external
 * update (command to turn the light off) or if the underlying sensor reports a
 * new value.
 */
class Value extends EventEmitter {
  /**
   * Initialize the object.
   *
   * @param {*} initialValue The initial value
   * @param {function} setter The method that updates the actual value on the
   *                          thing
   */
  constructor(initialValue, setter) {
    super();
    this.lastValue = initialValue;
    if (!setter) {
      this.setter = () => {throw new Error('Read-only value');};
    } else {
      this.setter = setter;
    }
  }

  /**
   * Set a new value for this thing.
   *
   * @param {*} value Value to set
   */
  set(value) {
    this.setter(value);
    this.notifyOfExternalUpdate(value);
  }

  /**
   * Return the last known value from the underlying thing.
   *
   * @returns the value.
   */
  get() {
    return this.lastValue;
  }

  /**
   * Notify observers of a new value.
   *
   * @param {*} value New value
   */
  notifyOfExternalUpdate(value) {
    if (typeof value !== 'undefined' &&
        value !== null &&
        value !== this.lastValue) {
      this.lastValue = value;
      this.emit('update', value);
    }
  }
}

module.exports = Value;
