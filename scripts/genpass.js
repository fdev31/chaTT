#!/bin/env node

const {makeRandomPair} = require('../static/js/randgen');

if (process.argv.length == 3)
    console.log(makeRandomPair(process.argv[2]));
else
    console.log(`Syntax: ${process.argv[1].split('/').splice(-1)} "passphrase"`);

