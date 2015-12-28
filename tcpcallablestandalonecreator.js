var net = require('net');

function createTcpCallableStandalone(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib;

  function Connection(callable, socket) {
    this.callable = callable;
    this.socket = socket;
    //console.log('__methodDescriptors', this.callable.__methodDescriptors);
    this.rpcserver = new bufferlib.RPCLogicServer(this.callable, this.callable.__methodDescriptors, this.doSend.bind(this), this);
    this.oobLogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Char', 'Buffer']);
    this.session = null;
    this.socket.on('data', this.onData.bind(this));
    this.socket.on('error', this.destroy.bind(this));
    this.socket.on('close', this.destroy.bind(this));
    this.sessions = new lib.Map();
  }
  Connection.prototype.destroy = function () {
    var sess = this.session, sesss = this.sessions;
    this.sessions = null;
    this.session = null;
    if (this.oobLogic) {
      this.oobLogic.destroy();
    }
    this.oobLogic = null;
    if (this.rpcserver) {
      this.rpcserver.destroy();
    }
    this.rpcserver = null;
    this.socket = null;
    this.callable = null;
    if (sesss) {
      lib.containerDestroyAll(sesss);
      sesss.destroy();
    }
    if (sess) {
      sess.destroy();
    }
  };
  Connection.prototype.onData = function (buffer) {
    //console.log('onData', buffer, buffer.toString());
    this.rpcserver.takeBuffer(buffer);
  };
  Connection.prototype.doSend = function (outbuff) {
    if (this.socket){
      //console.log('doSend', outbuff, outbuff.toString());
      this.socket.write(outbuff);
    }
  };
  Connection.prototype.sendData = function (data) {
    if (!this.socket) {
      return null;
    }
    //console.log('should send data', data);
    var oob = data.oob;
    if (oob) {
      this.doSend(this.rpcserver.pack(['o', oob[0], oob[1], oob[2]], this.oobLogic));
    }
  };
  Connection.prototype.add = function(session) {
    if (this.session) {
      console.error('Connection already has a session');
      return;
    }
    if (!session.destroyed) {
      console.error('Session that Connection has to add is dead already'); 
      this.socket.close();
      return;
    }
    this.session = session;
    this.session.destroyed.attach(this.onSessionDown.bind(this));
  };
  Connection.prototype.onSessionDown = function() {
    if (!this.socket) {
      return;
    }
    this.socket.end();
  };
  Connection.prototype.communicationType = 'tcpstandalone';

  function onConnection(callable, socket) {
    new Connection(callable, socket);
  }
  function createServer(callable) {
    return net.createServer(onConnection.bind(null, callable));
  }

  return createServer;
}

module.exports = createTcpCallableStandalone;
