function createUInt32BEUser(execlib, BufferUser) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt32BEUser() {
    BufferUser.call(this);
  }
  lib.inherit(UInt32BEUser, BufferUser);
  UInt32BEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readUInt32BE(this.cursor);
    this.cursor += 4;
    return ret;
  };

  return UInt32BEUser;
}

module.exports = createUInt32BEUser;
