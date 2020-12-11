export type PrimitiveJsonType = 'null' | 'boolean' |
'object' | 'array' | 'number' | 'integer' | 'string';

export interface Link {
  rel: string;
  href: string;
  mediaType?: string;
}

/**
 * Input can be any type.
 * @see https://iot.mozilla.org/wot/#example-7-action-object
 */
export type InputType = any;

export interface Subscriber {
  send(message: string): void;
}
