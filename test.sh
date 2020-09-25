#!/bin/bash -e

# clone the webthing-tester
if [ ! -d webthing-tester ]; then
    git clone https://github.com/WebThingsIO/webthing-tester
fi
pip3 install --user -r webthing-tester/requirements.txt

export NODE_PATH=.
# build and test the single-thing example
node example/single-thing.js &
EXAMPLE_PID=$!
sleep 5
./webthing-tester/test-client.py --debug
kill -15 $EXAMPLE_PID

# build and test the multiple-things example
node example/multiple-things.js &
EXAMPLE_PID=$!
sleep 5
./webthing-tester/test-client.py --path-prefix "/0"
kill -15 $EXAMPLE_PID
