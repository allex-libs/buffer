function createUInt64BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt64BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt64BEUser, BufferUserBase);
  UInt64BEUser.prototype.use = function () {
    if (this.availableBytes() < 8) {
      return;
    }
    //var ret = this.buffer.readUInt64BE(this.cursor);
    var ret = 0,
      lo = this.buffer.readUInt32BE(this.cursor),
      hi = this.buffer.readUInt32BE(this.cursor+4);
    ret += (lo);
    ret += ( hi * 0x100000000);
    //console.log('lo', lo, 'hi', hi, '=>', ret);
    this.cursor += 8;
    return ret;
  };
  UInt64BEUser.prototype.neededBytes = function () {
    return 8;
  };
  UInt64BEUser.prototype.toBuffer = function (item, buffer) {
    //buffer.writeUInt64BE(item, 0);
    var hi = ~~(item / 0x100000000),
      lo = item % 0x100000000;
    //console.log(item, '=> lo', lo, 'hi', hi);
    buffer.writeUInt32BE(lo, 0);
    buffer.writeUInt32BE(hi, 4);
  };

  return UInt64BEUser;
}

module.exports = createUInt64BEUser;
