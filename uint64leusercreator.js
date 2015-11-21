function createUInt64LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt64LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt64LEUser, BufferUserBase);
  UInt64LEUser.prototype.use = function () {
    if (this.availableBytes() < 8) {
      return;
    }
    //var ret = this.buffer.readUInt64LE(this.cursor);
    var ret = 0,
      lo = this.buffer.readUInt32LE(this.cursor),
      hi = this.buffer.readUInt32LE(this.cursor+4);
    ret += (lo);
    ret += ( hi * 0x100000000);
    //console.log('lo', lo, 'hi', hi, '=>', ret);
    this.cursor += 8;
    return ret;
  };
  UInt64LEUser.prototype.neededBytes = function () {
    return 8;
  };
  UInt64LEUser.prototype.toBuffer = function (item, buffer) {
    //buffer.writeUInt64LE(item, 0);
    var hi = ~~(item / 0x100000000),
      lo = item % 0x100000000;
    //console.log(item, '=> lo', lo, 'hi', hi);
    buffer.writeUInt32LE(lo, 0);
    buffer.writeUInt32LE(hi, 4);
  };

  return UInt64LEUser;
}

module.exports = createUInt64LEUser;
