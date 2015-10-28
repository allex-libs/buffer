function createJSONStringUser(execlib, StringUser) {
  'use strict';
  var lib = execlib.lib;

  function JSONStringUser(buff, cursor) {
    StringUser.call(this, buff, cursor);
  }
  lib.inherit(JSONStringUser, StringUser);
  JSONStringUser.prototype.use = function () {
    var ret = StringUser.prototype.use.call(this);
    if ('undefined' !== typeof ret) {
      try {
        return JSON.parse(ret);
      } catch (e) {
        console.error(e.stack);
        console.error(e);
        return null;
      }
    }
    return ret;
  };
  JSONStringUser.prototype.neededBytes = function (obj) {
    return StringUser.prototype.neededBytes.call(this, JSON.stringify(obj));
  };
  JSONStringUser.prototype.toBuffer = function (item, buffer) {
    return StringUser.prototype.toBuffer.call(this, JSON.stringify(item), buffer);
  };

  return JSONStringUser;
}

module.exports = createJSONStringUser;
