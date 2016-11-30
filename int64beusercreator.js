var Int64 = require('node-int64');
function createInt64BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int64BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int64BEUser, BufferUserBase);
  Int64BEUser.prototype.use = function () {
    var ret;
    if (this.availableBytes() < 8) {
      return;
    }
    ret = (new Int64(this.buffer, this.cursor))+0;
    //console.log(this.buffer.slice(this.cursor, this.cursor+8), '=>', ret);
    this.cursor += 8;
    return ret;
  };
  Int64BEUser.prototype.neededBytes = function () {
    return 8;
  };
  Int64BEUser.prototype.toBuffer = function (item, buffer) {
    var int64 = new Int64(item);
    int64.copy(buffer, 0);
  };

  return Int64BEUser;
}

module.exports = createInt64BEUser;
