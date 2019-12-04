function createRPCLogicServer(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    RPCLogic = bufferlib.RPCLogic,
    _outLogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Buffer']);

  function PendingDefer() {
    this.id = lib.uid();
    this.defer = q.defer();
  }
  PendingDefer.prototype.destroy = function () {
    if (this.defer && this.defer.promise && this.defer.promise.isPending()) {
      this.defer.reject(new lib.Error('DYING_PREMATURELY'));
    }
    this.defer = null;
    this.id = null;
  };

  function RPCLogicServer(callable, methoddescriptorprovider, outcb, boundparams) {
    this.callable = callable;
    this.outcb = outcb;
    this.rpc = new RPCLogic(methoddescriptorprovider, this.onRPC.bind(this), boundparams);
    this.pendingDefers = new lib.Map();
  }
  RPCLogicServer.prototype.destroy = function () {
    if (this.pendingDefers) {
      lib.containerDestroyAll(this.pendingDefers);
      this.pendingDefers.destroy();
    }
    this.pendingDefers = null;
    if (this.rpc) {
      this.rpc.destroy();
    }
    this.rpc = null;
    this.outcb = null;
    this.callable = null;
  };
  RPCLogicServer.prototype.takeBuffer = function (buffer) {
    this.rpc.takeBuffer(buffer);
  };
  RPCLogicServer.prototype.onRPC = function (callerid, execarry) {
    if (!this.outcb) {
      this.destroy();
      return;
    }
    var pd = new PendingDefer();
    this.pendingDefers.add(pd.id, pd);
    this.spit(['a', pd.id, callerid]);
    this.callable.exec(execarry).then(
      this.onResolve.bind(this, pd.id),
      this.onError.bind(this, pd.id),
      this.onNotify.bind(this, pd.id)
    );
  };
  RPCLogicServer.prototype.spit = function (outarry) {
    if (!this.outcb) {
      this.destroy();
      return;
    }
    this.outcb(this.pack(outarry));
  }
  RPCLogicServer.prototype.pack = function (outarry, outlogic) {
    var content = outarry[outarry.length-1],
      b;
    if (Buffer.isBuffer(content)) {
      outarry = outarry.slice(0,-1).concat(['b', content]);
      //outarry = [outarry[0], outarry[1], 'b', content];
    } else {
      outarry = outarry.slice(0,-1).concat(['j', this.nonBufferContentToBuffer(content)]);
      //outarry = [outarry[0], outarry[1], 'j', this.nonBufferContentToBuffer(content)];
    }
    var ret = (outlogic || _outLogic).toBuffer(outarry);
    //console.log('pack', outarry, '=>', ret);
    return ret;
  };
  RPCLogicServer.prototype.nonBufferContentToBuffer = function(content) {
    return Buffer.from(JSON.stringify(content), 'utf8');
  };

  RPCLogicServer.prototype.onResolve = function (id, res) {
    if (this.pendingDefers) {
      this.pendingDefers.remove(id);
    }
    this.spit(['r', id, res]);
  }; 
  RPCLogicServer.prototype.onError = function (id, error) {
    if (this.pendingDefers) {
      this.pendingDefers.remove(id);
    }
    this.spit(['e', id, error]);
  }; 
  RPCLogicServer.prototype.onNotify = function (id, progress) {
    this.spit(['n', id, progress]);
  }; 

  return RPCLogicServer;
}

module.exports = createRPCLogicServer;
