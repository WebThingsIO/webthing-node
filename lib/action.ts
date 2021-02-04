/**
 * High-level Action base class implementation.
 */

import * as utils from './utils';
import { AnyType, Link, PrimitiveJsonType } from './types';
import Thing from './thing';

/**
 * An Action represents an individual action on a thing.
 */
class Action<InputType = AnyType> {
  private id: string;

  private thing: Thing;

  private name: string;

  private input: InputType;

  private hrefPrefix: string;

  private href: string;

  private status: string;

  private timeRequested: string;

  private timeCompleted: string | null;

  constructor(id: string, thing: Thing, name: string, input: InputType) {
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
  asActionDescription(): Action.ActionDescription {
    const description: Action.ActionDescription = {
      [this.name]: {
        href: this.hrefPrefix + this.href,
        timeRequested: this.timeRequested,
        status: this.status,
      },
    };

    if (this.input !== null) {
      description[this.name].input = <AnyType>(<unknown>this.input);
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
  setHrefPrefix(prefix: string): void {
    this.hrefPrefix = prefix;
  }

  /**
   * Get this action's ID.
   *
   * @returns {String} The ID.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get this action's name.
   *
   * @returns {String} The name.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get this action's href.
   *
   * @returns {String} The href.
   */
  getHref(): string {
    return this.hrefPrefix + this.href;
  }

  /**
   * Get this action's status.
   *
   * @returns {String} The status.
   */
  getStatus(): string {
    return this.status;
  }

  /**
   * Get the thing associated with this action.
   *
   * @returns {Object} The thing.
   */
  getThing(): Thing {
    return this.thing;
  }

  /**
   * Get the time the action was requested.
   *
   * @returns {String} The time.
   */
  getTimeRequested(): string {
    return this.timeRequested;
  }

  /**
   * Get the time the action was completed.
   *
   * @returns {String} The time.
   */
  getTimeCompleted(): string | null {
    return this.timeCompleted;
  }

  /**
   * Get the inputs for this action.
   *
   * @returns {Object} The inputs.
   */
  getInput(): InputType {
    return this.input;
  }

  /**
   * Start performing the action.
   */
  start(): void {
    this.status = 'pending';
    this.thing.actionNotify(<Action<AnyType>>(<unknown>this));
    this.performAction().then(
      () => this.finish(),
      () => this.finish()
    );
  }

  /**
   * Override this with the code necessary to perform the action.
   *
   * @returns {Object} Promise that resolves when the action is finished.
   */
  performAction(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Override this with the code necessary to cancel the action.
   *
   * @returns {Object} Promise that resolves when the action is cancelled.
   */
  cancel(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Finish performing the action.
   */
  finish(): void {
    this.status = 'completed';
    this.timeCompleted = utils.timestamp();
    this.thing.actionNotify(<Action<AnyType>>(<unknown>this));
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Action {
  interface ActionMetadata {
    title?: string;
    description?: string;
    links?: Link[];
    input?: {
      type?: PrimitiveJsonType;
      minimum?: number;
      maximum?: number;
      multipleOf?: number;
      enum?: readonly string[] | readonly number[];
    };
  }

  interface ActionDescription<InputType = AnyType> {
    [name: string]: {
      href: string;
      timeRequested: string;
      status: string;
      input?: InputType;
      timeCompleted?: string;
    };
  }

  export interface ActionTypeClass<InputType = AnyType> {
    new (thing: Thing, input: InputType): Action<InputType>;
  }
}

export = Action;
