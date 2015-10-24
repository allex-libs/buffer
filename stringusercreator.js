function createStringUser(execlib, BufferUser) {
  'use strict';
  var lib = execlib.lib;

  function StringUser(buff, cursor) {
    BufferUser.call(this, buff, cursor);
    this.start = null;
  }
  lib.inherit(StringUser, BufferUser);
  StringUser.prototype.destroy = function () {
    this.start = null;
    BufferUser.prototype.destroy.call(this);
  };
  StringUser.prototype.init = function (buff, cursor) {
    BufferUser.prototype.init.call(this, buff, cursor);
    this.start = cursor;
  };
  StringUser.prototype.use = function () {
    var ret;
    while (this.availableBytes() && this.buffer[this.cursor] !== 0) {
      this.cursor++;
    }
    if (this.buffer && this.buffer[this.cursor] === 0) {
      ret = this.buffer.toString('utf8', this.start, this.cursor);
      this.cursor++;
      return ret;
    }
  };

  return StringUser;
}

module.exports = createStringUser;


