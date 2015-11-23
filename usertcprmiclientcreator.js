function createUserTcpSingleRMIClient(execlib, bufferlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    Task = execSuite.Task,
    RPCLogic = bufferlib.RPCLogic;


  function UserTcpSingleRMIClientTask(prophash) {
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname;
    this.identity = prophash.identity;
    this.options = prophash.options || {};
    this.cb = prophash.cb;
  }
  lib.inherit(UserTcpSingleRMIClientTask, Task);
  UserTcpSingleRMIClientTask.prototype.destroy = function () {
    this.cb = null;
    this.options = null;
    this.identity = null;
    this.sinkname = null;
    Task.prototype.destroy.call(this);
  };
  UserTcpSingleRMIClientTask.prototype.go = function () {
    var task = taskRegistry.run('findAndRun', {
      program: {
        sinkname: this.sinkname,
        identity: this.identity,
        task: {
          name: this.onSink.bind(this),
          propertyhash: {
            ipaddress: 'fill yourself'
          }
        }
      }
    });
  };
  UserTcpSingleRMIClientTask.prototype.onSink = function (taskobj) {
    var sink = taskobj.sink;
    if (!sink) {
      this.cb (null);
      return;
    }
    new Client(taskobj.ipaddress, sink, this.options, this.cb);
  }
  UserTcpSingleRMIClientTask.prototype.compulsoryConstructionProperties = ['sinkname', 'identity', 'cb'];

  function Client(ipaddress, sink, options, cb) {
    this.sinkDestroyedListener = sink.destroyed.attach(this.destroy.bind(this));
    this.cb = cb;
    this.client = new bufferlib.RPCLogicClient(sink.clientuser.__methodDescriptors);
    //this.onPacket = new lib.HookCollection();
    this.task = taskRegistry.run('transmitTcp', {
      ipaddress: ipaddress,
      sink: sink,
      options: options,
      onPayloadNeeded: this.generateRequestDefer.bind(this),
      //onIncomingPacket: this.onPacket.fire.bind(this.onPacket)
      onIncomingPacket: this.onPacket.bind(this)
    });
    this.requestDefer = null;
    this.buffer = null;
  }
  Client.prototype.destroy = function () {
    this.requestDefer = null;
    if (this.task) {
      this.task.destroy();
    }
    this.task = null;
    if (this.rpclogic) {
      this.rpclogic.destroy();
    }
    this.rpclogic = null;
    this.cb = null;
    if (this.sinkDestroyedListener) {
      this.sinkDestroyedListener.destroy();
    }
    this.sinkDestroyedListener = null;
  };
  Client.prototype.onPacket = function (buff) {
    this.client.takeBuffer(buff);
  };
  Client.prototype.call = function () {
    try {
    var pack = this.client.call.apply(this.client, arguments);
    this.request(pack.buffer);
    return pack.promise;
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  Client.prototype.request = function (buff) {
    var rd = this.requestDefer;
    if (!rd) {
      console.log('cannot request now, will buffer the call');
      this.buffer = this.buffer ? Buffer.concat([this.buffer, buff]) : buff;
      return;
    }
    if (buff) {
      this.requestDefer = null;
      rd.resolve(buff);
    } else {
      console.error('buffer', buff, 'cannot go anywhere!');
    }
  };
  Client.prototype.generateRequestDefer = function () {
    var cb, b;
    if (this.requestDefer) {
      throw new lib.Error('REQUEST_DEFER_ALREADY_EXISTS');
    }
    if (this.buffer) {
      b = this.buffer;
      this.buffer = null;
      return b;
    }
    this.requestDefer = q.defer();
    if (this.cb) {
      cb = this.cb;
      this.cb = null;
      lib.runNext(cb.bind(null, this));
    }
    return this.requestDefer.promise;
  };


  return UserTcpSingleRMIClientTask;
}

module.exports = createUserTcpSingleRMIClient;
