var net = require('net');

function createTcpCallableStandalone(execlib, bufferlib) {
  function Connection(callable, socket) {
    this.callable = callable;
    this.socket = socket;
    console.log('__methodDescriptors', this.callable.__methodDescriptors);
    this.rpcserver = new bufferlib.RPCLogicServer(this.callable, this.callable.__methodDescriptors, this.doSend.bind(this));
    this.socket.on('data', this.onData.bind(this));
    this.socket.on('error', this.destroy.bind(this));
    this.socket.on('close', this.destroy.bind(this));
  }
  Connection.prototype.destroy = function () {
    if (this.rpcserver) {
      this.rpcserver.destroy();
    }
    this.rpcserver = null;
    this.socket = null;
    this.callable = null;
  };
  Connection.prototype.onData = function (buffer) {
    console.log('onData', buffer.toString());
    this.rpcserver.takeBuffer(buffer);
  };
  Connection.prototype.doSend = function (outbuff) {
    if (this.socket){
      this.socket.write(outbuff);
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
