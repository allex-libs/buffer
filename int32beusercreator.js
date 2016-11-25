function createInt32BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int32BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int32BEUser, BufferUserBase);
  Int32BEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readInt32BE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  Int32BEUser.prototype.neededBytes = function () {
    return 4;
  };
  Int32BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt32BE(item, 0);
  };

  return Int32BEUser;
}

module.exports = createInt32BEUser;
