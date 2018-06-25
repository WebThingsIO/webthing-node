/**
 * High-level Thing base class implementation.
 */

'use strict';

const Ajv = require('ajv');
const ajv = new Ajv();

/**
 * A Web Thing.
 */
class Thing {
  /**
   * Initialize the object.
   *
   * @param {String} name The thing's name
   * @param {String} type (Optional) The thing's type(s)
   * @param {String} description (Optional) Description of the thing
   */
  constructor(name, type, description) {
    if (!Array.isArray(type)) {
      type = [type];
    }

    this.name = name;
    this.context = 'https://iot.mozilla.org/schemas';
    this.type = type || [];
    this.description = description || '';
    this.properties = {};
    this.availableActions = {};
    this.availableEvents = {};
    this.actions = {};
    this.events = [];
    this.subscribers = new Set();
    this.hrefPrefix = '';
    this.wsHref = null;
    this.uiHref = null;
  }

  /**
   * Return the thing state as a Thing Description.
   *
   * @returns {Object} Current thing state
   */
  asThingDescription() {
    const thing = {
      name: this.name,
      href: this.hrefPrefix ? this.hrefPrefix : '/',
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
    }

    for (const name in this.availableEvents) {
      thing.events[name] = this.availableEvents[name].metadata;
    }

    if (this.wsHref) {
      thing.links.push({
        rel: 'alternate',
        href: this.wsHref,
      });
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

    return thing;
  }

  /**
   * Get this thing's href.
   *
   * @returns {String} The href.
   */
  getHref() {
    if (this.hrefPrefix) {
      return this.hrefPrefix;
    }

    return '/';
  }

  /**
   * Get this thing's websocket href.
   *
   * @returns {String|null} The href.
   */
  getWsHref() {
    return this.wsHref;
  }

  /**
   * Get this thing's UI href.
   *
   * @returns {String|null} The href.
   */
  getUiHref() {
    return this.uiHref;
  }

  /**
   * Set the prefix of any hrefs associated with this thing.
   *
   * @param {String} prefix The prefix
   */
  setHrefPrefix(prefix) {
    this.hrefPrefix = prefix;

    for (const action of Object.values(this.availableActions)) {
      action.metadata.href = prefix + action.metadata.href;
    }

    for (const event of Object.values(this.availableEvents)) {
      event.metadata.href = prefix + event.metadata.href;
    }

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
   * Set the href of this thing's websocket.
   *
   * @param {String} href The href
   */
  setWsHref(href) {
    this.wsHref = href;
  }

  /**
   * Set the href of this thing's custom UI.
   *
   * @param {String} href The href
   */
  setUiHref(href) {
    this.uiHref = href;
  }

  /**
   * Get the name of the thing.
   *
   * @returns {String} The name.
   */
  getName() {
    return this.name;
  }

  /**
   * Get the type context of the thing.
   *
   * @returns {String} The context.
   */
  getContext() {
    return this.context;
  }

  /**
   * Get the type(s) of the thing.
   *
   * @returns {String[]} The type(s).
   */
  getType() {
    return this.type;
  }

  /**
   * Get the description of the thing.
   *
   * @returns {String} The description.
   */
  getDescription() {
    return this.description;
  }

  /**
   * Get the thing's properties as an object.
   *
   * @returns {Object} Properties, i.e. name -> description
   */
  getPropertyDescriptions() {
    const descriptions = {};
    for (const name in this.properties) {
      descriptions[name] = this.properties[name].asPropertyDescription();
    }

    return descriptions;
  }

  /**
   * Get the thing's actions as an array.
   *
   * @returns {Object} Action descriptions.
   */
  getActionDescriptions() {
    const descriptions = [];
    for (const name in this.actions) {
      for (const action of this.actions[name]) {
        descriptions.push(action.asActionDescription());
      }
    }

    return descriptions;
  }

  /**
   * Get the thing's events as an array.
   *
   * @returns {Object} Event descriptions.
   */
  getEventDescriptions() {
    return this.events.map((e) => e.asEventDescription());
  }

  /**
   * Add a property to this thing.
   *
   * @param {Object} property Property to add
   */
  addProperty(property) {
    property.setHrefPrefix(this.hrefPrefix);
    this.properties[property.name] = property;
  }

  /**
   * Remove a property from this thing.
   *
   * @param {Object} property Property to remove
   */
  removeProperty(property) {
    if (this.properties.hasOwnProperty(property.name)) {
      delete this.properties[property.name];
    }
  }

  /**
   * Find a property by name.
   *
   * @param {String} propertyName Name of the property to find
   *
   * @returns {(Object|null)} Property if found, else null
   */
  findProperty(propertyName) {
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
  getProperty(propertyName) {
    const prop = this.findProperty(propertyName);
    if (prop) {
      return prop.getValue();
    }

    return null;
  }

  /**
   * Determine whether or not this thing has a given property.
   *
   * @param {String} propertyName The property to look for
   *
   * @returns {Boolean} Indication of property presence
   */
  hasProperty(propertyName) {
    return this.properties.hasOwnProperty(propertyName);
  }

  /**
   * Set a property value.
   *
   * @param {String} propertyName Name of the property to set
   * @param {*} value Value to set
   */
  setProperty(propertyName, value) {
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
  getAction(actionName, actionId) {
    if (!this.actions.hasOwnProperty(actionName)) {
      return null;
    }

    for (const action of this.actions[actionName]) {
      if (action.id === actionId) {
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
  addEvent(event) {
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
  addAvailableEvent(name, metadata) {
    if (!metadata) {
      metadata = {};
    }

    metadata.href = `/events/${name}`;

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
  performAction(actionName, input) {
    input = input || null;

    if (!this.availableActions.hasOwnProperty(actionName)) {
      return;
    }

    const actionType = this.availableActions[actionName];

    if (actionType.metadata.hasOwnProperty('input')) {
      const valid = ajv.validate(actionType.metadata.input, input);
      if (!valid) {
        return;
      }
    }

    const action = new actionType.class(this, input);
    action.setHrefPrefix(this.hrefPrefix);
    this.actionNotify(action);
    this.actions[actionName].push(action);
    return action;
  }

  /**
   * Remove an existing action.
   *
   * @param {String} actionName Name of the action
   * @param {String} actionId ID of the action
   * @returns boolean indicating the presence of the action.
   */
  removeAction(actionName, actionId) {
    const action = this.getAction(actionName, actionId);
    if (action === null) {
      return false;
    }

    action.cancel();
    for (let i = 0; i < this.actions[actionName].length; ++i) {
      if (this.actions[actionName][i].id === actionId) {
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
  addAvailableAction(name, metadata, cls) {
    if (!metadata) {
      metadata = {};
    }

    metadata.href = `/actions/${name}`;

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
  addSubscriber(ws) {
    this.subscribers.add(ws);
  }

  /**
   * Remove a websocket subscriber.
   *
   * @param {Object} ws The websocket
   */
  removeSubscriber(ws) {
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
   * @param {Object} ws The websocket
   */
  addEventSubscriber(name, ws) {
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
  removeEventSubscriber(name, ws) {
    if (this.availableEvents.hasOwnProperty(name) &&
        this.availableEvents[name].subscribers.has(ws)) {
      this.availableEvents[name].subscribers.delete(ws);
    }
  }

  /**
   * Notify all subscribers of a property change.
   *
   * @param {Object} property The property that changed
   */
  propertyNotify(property) {
    const message = JSON.stringify({
      messageType: 'propertyStatus',
      data: {
        [property.name]: property.getValue(),
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
  actionNotify(action) {
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
  eventNotify(event) {
    if (!this.availableEvents.hasOwnProperty(event.name)) {
      return;
    }

    const message = JSON.stringify({
      messageType: 'event',
      data: event.asEventDescription(),
    });

    for (const subscriber of this.availableEvents[event.name].subscribers) {
      try {
        subscriber.send(message);
      } catch (e) {
        // do nothing
      }
    }
  }
}

module.exports = Thing;
