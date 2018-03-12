/**
 * High-level Thing base class implementation.
 */

'use strict';

/**
 * A Web Thing.
 */
class Thing {
  /**
   * Initialize the object.
   *
   * @param {String} name (Optional) The thing's name
   * @param {String} type (Optional) The thing's type
   * @param {String} description (Optional) Description of the thing
   */
  constructor(name, type, description) {
    this.type = type || 'thing';
    this.name = name || '';
    this.description = description || '';
    this.properties = {};
    this.availableActions = {};
    this.availableEvents = {};
    this.actions = [];
    this.events = [];
    this.subscribers = new Set();
  }

  /**
   * Return the thing state as a Thing Description.
   *
   * @returns {Object} Current thing state
   */
  asThingDescription(wsPath) {
    const thing = {
      name: this.name,
      href: '/',
      type: this.type,
      properties: this.getPropertyDescriptions(),
      actions: {},
      events: {},
      links: {
        properties: '/properties',
        actions: '/actions',
        events: '/events',
      },
    };

    for (const name in this.availableActions) {
      thing.actions[name] = {
        description: this.availableActions[name].description,
      };
    }

    for (const name in this.availableEvents) {
      thing.events[name] = {
        description: this.availableEvents[name].description,
      };
    }

    if (wsPath) {
      thing.links.websocket = wsPath;
    }

    if (this.description) {
      thing.description = this.description;
    }

    return thing;
  }

  /**
   * Get the name of the thing.
   *
   * @returns {String} Name
   */
  getName() {
    return this.name;
  }

  /**
   * Get the type of the thing.
   *
   * @returns {String} Type
   */
  getType() {
    return this.type;
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
   * Add a property to this thing.
   *
   * @param {Object} property Property to add
   */
  addProperty(property) {
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
   * Add a new event and notify subscribers.
   *
   * @param {Object} event The event that occurred
   */
  addEvent(event) {
    this.events.push(event);
    this.eventNotify(event);
  }

  /**
   * Add an event description.
   *
   * @param {String} name Name of the event
   * @param {String} description Event description
   */
  addEventDescription(name, description) {
    this.availableEvents[name] = {
      description: description,
      subscribers: new Set(),
    }
  }

  /**
   * Perform an action on the thing.
   *
   * @param {String} actionName Name of the action
   * @param {Object} params (Optional) Parameters needed for the action
   */
  performAction(actionName, params) {
    if (!this.availableActions.hasOwnProperty(actionName)) {
      return;
    }

    const action = new this.availableActions[actionName].class(this, params);
    this.actions.push(action);
    return action;
  }

  /**
   * Add an action description.
   *
   * @param {String} name Name of the action
   * @param {String} description Description of the action
   * @param {Object} cls Class to instantiate for this action
   */
  addActionDescription(name, description, cls) {
    this.availableActions[name] = {
      description: description,
      class: cls,
    }
  }

  /**
   * Add a new websocket subscriber.
   *
   * @param {Object} ws The websocket
   */
  addSubscriber(ws) {
    this.subscribers.add(ws)
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
      this.availableEvents[name]['subscribers'].add(ws);
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
    for (const subscriber of this.subscribers) {
      try {
        subscriber.send(
          JSON.stringify({messageType: 'propertyStatus',
                          data: {
                            [property.name]: property.getValue(),
                          }}));
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
    for (const subscriber of this.subscribers) {
      try {
        subscriber.send(
          JSON.stringify({messageType: 'actionStatus',
                          data: {
                            [action.name]: {
                              href: action.href,
                              status: action.status,
                            },
                          }}));
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

    for (const subscriber of this.availableEvents[event.name].subscribers) {
      try {
        subscriber.send(
          JSON.stringify({messageType: 'event',
                          data: {
                            [event.name]: {
                              timestamp: event.time,
                            },
                          }}));
      } catch (e) {
        // do nothing
      }
    }
  }
}

module.exports = Thing;
