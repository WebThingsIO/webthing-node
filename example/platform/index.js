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

const console = require('console');

// TODO: disable logs here by editing to '!console.log'
const log = console.log || function() {};

const {
  SingleThing,
  WebThingServer,
} = require('webthing');

// Update with different board here if needed
let board = 'artik530';
if (process.argv.length > 2) {
  board = String(process.argv[2]);
}

log(`log: board: ${board}: Loading`);
const BoardThing = require(`./board/${board}`);

function runServer() {
  const port = process.argv[3] ? Number(process.argv[3]) : 8888;
  const url = `http://localhost:${port}`;

  log(`Usage:\n\
${process.argv[0]} ${process.argv[1]} [board] [port]\n\
Try:\ncurl -H "Accept: application/json" ${url}\
\n`);
  const thing = new BoardThing();
  const server = new WebThingServer(new SingleThing(thing), port);
  process.on('SIGINT', () => {
    const cleanup = () => {
      thing && thing.close();
      log(`log: board: ${board}: Exit`);
      process.exit();
    };
    server.stop().then(cleanup).catch(cleanup);
  });
  server.start().catch(console.error);
  log(`log: board: ${board}: Started`);
}

if (module.parent === null) {
  runServer();
}
