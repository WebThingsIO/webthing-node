/**
 * Node Web Thing server implementation.
 */

'use strict';

const bodyParser = require('body-parser');
const dnssd = require('dnssd');
const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const https = require('https');
const utils = require('./utils');

/**
 * Base handler that is initialized with a list of things.
 */
class BaseHandler {
  /**
   * Initialize the handler.
   *
   * @param {Object} things List of Things managed by the server
   */
  constructor(things) {
    this.things = things;
  }

  /**
   * Get the thing this request is for.
   *
   * @param {Object} req The request object
   * @returns {Object} The thing, or null if not found.
   */
  getThing(req) {
    if (this.things.length > 1) {
      const thingId = parseInt(req.params.thingId);
      if (isNaN(thingId) || thingId >= this.things.length) {
        return null;
      }

      return this.things[thingId];
    } else {
      return this.things[0];
    }
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
  get(req, res) {
    res.json(this.things.map((thing) => thing.asThingDescription()));
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
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    res.json(thing.asThingDescription());
  }

  /**
   * Handle a websocket request.
   *
   * @param {Object} ws The websocket object
   * @param {Object} req The request object
   */
  ws(ws, req) {
    const thing = this.getThing(req);
    if (thing === null) {
      ws.send(JSON.stringify({messageType: 'error',
                              data: {
                                status: '404 Not Found',
                                message: 'The requested thing was not found',
                              }}));
      return;
    }

    thing.addSubscriber(ws);

    ws.on('error', () => thing.removeSubscriber(ws));
    ws.on('close', () => thing.removeSubscriber(ws));

    ws.on('message', (message) => {
      try {
        message = JSON.parse(message);
      } catch (e1) {
        try {
          ws.send(JSON.stringify({messageType: 'error',
                                  data: {
                                    status: '400 Bad Request',
                                    message: 'Parsing request failed',
                                  }}));
        } catch (e2) {
          // do nothing
        }

        return;
      }

      if (!message.hasOwnProperty('messageType') ||
          !message.hasOwnProperty('data')) {
        try {
          ws.send(JSON.stringify({messageType: 'error',
                                  data: {
                                    status: '400 Bad Request',
                                    message: 'Invalid message',
                                  }}));
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
              ws.send(JSON.stringify({messageType: 'error',
                                      data: {
                                        status: '403 Forbidden',
                                        message: 'Read-only property',
                                      }}));
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
            action.start();
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
            ws.send(JSON.stringify({
              messageType: 'error',
              data: {
                status: '400 Bad Request',
                message: 'Unknown messageType: ' + messageType,
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
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    // TODO: this is not yet defined in the spec
    res.status(200).end();
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
  get(req, res) {
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
  put(req, res) {
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
        res.status(403).end();
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
  get(req, res) {
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
  post(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    let response = {};
    for (const actionName in req.body) {
      let input = null;
      if (req.body[actionName].hasOwnProperty('input')) {
        input = req.body[actionName].input;
      }

      const action = thing.performAction(actionName, input);
      response = Object.assign(response, action.asActionDescription());

      action.start();
    }

    res.status(201);
    res.json(response);
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
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    // TODO: this is not yet defined in the spec
    res.status(200).end();
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
  get(req, res) {
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
  put(req, res) {
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
  delete(req, res) {
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
  get(req, res) {
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
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.status(404).end();
      return;
    }

    // TODO: this is not yet defined in the spec
    res.status(200).end();
  }
}

/**
 * Server to represent a Web Thing over HTTP.
 */
class WebThingServer {
  /**
   * Initialize the WebThingServer.
   *
   * @param {Object} things List of Things managed by this server
   * @param {String} name Name of this device -- this is only needed if the
   *                      server is managing multiple things
   * @param {Number} port Port to listen on (defaults to 80)
   * @param {Object} sslOptions SSL options to pass to the express server
   */
  constructor(things, name, port, sslOptions) {
    if (!Array.isArray(things)) {
      things = [things];
    }

    if (things.length > 1 && !name) {
      throw new Error('name must be set when managing multiple things');
    }

    this.things = things;
    this.port = port || 80;
    this.ipPromise = utils.getIP().then((ip) => {
      this.ip = ip;

      let wsHref;
      if (sslOptions) {
        wsHref = `wss://${ip}:${port}`;
      } else {
        wsHref = `ws://${ip}:${port}`;
      }

      if (this.things.length > 1) {
        for (let i = 0; i < this.things.length; i++) {
          const thing = this.things[i];
          thing.setHrefPrefix(`/${i}`);
          thing.setWsHref(`${wsHref}/${i}`);
        }
      } else {
        const thing = this.things[0];
        thing.setWsHref(wsHref);
      }
    });

    this.app = express();
    this.app.use(bodyParser.json());

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

    if (this.things.length > 1) {
      this.name = name;

      this.app.get('/', (req, res) => thingsHandler.get(req, res));
      this.app.get('/:thingId', (req, res) => thingHandler.get(req, res));
      this.app.ws('/:thingId', (ws, req) => thingHandler.ws(ws, req));
      this.app.get('/:thingId/properties',
                   (req, res) => propertiesHandler.get(req, res));
      this.app.get('/:thingId/properties/:propertyName',
                   (req, res) => propertyHandler.get(req, res));
      this.app.put('/:thingId/properties/:propertyName',
                   (req, res) => propertyHandler.put(req, res));
      this.app.get('/:thingId/actions',
                   (req, res) => actionsHandler.get(req, res));
      this.app.post('/:thingId/actions',
                    (req, res) => actionsHandler.post(req, res));
      this.app.get('/:thingId/actions/:actionName',
                   (req, res) => actionHandler.get(req, res));
      this.app.get('/:thingId/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.get(req, res));
      this.app.put('/:thingId/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.put(req, res));
      this.app.delete('/:thingId/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.delete(req, res));
      this.app.get('/:thingId/events',
                   (req, res) => eventsHandler.get(req, res));
      this.app.get('/:thingId/events/:eventName',
                   (req, res) => eventHandler.get(req, res));
    } else {
      this.name = this.things[0].name;

      this.app.get('/', (req, res) => thingHandler.get(req, res));
      this.app.ws('/', (ws, req) => thingHandler.ws(ws, req));
      this.app.get('/properties',
                   (req, res) => propertiesHandler.get(req, res));
      this.app.get('/properties/:propertyName',
                   (req, res) => propertyHandler.get(req, res));
      this.app.put('/properties/:propertyName',
                   (req, res) => propertyHandler.put(req, res));
      this.app.get('/actions',
                   (req, res) => actionsHandler.get(req, res));
      this.app.post('/actions',
                    (req, res) => actionsHandler.post(req, res));
      this.app.get('/actions/:actionName',
                   (req, res) => actionHandler.get(req, res));
      this.app.get('/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.get(req, res));
      this.app.put('/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.put(req, res));
      this.app.delete('/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.delete(req, res));
      this.app.get('/events',
                   (req, res) => eventsHandler.get(req, res));
      this.app.get('/events/:eventName',
                   (req, res) => eventHandler.get(req, res));
    }

    this.server.on('request', this.app);
  }

  /**
   * Start listening for incoming connections.
   */
  start() {
    this.ipPromise.then(() => {
      let url = this.app.isTls ? 'https' : 'http';
      url += `://${this.ip}:${this.port}/`;

      this.mdns = new dnssd.Advertisement(
        new dnssd.ServiceType('_http._tcp,_webthing'),
        this.port,
        {
          name: this.name,
          txt: {
            url,
          },
        });
      this.mdns.start();
      this.server.listen(this.port);
    });
  }

  /**
   * Stop listening.
   */
  stop() {
    this.mdns.stop();
    this.server.close();
  }
}

module.exports = WebThingServer;
