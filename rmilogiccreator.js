function createRMILogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    Logic = bufferlib.Logic;

  function RMILogic(rpclogic, frombuffercb) {
    Logic.call(['String'].concat(rpclogic), frombuffercb);
  }
  lib.inherit(RMILogic, Logic);

  return RMILogic;
}

module.exports = createRMILogic;
