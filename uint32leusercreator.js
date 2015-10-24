function createUInt32LEUser(execlib, BufferUser) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt32LEUser() {
    BufferUser.call(this);
  }
  lib.inherit(UInt32LEUser, BufferUser);
  UInt32LEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readUInt32LE(this.cursor);
    this.cursor += 4;
    return ret;
  };

  return UInt32LEUser;
}

module.exports = createUInt32LEUser;
