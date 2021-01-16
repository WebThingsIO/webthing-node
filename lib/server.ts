/**
 * Node Web Thing server implementation.
 */

import bodyParser = require('body-parser');
import * as dnssd from 'dnssd';
import express = require('express');
import expressWs = require('express-ws');
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as utils from './utils';
import Thing = require('./thing');

/**
 * A container for a single thing.
 */
export class SingleThing {
  private thing: Thing;

  /**
   * Initialize the container.
   *
   * @param {Object} thing The thing to store
   */
  constructor(thing: Thing) {
    this.thing = thing;
  }

  /**
   * Get the thing at the given index.
   */
  getThing(): Thing {
    return this.thing;
  }

  /**
   * Get the list of things.
   */
  getThings(): Thing[] {
    return [this.thing];
  }

  /**
   * Get the mDNS server name.
   */
  getName(): string {
    return this.thing.getTitle();
  }
}


/**
 * A container for multiple things.
 */
export class MultipleThings {
  private things: Thing[];

  private name: string;

  /**
   * Initialize the container.
   *
   * @param {Object} things The things to store
   * @param {String} name The mDNS server name
   */
  constructor(things: Thing[], name: string) {
    this.things = things;
    this.name = name;
  }

  /**
   * Get the thing at the given index.
   *
   * @param {Number|String} idx The index
   */
  getThing(idx?: number|string): Thing|null {
    idx = parseInt(idx as string);
    if (isNaN(idx) || idx < 0 || idx >= this.things.length) {
      return null;
    }

    return this.things[idx];
  }

  /**
   * Get the list of things.
   */
  getThings(): Thing[] {
    return this.things;
  }

  /**
   * Get the mDNS server name.
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Base handler that is initialized with a list of things.
 */
abstract class BaseHandler {
  protected things: SingleThing|MultipleThings;

  /**
   * Initialize the handler.
   *
   * @param {Object} things List of Things managed by the server
   */
  constructor(things: SingleThing|MultipleThings) {
    this.things = things;
  }

  abstract get(req: express.Request, res: express.Response): void;

  /**
   * Get the thing this request is for.
   *
   * @param {Object} req The request object
   * @returns {Object} The thing, or null if not found.
   */
  getThing(req: express.Request): Thing|null {
    return this.things.getThing(req.params.thingId);
  }
}

/**
 * Handle a request to / when the server manages multiple things.
 */
class ThingsHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const wsHref = `${req.secure ? 'wss' : 'ws'}://${req.headers.host}`;
    res.json(
      this.things.getThings().map((thing) => {
        const description = thing.asThingDescription();
        description.href = thing.getHref();
        description.links.push({
          rel: 'alternate',
          href: `${wsHref}${thing.getHref()}`,
        });
        description.base =
          `${req.protocol}://${req.headers.host}${thing.getHref()}`;
        description.securityDefinitions = {
          nosec_sc: {
            scheme: 'nosec',
          },
        };
        description.security = 'nosec_sc';
        return description;
      })
    );
  }
}

/**
 * Handle a request to /.
 */
class ThingHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const wsHref = `${req.secure ? 'wss' : 'ws'}://${req.headers.host}`;
    const description = thing.asThingDescription();
    description.links.push({
      rel: 'alternate',
      href: `${wsHref}${thing.getHref()}`,
    });
    description.base =
      `${req.protocol}://${req.headers.host}${thing.getHref()}`;
    description.securityDefinitions = {
      nosec_sc: {
        scheme: 'nosec',
      },
    };
    description.security = 'nosec_sc';

    res.json(description);
  }

  /**
   * Handle a websocket request.
   *
   * @param {Object} ws The websocket object
   * @param {Object} req The request object
   */
  ws(ws: import('ws'), req: express.Request): void {
    const thing = this.getThing(req);
    if (thing === null) {
      ws.send(JSON.stringify({
        messageType: 'error',
        data: {
          status: '404 Not Found',
          message: 'The requested thing was not found',
        },
      }));
      return;
    }

    thing.addSubscriber(ws);

    ws.on('error', () => thing.removeSubscriber(ws));
    ws.on('close', () => thing.removeSubscriber(ws));

    ws.on('message', (msg) => {
      let message: {
        messageType: string;
        data: {[name: string]: any};
      };
      try {
        message = JSON.parse(msg as string);
      } catch (e1) {
        try {
          ws.send(JSON.stringify({
            messageType: 'error',
            data: {
              status: '400 Bad Request',
              message: 'Parsing request failed',
            },
          }));
        } catch (e2) {
          // do nothing
        }

        return;
      }

      if (!message.hasOwnProperty('messageType') ||
          !message.hasOwnProperty('data')) {
        try {
          ws.send(JSON.stringify({
            messageType: 'error',
            data: {
              status: '400 Bad Request',
              message: 'Invalid message',
            },
          }));
        } catch (e) {
          // do nothing
        }

        return;
      }

      const messageType = message.messageType;
      switch (messageType) {
        case 'setProperty': {
          for (const propertyName in message.data) {
            try {
              thing.setProperty(propertyName, message.data[propertyName]);
            } catch (e) {
              ws.send(JSON.stringify({
                messageType: 'error',
                data: {
                  status: '400 Bad Request',
                  message: e.message,
                },
              }));
            }
          }

          break;
        }
        case 'requestAction': {
          for (const actionName in message.data) {
            let input = null;
            if (message.data[actionName].hasOwnProperty('input')) {
              input = message.data[actionName].input;
            }

            const action = thing.performAction(actionName, input);
            if (action) {
              action.start();
            } else {
              // eslint-disable-next-line object-curly-newline
              ws.send(JSON.stringify({
                messageType: 'error',
                data: {
                  status: '400 Bad Request',
                  message: 'Invalid action request',
                  request: message,
                }}));
            }
          }

          break;
        }
        case 'addEventSubscription': {
          for (const eventName in message.data) {
            thing.addEventSubscriber(eventName, ws);
          }

          break;
        }
        default: {
          try {
            // eslint-disable-next-line object-curly-newline
            ws.send(JSON.stringify({
              messageType: 'error',
              data: {
                status: '400 Bad Request',
                message: `Unknown messageType: ${messageType}`,
                request: message,
              }}));
          } catch (e) {
            // do nothing
          }
        }
      }
    });
  }
}

/**
 * Handle a request to /properties.
 */
class PropertiesHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    res.json(thing.getProperties());
  }
}

/**
 * Handle a request to /properties/<property>.
 */
class PropertyHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const propertyName = req.params.propertyName;
    if (thing.hasProperty(propertyName)) {
      res.json({[propertyName]: thing.getProperty(propertyName)});
    } else {
      res.status(404).end();
    }
  }

  /**
   * Handle a PUT request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  put(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const propertyName = req.params.propertyName;
    if (!req.body.hasOwnProperty(propertyName)) {
      res.status(400).end();
      return;
    }

    if (thing.hasProperty(propertyName)) {
      try {
        thing.setProperty(propertyName, req.body[propertyName]);
      } catch (e) {
        res.status(400).end();
        return;
      }

      res.json({[propertyName]: thing.getProperty(propertyName)});
    } else {
      res.status(404).end();
    }
  }
}

/**
 * Handle a request to /actions.
 */
class ActionsHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    res.json(thing.getActionDescriptions());
  }

  /**
   * Handle a POST request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  post(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const keys = Object.keys(req.body);
    if (keys.length !== 1) {
      res.status(400).end();
      return;
    }

    const actionName = keys[0];
    let input = null;
    if (req.body[actionName].hasOwnProperty('input')) {
      input = req.body[actionName].input;
    }

    const action = thing.performAction(actionName, input);
    if (action) {
      const response = action.asActionDescription();
      action.start();

      res.status(201);
      res.json(response);
    } else {
      res.status(400).end();
    }
  }
}

/**
 * Handle a request to /actions/<action_name>.
 */
class ActionHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const actionName = req.params.actionName;

    res.json(thing.getActionDescriptions(actionName));
  }

  /**
   * Handle a POST request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  post(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const actionName = req.params.actionName;

    const keys = Object.keys(req.body);
    if (keys.length !== 1) {
      res.status(400).end();
      return;
    }

    if (keys[0] !== actionName) {
      res.status(400).end();
      return;
    }

    let input = null;
    if (req.body[actionName].hasOwnProperty('input')) {
      input = req.body[actionName].input;
    }

    const action = thing.performAction(actionName, input);
    if (action) {
      const response = action.asActionDescription();
      action.start();

      res.status(201);
      res.json(response);
    } else {
      res.status(400).end();
    }
  }
}

/**
 * Handle a request to /actions/<action_name>/<action_id>.
 */
class ActionIDHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const actionName = req.params.actionName;
    const actionId = req.params.actionId;

    const action = thing.getAction(actionName, actionId);
    if (action === null) {
      res.status(404).end();
      return;
    }

    res.json(action.asActionDescription());
  }

  /**
   * Handle a PUT request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  put(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    // TODO: this is not yet defined in the spec
    res.status(200).end();
  }

  /**
   * Handle a DELETE request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  delete(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const actionName = req.params.actionName;
    const actionId = req.params.actionId;

    if (thing.removeAction(actionName, actionId)) {
      res.status(204).end();
    } else {
      res.status(404).end();
    }
  }
}

/**
 * Handle a request to /events.
 */
class EventsHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    res.json(thing.getEventDescriptions());
  }
}

/**
 * Handle a request to /events/<event_name>.
 */
class EventHandler extends BaseHandler {
  /**
   * Handle a GET request.
   *
   * @param {Object} req The request object
   * @param {Object} res The response object
   */
  get(req: express.Request, res: express.Response): void {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    const eventName = req.params.eventName;

    res.json(thing.getEventDescriptions(eventName));
  }
}

/**
 * Server to represent a Web Thing over HTTP.
 */
export class WebThingServer {
  things: SingleThing|MultipleThings;

  name: string;

  port: number;

  hostname: string|null;

  basePath: string;

  disableHostValidation: boolean;

  hosts: string[];

  app: express.Express & {isTls?: boolean};

  // HACK because the express types are weird
  server: http.Server|https.Server;

  router: expressWs.Router;

  mdns!: dnssd.Advertisement;

  /**
   * Initialize the WebThingServer.
   *
   * For documentation on the additional route handlers, see:
   * http://expressjs.com/en/4x/api.html#app.use
   *
   * @param {Object} things Things managed by this server -- should be of type
   *                        SingleThing or MultipleThings
   * @param {Number} port Port to listen on (defaults to 80)
   * @param {String} hostname Optional host name, i.e. mything.com
   * @param {Object} sslOptions SSL options to pass to the express server
   * @param {Object[]} additionalRoutes List of additional routes to add to
   *                                    server, i.e. [{path: '..', handler: ..}]
   * @param {String} basePath Base URL path to use, rather than '/'
   * @param {Boolean} disableHostValidation Whether or not to disable host
   *                                        validation -- note that this can
   *                                        lead to DNS rebinding attacks
   */
  constructor(
    things: SingleThing|MultipleThings,
    port: number|null = null,
    hostname: string|null = null,
    sslOptions: https.ServerOptions|null = null,
    additionalRoutes: any[]|null = null,
    basePath = '/',
    disableHostValidation = false
  ) {
    this.things = things;
    this.name = things.getName();
    this.port = Number(port) || (sslOptions ? 443 : 80);
    this.hostname = hostname;
    this.basePath = basePath.replace(/\/$/, '');
    this.disableHostValidation = !!disableHostValidation;

    const systemHostname = os.hostname().toLowerCase();
    this.hosts = [
      'localhost',
      `localhost:${port}`,
      `${systemHostname}.local`,
      `${systemHostname}.local:${port}`,
    ];

    utils.getAddresses().forEach((address) => {
      this.hosts.push(address, `${address}:${port}`);
    });

    if (hostname) {
      hostname = hostname.toLowerCase();
      this.hosts.push(hostname, `${hostname}:${port}`);
    }

    if (things instanceof MultipleThings) {
      const list = things.getThings();
      for (let i = 0; i < list.length; i++) {
        const thing = list[i];
        thing.setHrefPrefix(`${this.basePath}/${i}`);
      }
    } else {
      things.getThing().setHrefPrefix(this.basePath);
    }

    this.app = express();
    this.app.use(bodyParser.json());

    // Validate Host header
    this.app.use((request, response, next: () => unknown) => {
      const host = request.headers.host;
      if (this.disableHostValidation ||
          (host && this.hosts.includes(host.toLowerCase()))) {
        next();
      } else {
        response.status(403).send('Forbidden');
      }
    });

    // Set CORS headers
    this.app.use((_request, response, next) => {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Headers',
                         'Origin, X-Requested-With, Content-Type, Accept');
      response.setHeader('Access-Control-Allow-Methods',
                         'GET, HEAD, PUT, POST, DELETE');
      next();
    });

    if (sslOptions) {
      this.server = https.createServer(sslOptions);
      this.app.isTls = true;
    } else {
      this.server = http.createServer();
      this.app.isTls = false;
    }

    expressWs(this.app, this.server);

