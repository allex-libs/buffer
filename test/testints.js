var assert = require('assert');

function arry2buffer (arry) {
  var ret = new Buffer(arry.length);
  for (var i=0; i<arry.length; i++) {
    ret[i] = arry[i];
  }
  return ret;
}

function testBuffer () {
  return arry2buffer([1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2,
  1, 2, 3, 4, 1, 2, 3, 0,
  0, 2, 3, 4, 1, 2, 3, 4]);
}

function go (execlib, bufferlib) {
  'use strict';

  var testlogic = new (bufferlib.SynchronousLogic)([
    'Char',
    'Byte',
    'UInt16LE',
    'UInt16BE',
    'UInt32LE',
    'UInt32BE',
    'UInt48LE',
    'UInt48BE',
    'UInt64LE',
    'UInt64BE',
    'Int16LE',
    'Int16BE',
    'Int32LE',
    'Int32BE',
    'Int48LE',
    'Int48BE',
    'Int64LE',
    'Int64BE'
    ]),
    tb = testBuffer(),
    dcd = testlogic.decode(tb);
  console.log(tb, '=>', dcd);
  assert(dcd[0] === String.fromCharCode(1));
  assert(dcd[1] === 2);
  assert(dcd[2] === 4*256+3);
  assert(dcd[3] === 1*256+2);
  assert(dcd[4] === 3+4*256+1*256*256+2*256*256*256);
  assert(dcd[5] === 3*256*256*256+4*256*256+1*256+2);
  assert(dcd[6] === 3+4*256+1*256*256+2*256*256*256+3*256*256*256*256+4*256*256*256*256*256);
  assert(dcd[7] === 1*256*256*256*256*256+2*256*256*256*256+3*256*256*256+4*256*256+1*256+2);
  assert(dcd[8] === 3+4*256+1*256*256+2*256*256*256+3*256*256*256*256+4*256*256*256*256*256+1*256*256*256*256*256*256+2*256*256*256*256*256*256*256);
  assert(dcd[9] === 3*256*256*256*256*256*256*256+4*256*256*256*256*256*256+1*256*256*256*256*256+2*256*256*256*256+3*256*256*256+4*256*256+1*256+2);
  assert(dcd[16] === 1 +
    2*256+
    3*256*256+
    4*256*256*256+
    1*256*256*256*256+
    2*256*256*256*256*256+
    3*256*256*256*256*256*256+
    0*256*256*256*256*256*256*256
    );
  assert(dcd[17] === 4 +
    3*256+
    2*256*256+
    1*256*256*256+
    4*256*256*256*256+
    3*256*256*256*256*256+
    2*256*256*256*256*256*256+
    0*256*256*256*256*256*256*256
    );
}

function main (execlib) {
  'use strict';
  go(execlib, require('../index')(execlib));
}

module.exports = main;

