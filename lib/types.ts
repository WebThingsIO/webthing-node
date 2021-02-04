export type PrimitiveJsonType =
  | 'null'
  | 'boolean'
  | 'object'
  | 'array'
  | 'number'
  | 'integer'
  | 'string';

export type AnyType = null | boolean | number | string | Record<string, unknown> | unknown[];

export interface Link {
  rel: string;
  href: string;
  mediaType?: string;
}

export interface Subscriber {
  send(message: string): void;
}
