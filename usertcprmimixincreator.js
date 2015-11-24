function createUserTcpRMIMixin (execlib, bufferlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q;


  function doMixin(User, ParentUser) {
    var ParentTcpServer = ParentUser.prototype.TcpTransmissionServer,
      ParentTcpHandler = ParentTcpServer.prototype.ConnectionHandler;

    function RMITcpHandler(userserver, server, connection) {
      ParentTcpHandler.call(this, userserver, server, connection);
      this.rpcserver = new (bufferlib.RPCLogicServer)(this.userserver.user, User.prototype.__methodDescriptors, this.doSend.bind(this));
    }
    lib.inherit(RMITcpHandler, ParentTcpHandler);
    RMITcpHandler.prototype.destroy = function () {
      if (this.rpcserver) {
        this.rpcserver.destroy();
      }
      this.rpcserver = null;
      ParentTcpHandler.prototype.destroy.call(this);
    };
    RMITcpHandler.prototype.onPacketForProcess = function(buffer) {
      //console.log('giving', buffer, 'to rpcserver');//, this.rpcserver);
      this.rpcserver.takeBuffer(buffer);
    };
    RMITcpHandler.prototype.onRequest = function (reqarry) {
      //console.log('onRequest', reqarry);
      if (!(this.userserver && this.userserver.user)) {
        this.connection.end();
        return;
      }
      this.userserver.user.exec(reqarry).then(
        this.doSend.bind(this),
        this.doEnd.bind(this)
      );
    };
    RMITcpHandler.prototype.doSend = function (outbuff) {
      if (this.connection) {
        this.connection.write(outbuff);
      }
    };
    RMITcpHandler.prototype.doEnd = function () {
      this.connection.end();
    };

    function RMITcpServer(user, options){
      ParentTcpServer.call(this, user, options);
    }
    lib.inherit(RMITcpServer, ParentTcpServer);
    RMITcpServer.prototype.ConnectionHandler = RMITcpHandler;
    RMITcpServer.prototype.timeOutInSeconds = Infinity;

    User.prototype.TcpTransmissionServer = RMITcpServer;
  }

  return doMixin;
}

module.exports = createUserTcpRMIMixin;
