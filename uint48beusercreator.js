function createUInt48BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt48BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt48BEUser, BufferUserBase);
  UInt48BEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readUIntBE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  UInt48BEUser.prototype.neededBytes = function () {
    return 6;
  };
  UInt48BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUIntBE(item, 0, 6);
  };

  return UInt48BEUser;
}

module.exports = createUInt48BEUser;
