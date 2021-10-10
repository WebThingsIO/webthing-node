/**
 * High-level Thing base class implementation.
 */

import Ajv from 'ajv';
import Property from './property';
import Event from './event';
import Action from './action';
import { AnyType, Link, Subscriber } from './types';

const ajv = new Ajv();

/**
 * A Web Thing.
 */
class Thing {
  private id: string;

  private title: string;

  private type: string[];

  private context: string;

  private description: string;

  private properties: { [name: string]: Property };

  private availableActions: {
    [actionName: string]: {
      metadata: Action.ActionMetadata;
      class: Action.ActionTypeClass;
    };
  };

  private availableEvents: {
    [name: string]: {
      metadata: Event.EventMetadata;
      subscribers: Set<Subscriber>;
    };
  };

  private actions: { [name: string]: Action[] };

  private events: Event[];

  private subscribers = new Set<Subscriber>();

  private hrefPrefix: string;

  private uiHref: string | null;

  /**
   * Initialize the object.
   *
   * @param {String} id The thing's unique ID - must be a URI
   * @param {String} title The thing's title
   * @param {String} type (Optional) The thing's type(s)
   * @param {String} description (Optional) Description of the thing
   */
  constructor(id: string, title: string, type: string | string[], description: string) {
    if (!Array.isArray(type)) {
      type = [type];
    }

    this.id = id;
    this.title = title;
    this.context = 'https://webthings.io/schemas';
    this.type = type || [];
    this.description = description || '';
    this.properties = {};
    this.availableActions = {};
    this.availableEvents = {};
    this.actions = {};
    this.events = [];
    this.subscribers = new Set();
    this.hrefPrefix = '';
    this.uiHref = null;
  }

  /**
   * Return the thing state as a Thing Description.
   *
   * @returns {Object} Current thing state
   */
  asThingDescription(): Thing.ThingDescription {
    const thing: Omit<Thing.ThingDescription, 'name' | 'href'> = {
      id: this.id,
      title: this.title,
      '@context': this.context,
      '@type': this.type,
      properties: this.getPropertyDescriptions(),
      actions: {},
      events: {},
      links: [
        {
          rel: 'properties',
          href: `${this.hrefPrefix}/properties`,
        },
        {
          rel: 'actions',
          href: `${this.hrefPrefix}/actions`,
        },
        {
          rel: 'events',
          href: `${this.hrefPrefix}/events`,
        },
      ],
    };

    for (const name in this.availableActions) {
      thing.actions[name] = this.availableActions[name].metadata;
      thing.actions[name].links = [
        {
          rel: 'action',
          href: `${this.hrefPrefix}/actions/${name}`,
        },
      ];
    }

    for (const name in this.availableEvents) {
      thing.events[name] = this.availableEvents[name].metadata;
      thing.events[name].links = [
        {
          rel: 'event',
          href: `${this.hrefPrefix}/events/${name}`,
        },
      ];
    }

    if (this.uiHref) {
      thing.links.push({
        rel: 'alternate',
        mediaType: 'text/html',
        href: this.uiHref,
      });
    }

    if (this.description) {
      thing.description = this.description;
    }

    return thing as Thing.ThingDescription;
  }

  /**
   * Get this thing's href.
   *
   * @returns {String} The href.
   */
  getHref(): string {
    if (this.hrefPrefix) {
      return this.hrefPrefix;
    }

    return '/';
  }

  /**
   * Get this thing's UI href.
   *
   * @returns {String|null} The href.
   */
  getUiHref(): string | null {
    return this.uiHref;
  }

  /**
   * Set the prefix of any hrefs associated with this thing.
   *
   * @param {String} prefix The prefix
   */
  setHrefPrefix(prefix: string): void {
    this.hrefPrefix = prefix;

    for (const property of Object.values(this.properties)) {
      property.setHrefPrefix(prefix);
    }

    for (const actionName in this.actions) {
      for (const action of this.actions[actionName]) {
        action.setHrefPrefix(prefix);
      }
    }
  }

  /**
   * Set the href of this thing's custom UI.
   *
   * @param {String} href The href
   */
  setUiHref(href: string): void {
    this.uiHref = href;
  }

  /**
   * Get the ID of the thing.
   *
   * @returns {String} The ID.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the title of the thing.
   *
   * @returns {String} The title.
   */
  getTitle(): string {
    return this.title;
  }

  /**
   * Get the type context of the thing.
   *
   * @returns {String} The context.
   */
  getContext(): string {
    return this.context;
  }

  /**
   * Get the type(s) of the thing.
   *
   * @returns {String[]} The type(s).
   */
  getType(): string[] {
    return this.type;
  }

  /**
   * Get the description of the thing.
   *
   * @returns {String} The description.
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get the thing's properties as an object.
   *
   * @returns {Object} Properties, i.e. name -> description
   */
  getPropertyDescriptions(): { [name: string]: Property.PropertyDescription } {
    const descriptions: { [name: string]: Property.PropertyDescription } = {};
    for (const name in this.properties) {
      descriptions[name] = this.properties[name].asPropertyDescription();
    }

    return descriptions;
  }

