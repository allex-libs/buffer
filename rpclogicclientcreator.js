function createRPCLogicClient(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function InLogic(outercb) {
    bufferlib.ConditionalLogic.call(this,outercb);
    this.logics.add('a', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'a')));
    this.logics.add('r', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'r')));
    this.logics.add('e', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'e')));
    this.logics.add('n', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'n')));
    this.logics.add('o', new bufferlib.Logic(['String', 'Char', 'Char', 'Buffer'], this.onParseDone.bind(this, 'o')));
  }
  lib.inherit(InLogic, bufferlib.ConditionalLogic);
  InLogic.prototype.logicNameFromResults = function () {
    console.log('InLogic logicNameFromResults', this.results);
    return this.results[0];
  };
  InLogic.prototype.onParseDone = function (modechar, params){
    this.finalizeCycle([modechar].concat(params));
  };
  InLogic.prototype.criteriaLogicUserNames = ['Char'];

  function RPCLogicClient(methoddescriptorprovider) {
    this.rpclogic = new bufferlib.RPCLogic(methoddescriptorprovider);
    //this.inlogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Buffer'], this.onResponse.bind(this));
    this.inlogic = new InLogic(this.onResponse.bind(this));
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
    console.log('onResponse', inarry);
    var command = inarry[0],
      id = inarry[1],
      contentmode = inarry[2],
      content = inarry[3];
    console.log('command', command);
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
        this.doOOB(inarry);
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
  RPCLogicClient.prototype.doOOB = function (inarry) {
    try {
    var carriersessionid = inarry[1],
      oobchannel = inarry[2],
      contentmode = inarry[3],
      content = inarry[4],
      oobcontent = this.content(contentmode, content);
    console.log('doOOB!', contentmode, content, '=>', oobcontent, 'from carriersessionid', carriersessionid, 'on channel', oobchannel);
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
    //console.log('doOOB!', oobcontent);
    //return [oobcontent[0], JSON.parse(oobcontent[1])];
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
