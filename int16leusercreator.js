function createInt16LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int16LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int16LEUser, BufferUserBase);
  Int16LEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readInt16LE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  Int16LEUser.prototype.neededBytes = function () {
    return 2;
  };
  Int16LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt16LE(item, 0);
  };

  return Int16LEUser;
}

module.exports = createInt16LEUser;
