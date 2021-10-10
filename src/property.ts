/**
 * High-level Property base class implementation.
 */

import Ajv, { ValidateFunction } from 'ajv';
import Thing from './thing';
import Value from './value';
import { AnyType, PrimitiveJsonType, Link } from './types';

const ajv = new Ajv();

/**
 * A Property represents an individual state value of a thing.
 */
class Property<ValueType = AnyType> {
  private thing: Thing;

  private name: string;

  private value: Value<ValueType>;

  private metadata: Property.PropertyMetadata;

  private href: string;

  private hrefPrefix: string;

  private validate: ValidateFunction;

  /**
   * Initialize the object.
   *
   * @param {Thing} thing Thing this property belongs to
   * @param {String} name Name of the property
   * @param {Value} value Value object to hold the property value
   * @param {Object} metadata Property metadata, i.e. type, description, unit,
   *                          etc., as an object.
   */
  constructor(
    thing: Thing,
    name: string,
    value: Value<ValueType>,
    metadata: Property.PropertyMetadata
  ) {
    this.thing = thing;
    this.name = name;
    this.value = value;
    this.hrefPrefix = '';
    this.href = `/properties/${this.name}`;
    this.metadata = JSON.parse(JSON.stringify(metadata || {}));

    delete metadata.title;
    delete metadata.unit;
    delete metadata['@type'];
    this.validate = ajv.compile(metadata);

    // Add the property change observer to notify the Thing about a property
    // change.
    this.value.on('update', () => this.thing.propertyNotify(<Property<AnyType>>(<unknown>this)));
  }

  /**
   * Validate new property value before setting it.
   *
   * @param {*} value - New value
   * @throws Error if the property is readonly or is invalid
   */
  validateValue(value: ValueType): void {
    if (this.metadata.hasOwnProperty('readOnly') && this.metadata.readOnly) {
      throw new Error('Read-only property');
    }

    const valid = this.validate(value);
    if (!valid) {
      throw new Error('Invalid property value');
    }
  }

  /**
   * Get the property description.
   *
   * @returns {Object} Description of the property as an object.
   */
  asPropertyDescription(): Property.PropertyDescription {
    const description = JSON.parse(JSON.stringify(this.metadata));

    if (!description.hasOwnProperty('links')) {
      description.links = [];
    }

    description.links.push({
      rel: 'property',
      href: this.hrefPrefix + this.href,
    });
    return description;
  }

  /**
   * Set the prefix of any hrefs associated with this property.
   *
   * @param {String} prefix The prefix
   */
  setHrefPrefix(prefix: string): void {
    this.hrefPrefix = prefix;
  }

  /**
   * Get the href of this property.
   *
   * @returns {String} The href
   */
  getHref(): string {
    return `${this.hrefPrefix}${this.href}`;
  }

  /**
   * Get the current property value.
   *
   * @returns {*} The current value
   */
  getValue(): ValueType {
    return this.value.get();
  }

  /**
   * Set the current value of the property.
   *
   * @param {*} value The value to set
   */
  setValue(value: ValueType): void {
    this.validateValue(value);
    this.value.set(value);
  }

  /**
   * Get the name of this property.
   *
   * @returns {String} The property name.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the thing associated with this property.
   *
   * @returns {Object} The thing.
   */
  getThing(): Thing {
    return this.thing;
  }

  /**
   * Get the metadata associated with this property
   *
   * @returns {Object} The metadata
   */
  getMetadata(): Property.PropertyMetadata {
    return this.metadata;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Property {
  // could we use .type to strongly type the enum, minimum and maximum?
  interface PropertyMetadata {
    type?: PrimitiveJsonType;
    '@type'?: string;
    unit?: string;
    title?: string;
    description?: string;
    links?: Link[];
    enum?: AnyType[];
    readOnly?: boolean;
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
  }

  interface PropertyDescription extends PropertyMetadata {
    links: Link[];
  }
}

export = Property;
