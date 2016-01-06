var net = require('net'),
  fs = require('fs');

function createServer(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib;

  function Connection(serverhandler, sock) {
    this.sock = sock;
    sock.on('error', this.onError.bind(this));
    sock.on('close', this.destroy.bind(this));
    sock.on('data', this.onData.bind(this));
    console.log('new base Connection');
  }
  Connection.prototype.destroy = function () {
    this.sock = null;
    if (this.logic) {
      this.logic.destroy();
    }
    this.logic = null;
  };
  Connection.prototype.onError = function (err) {
    console.error(err);
    this.destroy();
  };



  function Server(port) {
    this.port = port;
    var serv = net.createServer(this.onConnection.bind(this));
    serv.on('error', this.onServError.bind(this));
    serv.on('close', this.destroy.bind(this));
    this.server = serv;
  }

  Server.prototype.destroy = function () {
    this.server = null;
    if (this.port && !isNaN(parseInt(this.port))) {
      fs.unlinkSync(this.port);
    }
    this.port = null;
  };

  Server.prototype.onServError = function (err) {
    console.error(err);
    this.destroy();
  };

  Server.prototype.onConnection = function (sock) {
    var c = new this.Connection(this, sock);
  };

  Server.prototype.go = function () {
    console.log('go?', this.port);
    //serv.listen(this.port, this.onStarted.bind(this));
    return q.nbind(this.server.listen, this.server)(this.port);
  };

  Server.prototype.Connection = Connection;

  return Server;
}

module.exports = createServer;