  /**
   * Get the thing's actions as an array.
   *
   * @param {String?} actionName Optional action name to get descriptions for
   *
   * @returns {Object} Action descriptions.
   */
  getActionDescriptions(actionName?: string | null): Action.ActionDescription[] {
    const descriptions: Action.ActionDescription[] = [];

    if (!actionName) {
      for (const name in this.actions) {
        for (const action of this.actions[name]) {
          descriptions.push(action.asActionDescription());
        }
      }
    } else if (this.actions.hasOwnProperty(actionName)) {
      for (const action of this.actions[actionName]) {
        descriptions.push(action.asActionDescription());
      }
    }

    return descriptions;
  }

  /**
   * Get the thing's events as an array.
   *
   * @param {String?} eventName Optional event name to get descriptions for
   *
   * @returns {Object} Event descriptions.
   */
  getEventDescriptions(eventName?: string | null): Event.EventDescription[] {
    if (!eventName) {
      return this.events.map((e) => e.asEventDescription());
    } else {
      return this.events
        .filter((e) => e.getName() === eventName)
        .map((e) => e.asEventDescription());
    }
  }

  /**
   * Add a property to this thing.
   *
   * @param {Object} property Property to add
   */
  addProperty(property: Property): void {
    property.setHrefPrefix(this.hrefPrefix);
    this.properties[property.getName()] = property;
  }

  /**
   * Remove a property from this thing.
   *
   * @param {Object} property Property to remove
   */
  removeProperty(property: Property): void {
    if (this.properties.hasOwnProperty(property.getName())) {
      delete this.properties[property.getName()];
    }
  }

  /**
   * Find a property by name.
   *
   * @param {String} propertyName Name of the property to find
   *
   * @returns {(Object|null)} Property if found, else null
   */
  findProperty(propertyName: string): Property | null {
    if (this.properties.hasOwnProperty(propertyName)) {
      return this.properties[propertyName];
    }

    return null;
  }

  /**
   * Get a property's value.
   *
   * @param {String} propertyName Name of the property to get the value of
   *
   * @returns {*} Current property value if found, else null
   */
  getProperty(propertyName: string): unknown | null {
    const prop = this.findProperty(propertyName);
    if (prop) {
      return prop.getValue();
    }

    return null;
  }

