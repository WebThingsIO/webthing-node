/**
 * High-level Action base class implementation.
 */

'use strict';

const utils = require('./utils');

/**
 * An Action represents an individual action on a thing.
 */
class Action {
  constructor(id, thing, name, input) {
    /**
     * Initialize the object.
     *
     * @param {String} id ID of this action
     * @param {Object} thing Thing this action belongs to
     * @param {String} name Name of the action
     * @param {Object} input Any action inputs
     */
    this.id = id;
    this.thing = thing;
    this.name = name;
    this.input = input;
    this.hrefPrefix = '';
    this.href = `/actions/${this.name}/${this.id}`;
    this.status = 'created';
    this.timeRequested = utils.timestamp();
    this.timeCompleted = null;
  }

  /**
   * Get the action description.
   *
   * @returns {Object} Description of the action as an object.
   */
  asActionDescription() {
    const description = {
      [this.name]: {
        href: this.hrefPrefix + this.href,
        timeRequested: this.timeRequested,
        status: this.status,
      },
    };

    if (this.input !== null) {
      description[this.name].input = this.input;
    }

    if (this.timeCompleted !== null) {
      description[this.name].timeCompleted = this.timeCompleted;
    }

    return description;
  }

  /**
   * Set the prefix of any hrefs associated with this action.
   *
   * @param {String} prefix The prefix
   */
  setHrefPrefix(prefix) {
    this.hrefPrefix = prefix;
  }

  /**
   * Get this action's ID.
   *
   * @returns {String} The ID.
   */
  getId() {
    return this.id;
  }

  /**
   * Get this action's name.
   *
   * @returns {String} The name.
   */
  getName() {
    return this.name;
  }

  /**
   * Get this action's href.
   *
   * @returns {String} The href.
   */
  getHref() {
    return this.hrefPrefix + this.href;
  }

  /**
   * Get this action's status.
   *
   * @returns {String} The status.
   */
  getStatus() {
    return this.status;
  }

  /**
   * Get the thing associated with this action.
   *
   * @returns {Object} The thing.
   */
  getThing() {
    return this.thing;
  }

  /**
   * Get the time the action was requested.
   *
   * @returns {String} The time.
   */
  getTimeRequested() {
    return this.timeRequested;
  }

  /**
   * Get the time the action was completed.
   *
   * @returns {String} The time.
   */
  getTimeCompleted() {
    return this.timeCompleted;
  }

  /**
   * Get the inputs for this action.
   *
   * @returns {Object} The inputs.
   */
  getInput() {
    return this.input;
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
