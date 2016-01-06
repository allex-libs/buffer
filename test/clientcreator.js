var net = require('net');

function createClient(execlib) {
  'use strict';
  var lib = execlib.lib;

  function Client(port, host) { //leave host undefined for a Unix-domain socket
    var sock = new net.Socket();
    sock.on('error', this.onError.bind(this));
    sock.on('close', this.destroy.bind(this));
    sock.on('data', this.onData.bind(this));
    this.sock = sock;
    this.host = host;
    this.port = port;
  }
  Client.prototype.destroy = function () {
    this.port = null;
    this.host = null;
    this.sock = null;
  };
  
  Client.prototype.onError = function (err) {
    console.error(err);
    this.destroy();
  };

  Client.prototype.go = function () {
    if ('undefined' === typeof this.host) {
      this.sock.connect(this.port, this.onStarted.bind(this));
    } else {
      this.sock.connect(this.port, this.host, this.onStarted.bind(this));
    }
  };

  return Client;
}

module.exports = createClient;
