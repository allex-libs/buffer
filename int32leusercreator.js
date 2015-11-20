function createInt32LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int32LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int32LEUser, BufferUserBase);
  Int32LEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readInt32LE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  Int32LEUser.prototype.neededBytes = function () {
    return 4;
  };
  Int32LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt32LE(item, 0);
  };

  return Int32LEUser;
}

module.exports = createInt32LEUser;
