function createInt48LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int48LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int48LEUser, BufferUserBase);
  Int48LEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readIntLE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  Int48LEUser.prototype.neededBytes = function () {
    return 6;
  };
  Int48LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeIntLE(item, 0, 6);
  };

  return Int48LEUser;
}

module.exports = createInt48LEUser;
