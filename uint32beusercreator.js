function createUInt32BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt32BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt32BEUser, BufferUserBase);
  UInt32BEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readUInt32BE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  UInt32BEUser.prototype.neededBytes = function () {
    return 4;
  };
  UInt32BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt32BE(item, 0);
  };

  return UInt32BEUser;
}

module.exports = createUInt32BEUser;
