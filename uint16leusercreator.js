function createUInt16LEUser(execlib, BufferUser) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt16LEUser() {
    BufferUser.call(this);
  }
  lib.inherit(UInt16LEUser, BufferUser);
  UInt16LEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readUInt16LE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  UInt16LEUser.prototype.neededBytes = function () {
    return 2;
  };
  UInt16LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt16LE(item, 0);
  };

  return UInt16LEUser;
}

module.exports = createUInt16LEUser;
