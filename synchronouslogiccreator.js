function createSynchronousLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    Logic = bufferlib.Logic;

  function SynchronousLogic(usernamearray) {
    Logic.call(this, usernamearray, this.syncResult.bind(this));
    this.gotit = false;
  }
  lib.inherit(SynchronousLogic, Logic);
  SynchronousLogic.prototype.decode = function (buffer) {
    this.gotit = false;
    this.takeBuffer(buffer);
    if (!this.gotit) {
      throw new lib.Error('INVALID_BUFFER_FOR_DECODE');
    }
    return this.results;
  };
  SynchronousLogic.prototype.syncResult = function () {
    this.gotit = true;
  };

  return SynchronousLogic;
}
module.exports = createSynchronousLogic;

