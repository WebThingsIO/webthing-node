/**
 * High-level Event base class implementation.
 */

import Thing from './thing';
import * as utils from './utils';
import { AnyType, PrimitiveJsonType, Link } from './types';

/**
 * An Event represents an individual event from a thing.
 */
class Event<Data = AnyType> {
  private thing: Thing;

  private name: string;

  private data: Data | null;

  private time: string;

  /**
   * Initialize the object.
   *
   * @param {Object} thing Thing this event belongs to
   * @param {String} name Name of the event
   * @param {*} data (Optional) Data associated with the event
   */
  constructor(thing: Thing, name: string, data?: Data) {
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
  asEventDescription(): Event.EventDescription {
    const description: Event.EventDescription = {
      [this.name]: {
        timestamp: this.time,
      },
    };

    if (this.data !== null) {
      description[this.name].data = <AnyType>(<unknown>this.data);
    }

    return description;
  }

  /**
   * Get the thing associated with this event.
   *
   * @returns {Object} The thing.
   */
  getThing(): Thing {
    return this.thing;
  }

  /**
   * Get the event's name.
   *
   * @returns {String} The name.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the event's data.
   *
   * @returns {*} The data.
   */
  getData(): Data | null {
    return this.data;
  }

  /**
   * Get the event's timestamp.
   *
   * @returns {String} The time.
   */
  getTime(): string {
    return this.time;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Event {
  interface EventDescription {
    [name: string]: {
      timestamp: string;
      data?: AnyType;
    };
  }

  interface EventMetadata {
    type?: PrimitiveJsonType;
    '@type'?: string;
    unit?: string;
    title?: string;
    description?: string;
    links?: Link[];
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    enum?: readonly string[] | readonly number[];
  }
}

export = Event;
