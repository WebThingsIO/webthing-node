// -*- mode: js; js-indent-level:2;  -*-
// SPDX-License-Identifier: MPL-2.0
/**
 *
 * Copyright 2018-present Samsung Electronics France SAS, and other contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */
const {
  Property,
  SingleThing,
  Thing,
  Value,
  WebThingServer,
} = require('webthing');

function makeThing() {
  const thing = new Thing('ActuatorExample',
                          ['OnOffSwitch'],
                          'An actuator example that just log');

  thing.addProperty(
    new Property(thing,
                 'on',
                 new Value(true, (update) => console.log(`change: ${update}`)),
                 {
                   '@type': 'OnOffProperty',
                   label: 'On/Off',
                   type: 'boolean',
                   description: 'Whether the output is changed',
                 }));
  return thing;
}

function runServer() {
  const port = process.argv[2] ? Number(process.argv[2]) : 8888;
  const url = `http://localhost:${port}/properties/on`;

  console.log(`Usage:\n
${process.argv[0]} ${process.argv[1]} [port]

Try:
curl -X PUT -H 'Content-Type: application/json' --data '{"on": true }' ${url}
`);

  const thing = makeThing();
  const server = new WebThingServer(new SingleThing(thing), port);
  process.on('SIGINT', () => {
    server.stop();
    process.exit();
  });
  server.start();
}

runServer();
