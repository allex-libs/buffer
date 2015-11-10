function createUserTcpSingleRMIMixin (execlib, bufferlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q;


  function doMixin(User, ParentUser, usermethodname) {
    var ParentTcpServer = ParentUser.prototype.TcpTransmissionServer,
      ParentTcpHandler = ParentTcpServer.prototype.ConnectionHandler;

    function SingleRMITcpHandler(userserver, server, connection) {
      ParentTcpHandler.call(this, userserver, server, connection);
      this.logic = new (bufferlib.Logic)(['Char', 'UInt16LE', 'UInt32LE'], this.onRequest.bind(this));
    }
    lib.inherit(SingleRMITcpHandler, ParentTcpHandler);
    SingleRMITcpHandler.prototype.destroy = function () {
      if (this.logic) {
        this.logic.destroy();
      }
      this.logic = null;
      ParentTcpHandler.prototype.destroy.call(this);
    };
    SingleRMITcpHandler.prototype.onPacketForProcess = function(buffer) {
      console.log('giving', buffer, 'to logic');
      this.logic.takeBuffer(buffer);
    };
    SingleRMITcpHandler.prototype.onRequest = function (reqarry) {
      console.log('onRequest', reqarry);
      if (!(this.userserver && this.userserver.user)) {
        this.connection.end();
        return;
      }
      this.userserver.user[usermethodname].apply(this.userserver.user,reqarry).then(
        this.doSend.bind(this),
        this.doEnd.bind(this)
      );
    };
    SingleRMITcpHandler.prototype.doSend = function (buffer) {
      this.connection.write(buffer);
    };
    SingleRMITcpHandler.prototype.doEnd = function () {
      this.connection.end();
    };

    function SingleRMITcpServer(user, options){
      ParentTcpServer.call(this, user, options);
    }
    lib.inherit(SingleRMITcpServer, ParentTcpServer);
    SingleRMITcpServer.prototype.ConnectionHandler = SingleRMITcpHandler;

    User.prototype.TcpTransmissionServer = SingleRMITcpServer;
  }

  return doMixin;
}

module.exports = createUserTcpSingleRMIMixin;
