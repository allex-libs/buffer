function createRMILogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    Logic = bufferlib.Logic;

  function RMILogic(parameterslogic, frombuffercb) {
    Logic.call(['String'].concat(parameterslogic), frombuffercb);
  }
  lib.inherit(RMILogic, Logic);

  return RMILogic;
}

module.exports = createRMILogic;
