function createInt8User(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    ByteUser = bufferlib.ByteUser;
    
  function Int8User() {
    ByteUser.call(this);
  }
  lib.inherit(Int8User, ByteUser);
  Int8User.prototype.use = function () {
    var ret = ByteUser.prototype.use.call(this);
    if ('number' === typeof ret) {
      if (ret > 127) {
        return -(128-(ret & 0x7f));
      }
    }
    return ret;
  };

  return Int8User;
}

module.exports = createInt8User;
