#!/bin/bash -e

# run eslint first
npm run lint

# clone the webthing-tester
git clone https://github.com/mozilla-iot/webthing-tester
pip3 install --user -r webthing-tester/requirements.txt

export NODE_PATH=.
# build and test the single-thing example
node example/single-thing.js &
EXAMPLE_PID=$!
sleep 5
./webthing-tester/test-client.py
kill -15 $EXAMPLE_PID

# build and test the multiple-things example
node example/multiple-things.js &
EXAMPLE_PID=$!
sleep 5
./webthing-tester/test-client.py --path-prefix "/0"
kill -15 $EXAMPLE_PID
