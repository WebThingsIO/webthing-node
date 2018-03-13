/**
 * Node Web Thing server implementation.
 */

'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const https = require('https');
const localIPv4Address = require('local-ipv4-address');
const mdns = require('mdns');

/**
 * Server to represent a Web Thing over HTTP.
 */
class WebThingServer {
  /**
   * Initialize the WebThingServer.
   *
   * @param {Object} thing The Thing managed by this server
   * @param {Number} port Port to listen on (defaults to 80)
   * @param {Object} sslOptions SSL options to pass to the express server
   */
  constructor(thing, port, sslOptions) {
    this.thing = thing;
    this.port = port || 80;
    this.ipPromise = localIPv4Address().then((ip) => {
      this.ip = ip;

      if (sslOptions) {
        this.wsPath = `wss://${ip}:${port}/`;
      } else {
        this.wsPath = `ws://${ip}:${port}/`;
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

    this.app.get('/', (req, res) => {
      res.json(this.thing.asThingDescription(this.wsPath));
    });

    this.app.ws('/', (ws, _req) => {
      this.thing.addSubscriber(ws);

      ws.on('error', () => this.thing.removeSubscriber(ws));
      ws.on('close', () => this.thing.removeSubscriber(ws));

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
              this.thing.setProperty(propertyName,
                                     message.data[propertyName]);
            }

            break;
          }
          case 'requestAction': {
            for (const actionName in message.data) {
              const action = this.thing.performAction(
                actionName, message.data[actionName]);
              action.start();
            }

            break;
          }
          case 'addEventSubscription': {
            for (const eventName in message.data) {
              this.thing.addEventSubscriber(eventName, ws);
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
    });

    this.app.get('/properties', (_req, _res) => {
      // TODO: this is not yet defined in the spec
    });

    this.app.get('/properties/:propertyName', (req, res) => {
      const propertyName = req.params.propertyName;
      if (this.thing.hasProperty(propertyName)) {
        res.json({[propertyName]: this.thing.getProperty(propertyName)});
      } else {
        res.status(404).end();
      }
    });

    this.app.put('/properties/:propertyName', (req, res) => {
      const propertyName = req.params.propertyName;
      if (!req.body.hasOwnProperty(propertyName)) {
        res.status(400).end();
        return;
      }

      if (this.thing.hasProperty(propertyName)) {
        this.thing.setProperty(propertyName, req.body[propertyName]);
        res.json({[propertyName]: this.thing.getProperty(propertyName)});
      } else {
        res.status(404).end();
      }
    });

    this.app.get('/actions', (req, res) => {
      res.json(this.thing.actions.map((a) => a.asActionDescription()));
    });

    this.app.post('/actions', (req, res) => {
      const name = req.body.name;
      if (!name || !this.thing.availableActions.hasOwnProperty(name)) {
        res.status(400).end();
        return;
      }

      const params = req.body.data || {};
      const action = this.thing.performAction(name, params);
      res.status(201);
      res.json({name: action.name, href: action.href});

      action.start();
    });

    this.app.get('/actions/:actionId', (req, res) => {
      const actionId = req.params.actionId;
      for (const action of this.thing.actions) {
        if (action.id === actionId) {
          res.json(action.asActionDescription());
        } else {
          res.status(404).end();
        }
      }
    });

    this.app.put('/actions/:actionId', (_req, _res) => {
      // TODO: this is not yet defined in the spec
    });

    this.app.delete('/actions/:actionId', (req, res) => {
      const actionId = req.params.actionId;
      for (const action of this.thing.actions) {
        if (action.id === actionId) {
          action.cancel()
          res.status(204).end();
        } else {
          res.status(404).end();
        }
      }
    });

    this.app.get('/events', (req, res) => {
      res.json(this.thing.events.map((e) => e.asEventDescription()));
    });

    this.server.on('request', this.app);
  }

  /**
   * Start listening for incoming connections.
   */
  start() {
    this.ipPromise.then(() => {
      let url = this.app.isTls ? 'https' : 'http';
      url += `://${this.ip}:${this.port}/`;

      this.mdns = mdns.createAdvertisement(
        mdns.tcp('http', 'webthing'),
        this.port,
        {
          name: this.thing.name,
          txtRecord: {
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
