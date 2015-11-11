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
    this.logic = new bufferlib.RPCLogic(sink.clientuser.__methodDescriptors);
    this.onPacket = new lib.HookCollection();
    this.task = taskRegistry.run('transmitTcp', {
      ipaddress: ipaddress,
      sink: sink,
      options: options,
      onPayloadNeeded: this.generateRequestDefer.bind(this),
      onIncomingPacket: this.onPacket.fire.bind(this.onPacket)
    });
    this.requestDefer = null;
  }
  Client.prototype.destroy = function () {
    this.requestDefer = null;
    if (this.task) {
      this.task.destroy();
    }
    this.task = null;
    if (this.logic) {
      this.logic.destroy();
    }
    this.logic = null;
    this.cb = null;
    if (this.sinkDestroyedListener) {
      this.sinkDestroyedListener.destroy();
    }
    this.sinkDestroyedListener = null;
  };
  Client.prototype.request = function () {
    /*
    if (arguments.length !== this.logic.users.length) {
      throw new lib.Error('INVALID_NUMBER_OF_PARAMETERS', arguments.length+' != '+this.logic.users.length);
    }
    */
    if (!this.requestDefer) {
      throw new lib.Error('REQUEST_DEFER_DOESNT_EXIST');
    }
    var buff = this.logic.toBuffer(arguments[0], Array.prototype.slice.call(arguments, 1)),
      rd = this.requestDefer;
    if (buff) {
      this.requestDefer = null;
      rd.resolve(buff);
    } else {
    }
  };
  Client.prototype.generateRequestDefer = function () {
    var cb;
    if (this.requestDefer) {
      throw new lib.Error('REQUEST_DEFER_ALREADY_EXISTS');
    }
    this.requestDefer = q.defer();
    if (this.cb) {
      cb = this.cb;
      this.cb = null;
      cb(this);
    }
    return this.requestDefer.promise;
  };


  return UserTcpSingleRMIClientTask;
}

module.exports = createUserTcpSingleRMIClient;
