var net = require('net');

function createTcpCallableStandalone(execlib, bufferlib) {
  'use strict';
  function Connection(callable, socket) {
    this.callable = callable;
    this.callable.needToSend = this.sendData.bind(this);
    this.socket = socket;
    console.log('__methodDescriptors', this.callable.__methodDescriptors);
    this.rpcserver = new bufferlib.RPCLogicServer(this.callable, this.callable.__methodDescriptors, this.doSend.bind(this));
    this.oobLogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Char', 'Buffer']);
    this.socket.on('data', this.onData.bind(this));
    this.socket.on('error', this.destroy.bind(this));
    this.socket.on('close', this.destroy.bind(this));
  }
  Connection.prototype.destroy = function () {
    if (this.oobLogic) {
      this.oobLogic.destroy();
    }
    this.oobLogic = null;
    if (this.rpcserver) {
      this.rpcserver.destroy();
    }
    this.rpcserver = null;
    this.socket = null;
    if (this.callable) {
      this.callable.needToSend = null;
    }
    this.callable = null;
  };
  Connection.prototype.onData = function (buffer) {
    //console.log('onData', buffer, buffer.toString());
    this.rpcserver.takeBuffer(buffer);
  };
  Connection.prototype.doSend = function (outbuff) {
    if (this.socket){
      console.log('doSend', outbuff, outbuff.toString());
      this.socket.write(outbuff);
    }
  };
  Connection.prototype.sendData = function (data) {
    console.log('should send data', data);
    var oob = data.oob;
    if (oob) {
      //this.rpcserver.spit(['o', oob[0], [oob[1], JSON.stringify(oob[2])]]);
      //this.doSend(this.oobLogic.toBuffer(['o', oob[0], oob[1], oob[2]]));
      this.doSend(this.rpcserver.pack(['o', oob[0], oob[1], oob[2]], this.oobLogic));
    }
  };

  function onConnection(callable, socket) {
    new Connection(callable, socket);
  }
  function createServer(callable) {
    return net.createServer(onConnection.bind(null, callable));
  }

  return createServer;
}

module.exports = createTcpCallableStandalone;
