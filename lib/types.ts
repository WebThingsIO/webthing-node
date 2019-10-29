export type PrimitiveJsonType = 'null' | 'boolean' |
'object' | 'array' | 'number' | 'integer' | 'string'

export interface Link {
    rel: string;
    href: string;
    mediaType?: string;
}

// TODO:
// https://iot.mozilla.org/wot/#example-7-action-object
// seems to imply input could be typed?
export type InputType = any;

export interface Subscriber {
    send(message: string): void;
}
