function createCharUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;

  function CharUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(CharUser, BufferUserBase);
  CharUser.prototype.use = function () {
    if (this.availableBytes() < 1) {
      return;
    }
    var ret = String.fromCharCode(this.buffer[this.cursor]);
    this.cursor += 1;
    return ret;
  };
  CharUser.prototype.neededBytes = function () {
    return 1;
  };
  CharUser.prototype.toBuffer = function (item, buffer) {
    buffer[0] = item.charCodeAt(0);
  };

  return CharUser;
}

module.exports = createCharUser;
