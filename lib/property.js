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
   * @param {Object} metadata Property metadata, i.e. type, description, unit,
   *                          etc., as an object.
   * @param {*} value Initial value of property
   */
  constructor(thing, name, metadata, value) {
    this.thing = thing;
    this.name = name;
    this.value = value || null;
    this.hrefPrefix = '';
    this.href = `/properties/${this.name}`;
    this.metadata = metadata || {};
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
   * Set the cached value of the property, making adjustments as necessary.
   *
   * @param {*} value The value to set
   *
   * @returns {*} The value that was set
   */
  setCachedValue(value) {
    if (this.metadata.hasOwnProperty('type') &&
        this.metadata['type'] === 'boolean') {
      this.value = !!value;
    } else {
      this.value = value;
    }

    this.thing.propertyNotify(this);
    return this.value;
  }

  /**
   * Get the current property value.
   *
   * @returns {*} The current value
   */
  getValue() {
    return this.value;
  }

  /**
   * Set the current value of the property.
   *
   * @param {*} value The value to set
   */
  setValue(value) {
    this.setCachedValue(value);
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
}

module.exports = Property;
