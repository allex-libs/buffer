var Int64 = require('node-int64');
function copy64mirror (src, target, srcstart, targetstart) {
  if (!Buffer.isBuffer(src)) {
    throw new Error('Source provided was not a buffer');
  }
  if (!Buffer.isBuffer(target)) {
    throw new Error('Target provided was not a buffer');
  }
  targetstart = targetstart || 0;
  srcstart = srcstart || 0;
  for (var i = 0; i<8; i++) {
    target[targetstart+7-i] = src[srcstart+i];
  }
  console.log(src.slice(srcstart,srcstart+8), '=>', target.slice(targetstart, targetstart+8));
}
function createInt64LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int64LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int64LEUser, BufferUserBase);
  Int64LEUser.prototype.use = function () {
    var ret, tb;
    if (this.availableBytes() < 8) {
      return;
    }
    tb = new Buffer(8);
    copy64mirror(this.buffer, tb, this.cursor);
    ret = (new Int64(tb))+0;
    console.log('le', tb, '=>', ret);
    this.cursor += 8;
    return ret;
  };
  Int64LEUser.prototype.neededBytes = function () {
    return 8;
  };
  Int64LEUser.prototype.toBuffer = function (item, buffer) {
    var int64 = new Int64(item), tb = new Buffer(8);
    item.copy(tb, 0);
    copy64mirror(tb, buffer);
  };

  return Int64LEUser;
}

module.exports = createInt64LEUser;
