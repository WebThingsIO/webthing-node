/**
 * High-level Property base class implementation.
 */

'use strict';

const Ajv = require('ajv');
const ajv = new Ajv();

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
    if (this.metadata.hasOwnProperty('readOnly') && this.metadata.readOnly) {
      throw new Error('Read-only property');
    }

    const valid = ajv.validate(this.metadata, value);
    if (!valid) {
      throw new Error('Invalid property value');
    }
  }

  /**
   * Get the property description.
   *
   * @returns {Object} Description of the property as an object.
   */
  asPropertyDescription() {
    const description = JSON.parse(JSON.stringify(this.metadata));

    if (!description.hasOwnProperty('links')) {
      description.links = [];
    }

    description.links.push(
      {
        rel: 'property',
        href: this.hrefPrefix + this.href,
      }
    );
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
