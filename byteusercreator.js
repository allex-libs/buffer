function createByteUser(execlib, BufferUser) {
  'use strict';
  var lib = execlib.lib;

  function ByteUser() {
    BufferUser.call(this);
  }
  lib.inherit(ByteUser, BufferUser);
  ByteUser.prototype.use = function () {
    if (this.availableBytes() < 1) {
      return;
    }
    var ret = this.buffer[this.cursor];
    this.cursor += 1;
    return ret;
  };
  ByteUser.prototype.neededBytes = function () {
    return 1;
  };
  ByteUser.prototype.toBuffer = function (item, buffer) {
    buffer[0] = item;
  };

  return ByteUser;
}

module.exports = createByteUser;
