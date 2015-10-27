function createByteArrayUser(execlib, BufferUser) {
  'use strict';
  var lib = execlib.lib;

  function ByteArrayUser(len) {
    BufferUser.call(this);
    this.len = len;
  }
  lib.inherit(ByteArrayUser, BufferUser);
  ByteArrayUser.prototype.destroy = function () {
    this.len = null;
    BufferUser.prototype.destroy.call(this);
  };
  ByteArrayUser.prototype.use = function () {
    if (!this.buffer) {
      //console.log ('no buffer, no ByteArray now');
      return;
    }
    if (this.availableBytes() < this.len) {
      //console.log('Cannot read', this.len, 'bytes, buffer is', this.buffer.length, 'long, my cursor at', this.cursor, 'I need', this.len, 'bytes, so availableBytes yields', this.availableBytes());
      return;
    }
    var ret = new Array(this.len), i;
    for(i = 0; i < this.len; i++) {
      ret[i] = this.buffer[this.cursor+i];
    }
    this.cursor += this.len;
    return ret;
  };
  ByteArrayUser.prototype.neededBytes = function () {
    return this.len;
  };
  function buffWriter(buffer, item, index) {
    buffer[index] = item;
  }
  ByteArrayUser.prototype.toBuffer = function (numarray, buffer) {
    if(numarray.length!==this.len) {
      throw new lib.Error('INVALID_NUMARRAY_LENGTH', 'Array of numbers provided to toBuffer needs to be '+this.len+' elements long');
    }
    numarray.forEach(buffWriter.bind(null, buffer));
  };

  return ByteArrayUser;
}

module.exports = createByteArrayUser;
