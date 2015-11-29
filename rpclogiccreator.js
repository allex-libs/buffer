function createRPCLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    Logic = bufferlib.Logic,
    ConditionalLogic = bufferlib.ConditionalLogic;

  function createMethodDescriptorProviderCB (methoddescriptorprovider) {
    if ('function' === typeof methoddescriptorprovider) {
      return methoddescriptorprovider;
    }
    if ('object' === typeof methoddescriptorprovider) {
      if ('function' === typeof methoddescriptorprovider.get) {
        return elementGetter.bind(null, methoddescriptorprovider);
      } else {
        return propertyFetcher.bind(null, methoddescriptorprovider);
      }
    }
  }

  function RPCLogic(methoddescriptorprovider, outercb) {
    ConditionalLogic.call(this, outercb);//this, ['String', 'String'], this.onIDWithMethod.bind(this));
    this.methodDescriptorProvider = methoddescriptorprovider;
    this.caller = null;
  }
  lib.inherit(RPCLogic, ConditionalLogic);

  RPCLogic.prototype.destroy = function () {
    this.caller = null;
    this.methodDescriptorProvider = null;
    ConditionalLogic.prototype.destroy.call(this);
  };

  RPCLogic.prototype.logicNameFromResults = function () {
    var callerid = this.results[0],
      methodname = this.results[1];
    if (this.caller) {
      console.error('Already have unfinished caller', this.caller);
      throw (new lib.Error('ALREADY_HAVE_UNFINISHED_CALLER', 'callerid: '+this.caller.callerid+', methodname: '+this.caller.methodname));
    }
    this.caller = {callerid: callerid, methodname: methodname};
    return methodname;
  };

  RPCLogic.prototype.onIDWithMethod = function () {
    var callerid = this.results[0],
      methodname = this.results[1],
      logic,
      mdpcbr;
   
    if (this.parsingLogic) {
      throw new lib.Error('SHOULDNT_HAVE_HAD_PARSING_LOGIC');
      return;
    }
    if (this.caller) {
      console.error('Already have unfinished caller', this.caller);
      throw (new lib.Error('ALREADY_HAVE_UNFINISHED_CALLER', 'callerid: '+this.caller.callerid+', methodname: '+this.caller.methodname));
    }
    logic = this.getLogic(methodname);
    this.caller = {callerid: callerid, methodname: methodname};
    if (logic) {
      this.parsingLogic = logic;
      //console.log('methodname', methodname, '=> logic', logic);
      //console.log('logic buffer length', logic.buffer ? logic.buffer.length : 0);
      logic.takeBuffer(this.currentPosition());
      return;
    }
  };

  RPCLogic.prototype.onMissingLogic = function (methodname) {
    if ('object' === typeof this.methodDescriptorProvider) {
      return this.onMethodDescriptor(methodname, this.methodDescriptorProvider[methodname]);
    }
    return this.onMethodDescriptor(methodname, this.methodDescriptorProvider(methodname));
  };

  RPCLogic.prototype.onMethodDescriptor = function (methodname, methoddescriptor) {
    if (!methoddescriptor) {
      console.log('!', methodname);
      throw new lib.Error('NO_METHOD_DESCRIPTOR', methodname);
    }
    var logic = this.buildLogic(methoddescriptor);
    //console.log(methoddescriptor, '=>', logic);
    this.logics.add(methodname, logic);
    return logic;
  };

  RPCLogic.prototype.buildLogic = function (methoddescriptor) {
    return new Logic(bufferlib.jsonSchemaDescriptor2UserNames(methoddescriptor), this.onParams.bind(this));
  };

  RPCLogic.prototype.onParams = function (params) {
    if (!this.caller) {
      console.error('No caller to run for params', params);
      throw new lib.Error('NO_METHODNAME_TO_RUN_FOR_PARAMS');
    }
    var callerid = this.caller.callerid,
      methodname = this.caller.methodname;
    this.caller = null;
    this.finalizeCycle(callerid, [methodname,params.slice()]);
  };

  RPCLogic.prototype.toBuffer = function (callerid, methodname, paramsarry) {
    var methodarry = [callerid, methodname],
      methodnb = this.neededBytes(methodarry),
      logic = this.getLogic(methodname),
      paramsnb = logic.neededBytes(paramsarry),
      bufflen = methodnb+paramsnb,
      buffer = new Buffer(bufflen);
    Logic.prototype.toBuffer.call(this, methodarry, buffer, 0);
    logic.toBuffer(paramsarry, buffer, methodnb);
    return buffer;
  };

  RPCLogic.prototype.criteriaLogicUserNames = ['String', 'String'];

  return RPCLogic;
}

module.exports = createRPCLogic;
