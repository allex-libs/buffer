var net = require('net');

function createTcpCallableStandaloneClient(execlib, bufferlib) {
  'use strict';
  function TcpCallableStandaloneClient(servicemodulename, host, port, username, password, loggedincb) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.loggedincb = loggedincb;
    this.session = null;
    this.socket = new net.Socket();
    this.socket.on('error', console.error.bind(console, 'socket error'));
    this.socket.on('data', this.onData.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.rpcclient = null;
    execlib.execSuite.libRegistry.register(servicemodulename).then(
      this.onServicePack.bind(this),
      this.onServicePackError.bind(this)
    );
  }
  TcpCallableStandaloneClient.prototype.destroy = function () {
    if (this.rpcclient) {
      this.rpcclient.destroy();
    }
    this.rpcclient = null;
    this.socket = null;
    this.session = null;
    this.loggedincb = null;
    this.password = null;
    this.username = null;
    this.port = null;
    this.host = null;
  };
  TcpCallableStandaloneClient.prototype.onServicePack = function (servicepack) {
    console.log('servicepack', servicepack);
    try {
    var serviceuserprototype = servicepack.Service.prototype.userFactory.get('service').prototype;
    this.rpcclient = new bufferlib.RPCLogicClient(serviceuserprototype.__methodDescriptors);
    this.goConnect();
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  TcpCallableStandaloneClient.prototype.onServicePackError = function (error) {
    if (this.socket) {
      this.socket.close();
    } else {
      this.destroy();
    }
  };
  TcpCallableStandaloneClient.prototype.goConnect = function () {
    this.socket.connect(this.port, this.host, this.onConnect.bind(this));
  };
  TcpCallableStandaloneClient.prototype.onConnect = function (error) {
    if (error) {
      console.error('socket connection error', error);
      this.destroy();
      return;
    }
    try {
    var c = this.rpcclient.call('login', 'indata', '123');
    console.log(c);
    c.promise.then(
      this.onLoggedIn.bind(this),
      this.loggedincb.bind(null, this, false)
    );
    this.socket.write(c.buffer);
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  TcpCallableStandaloneClient.prototype.onLoggedIn = function (session) {
    this.session = session;
    console.log('onLoggedIn', this.session);
    this.loggedincb(this, true);
  };
  TcpCallableStandaloneClient.prototype.onClose = function () {
    console.log('socket closed', arguments);
    this.destroy();
  };
  TcpCallableStandaloneClient.prototype.onData = function (data) {
    console.log('data!', data);
    this.rpcclient.takeBuffer(data);
  };
  TcpCallableStandaloneClient.prototype.call = function (methodname) {
    var c = this.rpcclient.call('userInvoke', this.session, methodname, Array.prototype.slice.call(arguments, 1));
    this.socket.write(c.buffer);
    return c.promise;
  };

  return TcpCallableStandaloneClient;
}

module.exports = createTcpCallableStandaloneClient;