    const thingsHandler = new ThingsHandler(this.things);
    const thingHandler = new ThingHandler(this.things);
    const propertiesHandler = new PropertiesHandler(this.things);
    const propertyHandler = new PropertyHandler(this.things);
    const actionsHandler = new ActionsHandler(this.things);
    const actionHandler = new ActionHandler(this.things);
    const actionIdHandler = new ActionIDHandler(this.things);
    const eventsHandler = new EventsHandler(this.things);
    const eventHandler = new EventHandler(this.things);

    this.router = express.Router();

    if (Array.isArray(additionalRoutes)) {
      for (const route of additionalRoutes) {
        this.router.use(route.path, route.handler);
      }
    }
    if (this.things instanceof MultipleThings) {
      this.router.get('/', (req, res) => thingsHandler.get(req, res));
      this.router.get('/:thingId', (req, res) => thingHandler.get(req, res));
      this.router.ws('/:thingId', (ws, req) => thingHandler.ws(ws, req));
      this.router.get('/:thingId/properties',
                      (req, res) => propertiesHandler.get(req, res));
      this.router.get('/:thingId/properties/:propertyName',
                      (req, res) => propertyHandler.get(req, res));
      this.router.put('/:thingId/properties/:propertyName',
                      (req, res) => propertyHandler.put(req, res));
      this.router.get('/:thingId/actions',
                      (req, res) => actionsHandler.get(req, res));
      this.router.post('/:thingId/actions',
                       (req, res) => actionsHandler.post(req, res));
      this.router.get('/:thingId/actions/:actionName',
                      (req, res) => actionHandler.get(req, res));
      this.router.post('/:thingId/actions/:actionName',
                       (req, res) => actionHandler.post(req, res));
      this.router.get('/:thingId/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.get(req, res));
      this.router.put('/:thingId/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.put(req, res));
      this.router.delete('/:thingId/actions/:actionName/:actionId',
                         (req, res) => actionIdHandler.delete(req, res));
      this.router.get('/:thingId/events',
                      (req, res) => eventsHandler.get(req, res));
      this.router.get('/:thingId/events/:eventName',
                      (req, res) => eventHandler.get(req, res));
    } else {
      this.router.get('/', (req, res) => thingHandler.get(req, res));
      this.router.ws('/', (ws, req) => thingHandler.ws(ws, req));
      this.router.get('/properties',
                      (req, res) => propertiesHandler.get(req, res));
      this.router.get('/properties/:propertyName',
                      (req, res) => propertyHandler.get(req, res));
      this.router.put('/properties/:propertyName',
                      (req, res) => propertyHandler.put(req, res));
      this.router.get('/actions',
                      (req, res) => actionsHandler.get(req, res));
      this.router.post('/actions',
                       (req, res) => actionsHandler.post(req, res));
      this.router.get('/actions/:actionName',
                      (req, res) => actionHandler.get(req, res));
      this.router.post('/actions/:actionName',
                       (req, res) => actionHandler.post(req, res));
      this.router.get('/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.get(req, res));
      this.router.put('/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.put(req, res));
      this.router.delete('/actions/:actionName/:actionId',
                         (req, res) => actionIdHandler.delete(req, res));
      this.router.get('/events',
                      (req, res) => eventsHandler.get(req, res));
      this.router.get('/events/:eventName',
                      (req, res) => eventHandler.get(req, res));
    }

    this.app.use(this.basePath || '/', this.router);
    this.server.on('request', this.app);
  }

  /**
   * Start listening for incoming connections.
   *
   * @returns {Promise} Promise which resolves once the server is started.
   */
  start(): Promise<void> {
    const opts: dnssd.Options = {
      name: this.name,
      txt: {
        path: '/',
      },
    };

    if (this.app.isTls) {
      opts.txt.tls = '1';
    }

    this.mdns = new dnssd.Advertisement(
      new dnssd.ServiceType('_webthing._tcp'),
      this.port!,
      opts
    );
    this.mdns.on('error', (e) => {
      console.debug(`mDNS error: ${e}`);
      setTimeout(() => {
        this.mdns.start();
      }, 10000);
    });
    this.mdns.start();

    return new Promise((resolve) => {
      this.server.listen({port: this.port}, resolve);
    });
  }

  /**
   * Stop listening.
   *
   * @param {boolean?} force - Whether or not to force shutdown immediately.
   * @returns {Promise} Promise which resolves once the server is stopped.
   */
  stop(force = false): Promise<unknown> {
    const promises: Promise<void>[] = [];

    if (this.mdns) {
      promises.push(new Promise((resolve, reject) => {
        this.mdns.stop(force, (error?: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }));
    }

    promises.push(new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    }));

    return Promise.all(promises);
  }
}
