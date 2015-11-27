function createRPCLogicClient(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function RPCLogicClient(methoddescriptorprovider) {
    this.rpclogic = new bufferlib.RPCLogic(methoddescriptorprovider);
    this.inlogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Buffer'], this.onResponse.bind(this));
    this.mydefers = new lib.Map();
    this.hisdefers = new lib.Map();
  }
  function rejector(defer) {
    defer.reject(new lib.Error('DYING_PREMATURELY'));
  }
  RPCLogicClient.prototype.destroy = function () {
    if (this.hisdefers) {
      this.hisdefers.traverse(rejector);
      this.hisdefers.destroy();
    }
    this.hisdefers = null;
    if (this.mydefers) {
      this.mydefers.traverse(rejector);
      this.mydefers.destroy();
    }
    this.mydefers = null;
    if (this.inlogic) {
      this.inlogic.destroy();
    }
    this.inlogic = null;
    if (this.rpclogic) {
      this.rpclogic.destroy();
    }
    this.rpclogic = null;
  };
  RPCLogicClient.prototype.takeBuffer = function (buff) {
    this.inlogic.takeBuffer(buff);
  };
  RPCLogicClient.prototype.onResponse = function (inarry) {
    try {
    //console.log('onResponse', inarry);
    var command = inarry[0],
      id = inarry[1],
      contentmode = inarry[2],
      content = inarry[3];
    switch(command) {
      case 'a':
        this.reLinkDefer(id, this.content(contentmode, content));
        break;
      case 'r':
        this.resolveDefer(id, this.content(contentmode, content));
        break;
      case 'e':
        this.rejectDefer(id, this.content(contentmode, content));
        break;
      case 'n':
        this.notifyDefer(id, this.content(contentmode, content));
        break;
      case 'o':
        console.log('OOB!', this.content(contentmode, content));
        break;
    }
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  RPCLogicClient.prototype.content = function (contentmode, content) {
    if (contentmode === 'j') {
      return JSON.parse(content.toString());
    }
    if (contentmode === 'b') {
      return content;
    }
  };
  RPCLogicClient.prototype.reLinkDefer = function (id, myid) {
    var myd = this.mydefers.remove(myid),
      hisd;
    if (!myd) {
      console.error('Cannot find my out defer', myid);
      return;
    }
    this.hisdefers.add(id, myd);
  };
  RPCLogicClient.prototype.resolveDefer = function (id, result) {
    var d = this.hisdefers.remove(id);
    if (d) {
      d.resolve(result);
    } else {
      console.error('Cannot find his defer', id);
    }
  };
  RPCLogicClient.prototype.rejectDefer = function (id, error) {
    var d = this.hisdefers.remove(id);
    if (d) {
      d.reject(error);
    } else {
      console.error('Cannot find his defer', id);
    }
  };
  RPCLogicClient.prototype.notifyDefer = function (id, progress) {
    var d = this.hisdefers.get(id);
    if (d) {
      d.notify(progress);
    } else {
      console.error('Cannot find his defer', id);
    }
  };

  RPCLogicClient.prototype.call = function (methodname) {
    var params = Array.prototype.slice.call(arguments, 1),
      myd = q.defer(),
      myid = lib.uid();
    this.mydefers.add(myid, myd);
    return {promise: myd.promise, buffer: this.rpclogic.toBuffer(myid, methodname, params)};
  };

  return RPCLogicClient;
}

module.exports = createRPCLogicClient;
