function createInt16BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int16BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int16BEUser, BufferUserBase);
  Int16BEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readInt16BE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  Int16BEUser.prototype.neededBytes = function () {
    return 2;
  };
  Int16BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt16BE(item, 0);
  };

  return Int16BEUser;
}

module.exports = createInt16BEUser;
