/**
 * High-level Property base class implementation.
 */

'use strict';

/**
 * A Property represents an individual state value of a thing.
 */
class Property {
  /**
   * Initialize the object.
   *
   * @param {Object} thing Thing this property belongs to
   * @param {String} name Name of the property
   * @param {Value} value Value object to hold the property value
   * @param {Object} metadata Property metadata, i.e. type, description, unit,
   *                          etc., as an object.
   */
  constructor(thing, name, value, metadata) {
    this.thing = thing;
    this.name = name;
    this.value = value;
    this.hrefPrefix = '';
    this.href = `/properties/${this.name}`;
    this.metadata = metadata || {};

    // Add the property change observer to notify the Thing about a property
    // change.
    this.value.on('update', () => this.thing.propertyNotify(this));
  }

  /**
   * Validate new property value before setting it.
   *
   * @param {*} value - New value
   */
  validateValue(value) {
    switch (this.metadata.type) {
      case 'null':
        if (value !== null) {
          throw new Error('Value must be null');
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error('Value must be a boolean');
        }
        break;
      case 'object':
        if (typeof value !== 'object') {
          throw new Error('Value must be an object');
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array');
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error('Value must be a number');
        }
        break;
      case 'integer':
        if (typeof value !== 'number' || (value % 1) !== 0) {
          throw new Error('Value must be an integer');
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          throw new Error('Value must be a string');
        }
        break;
    }

    if (this.metadata.hasOwnProperty('readOnly') && this.metadata.readOnly) {
      throw new Error('Read-only property');
    }

    if (this.metadata.hasOwnProperty('minimum') &&
        value < this.metadata.minimum) {
      throw new Error(`Value less than minimum: ${this.metadata.minimum}`);
    }

    if (this.metadata.hasOwnProperty('maximum') &&
        value > this.metadata.maximum) {
      throw new Error(`Value greater than maximum: ${this.metadata.maximum}`);
    }

    if (this.metadata.hasOwnProperty('enum') &&
        this.metadata.enum.length > 0 &&
        !this.metadata.enum.includes(value)) {
      throw new Error(`Invalid enum value`);
    }
  }

  /**
   * Get the property description.
   *
   * @returns {Object} Description of the property as an object.
   */
  asPropertyDescription() {
    const description = Object.assign({}, this.metadata);
    description.href = this.hrefPrefix + this.href;
    return description;
  }

  /**
   * Set the prefix of any hrefs associated with this property.
   *
   * @param {String} prefix The prefix
   */
  setHrefPrefix(prefix) {
    this.hrefPrefix = prefix;
  }

  /**
   * Get the href of this property.
   *
   * @returns {String} The href
   */
  getHref() {
    return `${this.hrefPrefix}${this.href}`;
  }

  /**
   * Get the current property value.
   *
   * @returns {*} The current value
   */
  getValue() {
    return this.value.get();
  }

  /**
   * Set the current value of the property.
   *
   * @param {*} value The value to set
   */
  setValue(value) {
    this.validateValue(value);
    this.value.set(value);
  }

  /**
   * Get the name of this property.
   *
   * @returns {String} The property name.
   */
  getName() {
    return this.name;
  }

  /**
   * Get the thing associated with this property.
   *
   * @returns {Object} The thing.
   */
  getThing() {
    return this.thing;
  }

  /**
   * Get the metadata associated with this property
   *
   * @returns {Object} The metadata
   */
  getMetadata() {
    return this.metadata;
  }
}

module.exports = Property;