  /**
   * Get a mapping of all properties and their values.
   *
   * Returns an object of propertyName -> value.
   */
  getProperties(): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const name in this.properties) {
      props[name] = this.properties[name].getValue();
    }

    return props;
  }

  /**
   * Determine whether or not this thing has a given property.
   *
   * @param {String} propertyName The property to look for
   *
   * @returns {Boolean} Indication of property presence
   */
  hasProperty(propertyName: string): boolean {
    return this.properties.hasOwnProperty(propertyName);
  }

  /**
   * Set a property value.
   *
   * @param {String} propertyName Name of the property to set
   * @param {*} value Value to set
   */
  setProperty(propertyName: string, value: AnyType): void {
    const prop = this.findProperty(propertyName);
    if (!prop) {
      return;
    }

    prop.setValue(value);
  }

  /**
   * Get an action.
   *
   * @param {String} actionName Name of the action
   * @param {String} actionId ID of the action
   * @returns {Object} The requested action if found, else null
   */
  getAction(actionName: string, actionId: string): Action | null {
    if (!this.actions.hasOwnProperty(actionName)) {
      return null;
    }

    for (const action of this.actions[actionName]) {
      if (action.getId() === actionId) {
        return action;
      }
    }

    return null;
  }

  /**
   * Add a new event and notify subscribers.
   *
   * @param {Object} event The event that occurred
   */
  addEvent(event: Event): void {
    this.events.push(event);
    this.eventNotify(event);
  }

  /**
   * Add an available event.
   *
   * @param {String} name Name of the event
   * @param {Object} metadata Event metadata, i.e. type, description, etc., as
   *                          an object.
   */
  addAvailableEvent(name: string, metadata: Event.EventMetadata): void {
    if (!metadata) {
      metadata = {};
    }

    this.availableEvents[name] = {
      metadata: metadata,
      subscribers: new Set(),
    };
  }

  /**
   * Perform an action on the thing.
   *
   * @param {String} actionName Name of the action
   * @param {Object} input Any action inputs
   * @returns {Object} The action that was created.
   */
  performAction<InputType = AnyType>(
    actionName: string,
    input: InputType | null
  ): Action<InputType> | undefined {
    input = input || null;

    if (!this.availableActions.hasOwnProperty(actionName)) {
      return;
    }

    const actionType = this.availableActions[actionName];

    if (actionType.metadata.hasOwnProperty('input')) {
      const schema = JSON.parse(JSON.stringify(actionType.metadata.input));

      if (schema.hasOwnProperty('properties')) {
        const props: Record<string, unknown>[] = Object.values(schema.properties);

        for (const prop of props) {
          delete prop.title;
          delete prop.unit;
          delete prop['@type'];
        }
      }

      const valid = ajv.validate(schema, input);
      if (!valid) {
        return;
      }
    }

    const action: Action<InputType> = <Action<InputType>>(
      new actionType.class(this, <AnyType>(<unknown>input))
    );
    action.setHrefPrefix(this.hrefPrefix);
    this.actionNotify(<Action<AnyType>>(<unknown>action));
    this.actions[actionName].push(<Action<AnyType>>(<unknown>action));
    return action;
  }

  /**
   * Remove an existing action.
   *
   * @param {String} actionName Name of the action
   * @param {String} actionId ID of the action
   * @returns boolean indicating the presence of the action.
   */
  removeAction(actionName: string, actionId: string): boolean {
    const action = this.getAction(actionName, actionId);
    if (action === null) {
      return false;
    }

    action.cancel();
    for (let i = 0; i < this.actions[actionName].length; ++i) {
      if (this.actions[actionName][i].getId() === actionId) {
        this.actions[actionName].splice(i, 1);
        break;
      }
    }

    return true;
  }

  /**
   * Add an available action.
   *
   * @param {String} name Name of the action
   * @param {Object} metadata Action metadata, i.e. type, description, etc., as
   *                          an object.
   * @param {Object} cls Class to instantiate for this action
   */
  addAvailableAction(
    name: string,
    metadata: Action.ActionMetadata | null,
    cls: Action.ActionTypeClass
  ): void {
    if (!metadata) {
      metadata = {};
    }

    this.availableActions[name] = {
      metadata: metadata,
      class: cls,
    };
    this.actions[name] = [];
  }

  /**
   * Add a new websocket subscriber.
   *
   * @param {Object} ws The websocket
   */
  addSubscriber(ws: Subscriber): void {
    this.subscribers.add(ws);
  }

  /**
   * Remove a websocket subscriber.
   *
   */
  removeSubscriber(ws: Subscriber): void {
    if (this.subscribers.has(ws)) {
      this.subscribers.delete(ws);
    }

    for (const name in this.availableEvents) {
      this.removeEventSubscriber(name, ws);
    }
  }

  /**
   * Add a new websocket subscriber to an event.
   *
   * @param {String} name Name of the event
   * @param {Subscriber} ws The websocket
   */
  addEventSubscriber(name: string, ws: Subscriber): void {
    if (this.availableEvents.hasOwnProperty(name)) {
      this.availableEvents[name].subscribers.add(ws);
    }
  }

  /**
   * Remove a websocket subscriber from an event.
   *
   * @param {String} name Name of the event
   * @param {Object} ws The websocket
   */
  removeEventSubscriber(name: string, ws: Subscriber): void {
    if (
      this.availableEvents.hasOwnProperty(name) &&
      this.availableEvents[name].subscribers.has(ws)
    ) {
      this.availableEvents[name].subscribers.delete(ws);
    }
  }

  /**
   * Notify all subscribers of a property change.
   *
   * @param {Object} property The property that changed
   */
  propertyNotify(property: Property<AnyType>): void {
    const message = JSON.stringify({
      messageType: 'propertyStatus',
      data: {
        [property.getName()]: property.getValue(),
      },
    });

    for (const subscriber of this.subscribers) {
      try {
        subscriber.send(message);
      } catch (e) {
        // do nothing
      }
    }
  }

  /**
   * Notify all subscribers of an action status change.
   *
   * @param {Object} action The action whose status changed
   */
  actionNotify(action: Action): void {
    const message = JSON.stringify({
      messageType: 'actionStatus',
      data: action.asActionDescription(),
    });

    for (const subscriber of this.subscribers) {
      try {
        subscriber.send(message);
      } catch (e) {
        // do nothing
      }
    }
  }

  /**
   * Notify all subscribers of an event.
   *
   * @param {Object} event The event that occurred
   */
  eventNotify(event: Event): void {
    if (!this.availableEvents.hasOwnProperty(event.getName())) {
      return;
    }

    const message = JSON.stringify({
      messageType: 'event',
      data: event.asEventDescription(),
    });

    for (const subscriber of this.availableEvents[event.getName()].subscribers) {
      try {
        subscriber.send(message);
      } catch (e) {
        // do nothing
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Thing {
  export interface SecurityScheme {
    '@type'?: string | string[];
    scheme: string;
    description?: string;
    descriptions?: { [lang: string]: string };
    proxy?: string;
  }

  export interface ThingDescription {
    id: string;
    title: string;
    name: string;
    href: string;
    '@context': string;
    '@type': string[];
    properties: { [name: string]: Property.PropertyDescription };
    links: Link[];
    actions: { [name: string]: Action.ActionMetadata };
    events: { [name: string]: Event.EventMetadata };
    description?: string;
    base?: string;
    securityDefinitions?: { [security: string]: SecurityScheme };
    security?: string;
  }
}

export = Thing;
