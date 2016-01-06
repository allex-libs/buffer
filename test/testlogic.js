var _port = './tester',
  _usernames = [
    ['Array', ['Int8']],
    'String',
    'String',
    'Int8',
    'Byte',
    'Byte',
    'Byte'
  ];

function onStarted(execlib, server, Client) {
  var client = new Client(_port);
  client.go();
}

function onLib(execlib, bufferlib) {
  try {
  var lib = execlib.lib,
    ParentServer = require('./servercreator')(execlib),
    ParentConnection = ParentServer.prototype.Connection,
    ParentClient = require('./clientcreator')(execlib),
    Logic = bufferlib.Logic;

  function Connection(serverhandler, sock) {
    ParentConnection.call(this, serverhandler, sock);
    this.logic = new Logic(_usernames, this.onParsedData.bind(this));
  }
  lib.inherit(Connection, ParentConnection);
  Connection.prototype.destroy = function () {
    if(this.logic) {
      this.logic.destroy();
    }
    this.logic = null;
    ParentConnection.prototype.destroy.call(this);
  };
  Connection.prototype.onData = function (data) {
    console.log('server got', data);
    try {
    this.logic.takeBuffer(data);
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  Connection.prototype.onParsedData = function(data) {
    console.log('on parsed data', data);
  };


  function Server(port) {
    ParentServer.call(this, port);
  }
  lib.inherit(Server, ParentServer);
  Server.prototype.Connection = Connection;


  function Client(port) {
    ParentClient.call(this, port);
    this.logic = new Logic(_usernames);
  }
  lib.inherit(Client, ParentClient);
  Client.prototype.destroy = function () {
    if(this.logic) {
      this.logic.destroy();
    }
    this.logic = null;
    ParentClient.prototype.destroy.call(this);
  };
  Client.prototype.onData = function (data) {
    console.log('client got', data);
    try {
    this.logic.takeBuffer(data);
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  Client.prototype.onStarted = function () {
    try {
    this.sock.write(this.logic.toBuffer([[-1,2,3],'9:00', '16:00',-15,0,0,60]));
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };


  var server = new Server(_port)

  server.go().then(
    onStarted.bind(null, execlib, server, Client),
    process.exit.bind(process, 1)
  );
  } catch(e) {
    console.error(e.stack);
    console.errror(e);
  }
}

function main(execlib) {
  execlib.execSuite.libRegistry.register('allex_bufferlib').then(
    onLib.bind(null, execlib),
    process.exit.bind(process, 2)
  );
}

module.exports = main;
