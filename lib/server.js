/**
 * Node Web Thing server implementation.
 */

'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const https = require('https');
const mdns = require('mdns');
const utils = require('./utils');

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
    this.ipPromise = utils.getIP().then((ip) => {
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
              let input = null;
              if (message.data[actionName].hasOwnProperty('input')) {
                input = message.data[actionName].input;
              }

              const action = this.thing.performAction(actionName, input);
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
      res.json(this.thing.getActionDescriptions());
    });

    this.app.post('/actions', (req, res) => {
      let response = {};
      for (const actionName in req.body) {
        let input = null;
        if (req.body[actionName].hasOwnProperty('input')) {
          input = req.body[actionName].input;
        }

        const action = this.thing.performAction(actionName, input);
        response = Object.assign(response, action.asActionDescription());

        action.start();
      }

      res.status(201);
      res.json(response);
    });

    this.app.get('/actions/:actionName', (_req, _res) => {
      // TODO: this is not yet defined in the spec
    });

    this.app.get('/actions/:actionName/:actionId', (req, res) => {
      const actionName = req.params.actionName;
      const actionId = req.params.actionId;

      const action = this.thing.getAction(actionName, actionId);
      if (action === null) {
        res.status(404).end();
        return;
      }

      res.json(action.asActionDescription());
    });

    this.app.put('/actions/:actionName/:actionId', (_req, _res) => {
      // TODO: this is not yet defined in the spec
    });

    this.app.delete('/actions/:actionName/:actionId', (req, res) => {
      const actionName = req.params.actionName;
      const actionId = req.params.actionId;

      const action = this.thing.getAction(actionName, actionId);
      if (action === null) {
        res.status(404).end();
        return;
      }

      action.cancel()
      res.status(204).end();
    });

    this.app.get('/events', (req, res) => {
      res.json(this.thing.getEventDescriptions());
    });

    this.app.get('/events/:eventName', (_req, _res) => {
      // TODO: this is not yet defined in the spec
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
