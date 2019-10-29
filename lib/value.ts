/**
 * An observable, settable value interface.
 */

'use strict';

import EventEmitter from 'events';

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

  private lastValue: any

  private valueForwarder: ((value: any) => void) |null

  /**
   * Initialize the object.
   *
   * @param {*} initialValue The initial value
   * @param {function?} valueForwarder The method that updates the actual value
   *                                   on the thing
   */
  constructor(initialValue: any,
              valueForwarder: ((value: any) => void)|null = null) {
    super();
    this.lastValue = initialValue;
    this.valueForwarder = valueForwarder;
  }

  /**
   * Set a new value for this thing.
   *
   * @param {*} value Value to set
   */
  set(value: any): void {
    if (this.valueForwarder) {
      this.valueForwarder(value);
    }

    this.notifyOfExternalUpdate(value);
  }

  /**
   * Return the last known value from the underlying thing.
   *
   * @returns the value.
   */
  get(): any {
    return this.lastValue;
  }

  /**
   * Notify observers of a new value.
   *
   * @param {*} value New value
   */
  notifyOfExternalUpdate(value: any): void {
    if (typeof value !== 'undefined' &&
        value !== null &&
        value !== this.lastValue) {
      this.lastValue = value;
      this.emit('update', value);
    }
  }
}

export = Value;
