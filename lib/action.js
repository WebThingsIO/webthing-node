/**
 * High-level Action base class implementation.
 */

'use strict';

const utils = require('./utils');

/**
 * An Action represents an individual action on a thing.
 */
class Action {
  constructor(id, thing, name, params) {
    /**
     * Initialize the object.
     *
     * @param {String} id ID of this action
     * @param {Object} thing Thing this action belongs to
     * @param {String} name of the action
     */
    this.id = id;
    this.thing = thing;
    this.name = name;
    this.params = params;
    this.href = `/actions/${this.name}/${this.id}`;
    this.status = 'created';
    this.timeRequested = utils.timestamp();
    this.timeCompleted = null;
    this.thing.actionNotify(this);
  }

  /**
   * Get the action description.
   *
   * @returns {Object} Description of the action as an object.
   */
  asActionDescription() {
    const description = {
      [this.name]: {
        href: this.href,
        timeRequested: this.timeRequested,
        status: this.status,
      },
    };

    if (this.timeCompleted !== null) {
      description[this.name]['timeCompleted'] = this.timeCompleted;
    }

    return description;
  }

  /**
   * Start performing the action.
   */
  start() {
    this.status = 'pending';
    this.thing.actionNotify(this);
    this.performAction().then(() => this.finish(), () => this.finish());
  }

  /**
   * Override this with the code necessary to perform the action.
   *
   * @returns {Object} Promise that resolves when the action is finished.
   */
  performAction() {
    return Promise.resolve();
  }

  /**
   * Override this with the code necessary to cancel the action.
   *
   * @returns {Object} Promise that resolves when the action is cancelled.
   */
  cancel() {
    return Promise.resolve();
  }

  /**
   * Finish performing the action.
   */
  finish() {
    this.status = 'completed';
    this.timeCompleted = utils.timestamp();
    this.thing.actionNotify(this);
  }
}

module.exports = Action;
