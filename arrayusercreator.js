function createArrayUser(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = bufferlib.BufferUserBase,
    userProducer = bufferlib.userProducer;

  function ArrayUser(typename) {
    BufferUserBase.call(this);
    this.lenhandler = new bufferlib.UInt16LEUser();
    this.typename = typename;
    this.results = null;
    this.resultslength = null;
    this.toparse = null;
  }
  lib.inherit(ArrayUser, BufferUserBase);
  ArrayUser.prototype.destroy = function () {
    this.toparse = null;
    this.resultslength = null;
    this.results = null;
    this.typename = null;
    if (this.lenhandler) {
      this.lenhandler.destroy();
    }
    this.lenhandler = null;
    BufferUserBase.prototype.destroy.call(this);
  };

  function neededbyter(type, offset, val) {
    return offset+type.neededBytes(val);
  }
  ArrayUser.prototype.neededBytes = function (valarray) {
    if (!lib.isArray(valarray)) {
      throw new lib.Error('NOT_AN_ARRAY');
    }
    var type = userProducer(this.typename);
    return valarray.reduce(neededbyter.bind(null, type), this.lenhandler.neededBytes(valarray.length)); //all neededBytes + 2 for the leading length
  };
  function tobufferer(type, buffer, offset, val) {
    var nb = type.neededBytes(val);
    type.toBuffer(val, buffer.slice(offset));
    return offset+nb;
  }
  ArrayUser.prototype.toBuffer = function (valarray, buffer) {
    if (!lib.isArray(valarray)) {
      throw new lib.Error('NOT_AN_ARRAY');
    }
    var type = userProducer(this.typename);
    this.lenhandler.toBuffer(valarray.length, buffer);
    valarray.reduce(tobufferer.bind(null, type, buffer), this.lenhandler.neededBytes(valarray.length));
  };

  ArrayUser.prototype.use = function () {
    try {
    if (!this.buffer) {
      //console.log ('no buffer, no ByteArray now');
      return;
    }
    if (!this.results) {
      this.lenhandler.init(this.buffer, this.cursor);
      var len = this.lenhandler.use();
      if ('number' === typeof len) {
        this.resultslength = len;
        this.toparse = 0;
        this.results = new Array(len);
        this.cursor = this.lenhandler.cursor;
        this.lenhandler.init(null);
      }
    }
    if (!this.results) {
      return;
    }
    var type = userProducer(this.typename), val;
    while (this.toparse < this.resultslength) {
      type.init(this.buffer, this.cursor);
      val = type.use();
      if ('undefined' !== typeof val) {
        this.results[this.toparse] = val;
        this.cursor = type.cursor;
        this.toparse++;
      } else {
        return;
      }
    }
    var results = this.results;
    this.results = null;
    this.resultslength = null;
    this.toparse = null;
    return results;
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };

  return ArrayUser;
}

module.exports = createArrayUser;
