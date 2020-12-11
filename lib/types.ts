export type PrimitiveJsonType = 'null' | 'boolean' |
'object' | 'array' | 'number' | 'integer' | 'string';

export interface Link {
  rel: string;
  href: string;
  mediaType?: string;
}

export interface Subscriber {
  send(message: string): void;
}
