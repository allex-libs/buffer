function createIntegerStringUser(execlib, StringUser) {
  'use strict';
  var lib = execlib.lib;

  function IntegerStringUser(buff, cursor) {
    StringUser.call(this, buff, cursor);
  }
  lib.inherit(IntegerStringUser, StringUser);
  IntegerStringUser.prototype.use = function () {
    var ret = StringUser.prototype.use.call(this);
    if ('undefined' !== typeof ret) {
      return parseInt(ret);
    }
    return ret;
  };
  IntegerStringUser.prototype.neededBytes = function (intnum) {
    return StringUser.prototype.neededBytes(intnum+'');
  };
  IntegerStringUser.prototype.toBuffer = function (item, buffer) {
    return StringUser.prototype.toBuffer.call(this, item+'', buffer);
  };

  return IntegerStringUser;
}

module.exports = createIntegerStringUser;
