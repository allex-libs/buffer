function createRPCLogicServer(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    RPCLogic = bufferlib.RPCLogic,
    _outLogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Buffer']);

  function nonBufferContentToBuffer (content) {
    return new Buffer(JSON.stringify(content), 'utf8');
  }

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

  function RPCLogicServer(callable, methoddescriptorprovider, outcb) {
    this.callable = callable;
    this.outcb = outcb;
    this.rpc = new RPCLogic(methoddescriptorprovider, this.onRPC.bind(this));
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
    this.outcb(pack(outarry));
  }
  function pack(outarry) {
    var content = outarry[2],
      b;
    if (Buffer.isBuffer(content)) {
      outarry = [outarry[0], outarry[1], 'b', content];
    } else {
      outarry = [outarry[0], outarry[1], 'j', nonBufferContentToBuffer(content)];
    }
    var ret = _outLogic.toBuffer(outarry);
    //console.log('spit', outarry, '=>', ret);
    return ret;
  }
  RPCLogicServer.prototype.onResolve = function (id, res) {
    this.pendingDefers.remove(id);
    this.spit(['r', id, res]);
  }; 
  RPCLogicServer.prototype.onError = function (id, error) {
    this.pendingDefers.remove(id);
    this.spit(['e', id, error]);
  }; 
  RPCLogicServer.prototype.onNotify = function (id, progress) {
    this.spit(['n', id, progress]);
  }; 

  return RPCLogicServer;
}

module.exports = createRPCLogicServer;
