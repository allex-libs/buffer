function createRPCLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    Logic = bufferlib.Logic;

  function createMethodDescriptorProviderCB (methoddescriptorprovidercb) {
    if ('function' === typeof methoddescriptorprovidercb) {
      return methoddescriptorprovidercb;
    }
    if ('object' === typeof methoddescriptorprovidercb) {
      if ('function' === typeof methoddescriptorprovidercb.get) {
        return elementGetter.bind(null, methoddescriptorprovidercb);
      } else {
        return propertyFetcher.bind(null, methoddescriptorprovidercb);
      }
    }

  function RPCLogic(parameterslogic, methoddescriptorprovidercb) {
    Logic.call(['String'], this.onMethod.bind(this));
    this.logics = new lib.Map();
    this.methodDescriptorProviderCB = methoddescriptorprovidercb;
  }
  lib.inherit(RPCLogic, Logic);

  RPCLogic.prototype.destroy = function () {
    this.methodDescriptorProviderCB = null;
    if (this.logics) {
      lib.containerDestroyAll(this.logics);
      this.logics.destroy();
    }
    this.logics = null;
    Logic.prototype.destroy.call(this);
  };

  RPCLogic.prototype.onMethod = function () {
    var methodname = this.results[0],
      logic = this.logics.get(methodname),
      mdpcbr;
   
    if (this.methodname) {
      console.error('Already have unfinished methodname', this.methodname);
      throw (new lib.Error('ALREADY_HAVE_UNFINISHED_METHODNAME', this.methodname);
    }
    this.methodname = methodname;
    if (logic) {
      logic.takeBuffer(this.buffer());
      return;
    }
    mdpcbr = this.methodDescriptorProviderCB(methodname);
    if ('function' === typeof mdpcbr.done) {
      mdpcbr.done(
        this.onMethodDescriptor.bind(this, methodname, methoddescriptor),
        this.onMethodDescriptor.bind(this, methodname, null)
      );
    } else {
      this.onMethodDescriptor(methodname, mdpcbr);
    }
  };

  RPCLogic.prototype.onMethodDescriptor = function (methodname, methoddescriptor) {
    this.logics.add(methodname, methoddescriptor ? this.buildLogic(methoddescriptor) : null);
  };

  function userNameForParameterDescriptor(paramdesc) {
    switch (paramdesc.type) {
      case 'string':
        return 'String';
      case 'integer':
        return 'IntegerString';
      case 'object':
        return 'JSONString';
      case 'array':
        return 'JSONString';
    }
  }

  RPCLogic.prototype.buildLogic = function (methoddescriptor) {
    return new Logic(methoddescriptor.map(userNameForParameterDescriptor), this.onParams.bind(this));
  };

  RPCLogic.prototype.onParams = function (params) {
    if (!this.methodname) {
      console.error('No methodname to run for params', params);
      throw new lib.Error('NO_METHODNAME_TO_RUN_FOR_PARAMS');
    }
    console.log('methodname', methodname, 'params', params);
    //now what?
  };

  return RPCLogic;
}

module.exports = createRPCLogic;
