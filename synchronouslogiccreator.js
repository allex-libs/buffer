function createSynchronousLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    Logic = bufferlib.Logic;

  function SynchronousLogic(usernamearray) {
    Logic.call(this, usernamearray, this.syncResult.bind(this));
    this.gotit = null;
  }
  lib.inherit(SynchronousLogic, Logic);
  SynchronousLogic.prototype.destroy = function () {
    this.gotit = null;
    Logic.prototype.destroy.call(this);
  };
  SynchronousLogic.prototype.decode = function (buffer) {
    if (!Buffer.isBuffer(buffer)) {
      return null;
    }
    if (buffer.length < 1) {
      return null;
    }
    this.gotit = void 0;
    this.takeBuffer(buffer);
    if ('undefined' === typeof this.gotit) {
      console.log(buffer, 'not valid?');
      throw new lib.Error('INVALID_BUFFER_FOR_DECODE');
    }
    return this.gotit;
  };
  SynchronousLogic.prototype.syncResult = function () {
    if ('undefined' === typeof this.gotit) {
      this.gotit = this.results.slice(0);
      return 'stop';
    }
  };

  return SynchronousLogic;
}
module.exports = createSynchronousLogic;

