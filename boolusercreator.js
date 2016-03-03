function createBoolUser(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    ByteUser = bufferlib.ByteUser;

  function BoolUser() {
    ByteUser.call(this);
  }
  lib.inherit(BoolUser, ByteUser);
  BoolUser.prototype.use = function () {
    if (this.availableBytes() < 1) {
      return;
    }
    var ret = this.buffer[this.cursor];
    ret = (ret === 0 ? false : true);
    this.cursor += 1;
    return ret;
  };
  BoolUser.prototype.neededBytes = function () {
    return 1;
  };
  BoolUser.prototype.toBuffer = function (item, buffer) {
    if (item) {
      buffer[0] = 1;
    } else {
      buffer[0] = 0;
    }
  };

  return BoolUser;
}

module.exports = createBoolUser;
