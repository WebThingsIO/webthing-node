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
   * @param {Object} description Description of the property
   */
  constructor(thing, name, description) {
    this.thing = thing;
    this.name = name;
    this.value = null;
    this.description = {};

    const fields = ['type', 'unit', 'description', 'min', 'max'];
    for (const field of fields) {
      if (description.hasOwnProperty(field)) {
        this.description[field] = description[field];
      }
    }

    this.description['href'] = `/properties/${this.name}`;
  }

  /**
   * Get the property description.
   *
   * @returns {Object} Description of the property as an object.
   */
  asPropertyDescription() {
    return this.description;
  }

  /**
   * Set the cached value of the property, making adjustments as necessary.
   *
   * @param {*} value The value to set
   *
   * @returns {*} The value that was set
   */
  setCachedValue(value) {
    if (this.description.hasOwnProperty('type') &&
        this.description['type'] === 'boolean') {
      this.value = !!value;
    } else {
      this.value = value;
    }

    this.thing.propertyNotify(this)
    return this.value
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
