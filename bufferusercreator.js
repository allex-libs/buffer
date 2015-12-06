function createBufferUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib,
    _LENBUFFSIZE = 4;

  function BufferUser(buff, cursor) {
    BufferUserBase.call(this, buff, cursor);
    this.buflen = null;
  }
  lib.inherit(BufferUser, BufferUserBase);
  BufferUser.prototype.destroy = function () {
    this.buflen = null;
    BufferUserBase.prototype.destroy.call(this);
  };
  BufferUser.prototype.init = function (buff, cursor) {
    BufferUserBase.prototype.init.call(this, buff, cursor);
    this.buflen = null;
  };
  BufferUser.prototype.use = function () {
    if (!this.buflen && this.availableBytes()>_LENBUFFSIZE) {
      this.buflen = this.buffer.readUInt32LE(this.cursor);
    }
    if (!this.buflen) {
      return;
    }
    var neededbytes = this.buflen+_LENBUFFSIZE,
      availablebytes = this.buffer.length-this.cursor,
      ret;
    //console.log('BufferUser needs', neededbytes, 'bytes');
    if (neededbytes<=availablebytes) {
      //console.log('slicing from', this.cursor, 'for', this.buflen, 'bytes on buffer of', this.buffer.length, 'bytes');
      ret = this.buffer.slice(this.cursor+_LENBUFFSIZE, this.cursor+_LENBUFFSIZE+this.buflen);
      //console.log('final result is', ret);
      this.buflen = null;
      this.cursor += neededbytes;
      return ret;
    }
  };
  BufferUser.prototype.neededBytes = function (buff) {
    return buff.length+_LENBUFFSIZE;
  };
  BufferUser.prototype.toBuffer = function (bufferitem, buffer) {
    buffer.writeUInt32LE(bufferitem.length, 0);
    bufferitem.copy(buffer, _LENBUFFSIZE);
  };

  return BufferUser;
}

module.exports = createBufferUser;

