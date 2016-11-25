function createInt48BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int48BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int48BEUser, BufferUserBase);
  Int48BEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readIntBE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  Int48BEUser.prototype.neededBytes = function () {
    return 6;
  };
  Int48BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeIntBE(item, 0, 6);
  };

  return Int48BEUser;
}

module.exports = createInt48BEUser;
