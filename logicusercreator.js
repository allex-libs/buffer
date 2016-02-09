function createLogicUser (execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    SynchronousLogic = bufferlib.SynchronousLogic;

  function LogicUser(usernamearray) {
    SynchronousLogic.call(this, usernamearray);
    this.buffer = null;
    this.offset = 0;
  }
  lib.inherit(LogicUser, SynchronousLogic);
  LogicUser.prototype.destroy = function () {
    this.offset = null;
    this.buffer = null;
    SynchronousLogic.prototype.destroy.call(this);
  };
  LogicUser.prototype.init = bufferlib.BufferUserBase.prototype.init;
  /*
  LogicUser.prototype.init = function (buffer, cursor) {
    var b = this.buffer;
    this.buffer = buffer;
    this.cursor = cursor || 0;
    console.trace();
    console.log('LogicUser init offset', cursor, buffer, '=>', this.buffer);
  };
  */
  //LogicUser.prototype.process = bufferlib.BufferUserBase.prototype.process;
  LogicUser.prototype.use = function () {
    try {
      var ret = this.decode(this.buffer.slice(this.cursor || 0));
      if (ret) {
        this.cursor += this.neededBytes(ret);
      }
      return ret;
    } catch(e) {
      if (e.code === 'INVALID_BUFFER_FOR_DECODE') {
        return null;
      }
      throw e;
    }
  };

  return LogicUser;
}

module.exports = createLogicUser;
