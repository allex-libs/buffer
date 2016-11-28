function createUInt16BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt16BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt16BEUser, BufferUserBase);
  UInt16BEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readUInt16BE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  UInt16BEUser.prototype.neededBytes = function () {
    return 2;
  };
  UInt16BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt16BE(item, 0);
  };

  return UInt16BEUser;
}

module.exports = createUInt16BEUser;
