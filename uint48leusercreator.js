function createUInt48LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt48LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt48LEUser, BufferUserBase);
  UInt48LEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readUIntLE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  UInt48LEUser.prototype.neededBytes = function () {
    return 6;
  };
  UInt48LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUIntLE(item, 0, 6);
  };

  return UInt48LEUser;
}

module.exports = createUInt48LEUser;
