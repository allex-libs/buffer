function createRPCLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    Logic = bufferlib.Logic;

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
    Logic.call(this, ['String'], this.onMethod.bind(this));
    this.logics = new lib.Map();
    this.methodDescriptorProvider = methoddescriptorprovider;
    this.parsingLogic = null;
    this.outercb = outercb;
  }
  lib.inherit(RPCLogic, Logic);

  RPCLogic.prototype.destroy = function () {
    this.outercb = null;
    this.parsingLogic = null;
    this.methodDescriptorProvider = null;
    if (this.logics) {
      lib.containerDestroyAll(this.logics);
      this.logics.destroy();
    }
    this.logics = null;
    Logic.prototype.destroy.call(this);
  };

  RPCLogic.prototype.onMethod = function () {
    var methodname = this.results[0],
      logic,
      mdpcbr;
   
    if (this.parsingLogic) {
      throw new lib.Error('SHOULDNT_HAVE_HAD_PARSING_LOGIC');
      return;
    }
    if (this.methodname) {
      console.error('Already have unfinished methodname', this.methodname);
      throw (new lib.Error('ALREADY_HAVE_UNFINISHED_METHODNAME', this.methodname));
    }
    logic = this.getLogic(methodname);
    this.methodname = methodname;
    if (logic) {
      this.parsingLogic = logic;
      console.log('methodname', methodname, '=> logic', logic);
      logic.takeBuffer(this.currentPosition());
      return;
    }
  };

  RPCLogic.prototype.getLogic = function (methodname) {
    var ret = this.logics.get(methodname);
    if (ret) {
      return ret;
    }
    if ('object' === typeof this.methodDescriptorProvider) {
      return this.onMethodDescriptor(methodname, this.methodDescriptorProvider[methodname]);
    }
    return this.onMethodDescriptor(methodname, this.methodDescriptorProvider(methodname));
  };

  RPCLogic.prototype.onMethodDescriptor = function (methodname, methoddescriptor) {
    if (!methoddescriptor) {
      throw new lib.Error('NO_METHOD_DESCRIPTOR', methodname);
    }
    var logic = this.buildLogic(methoddescriptor);
    console.log(methoddescriptor, '=>', logic);
    this.logics.add(methodname, logic);
    return logic;
  };

  RPCLogic.prototype.buildLogic = function (methoddescriptor) {
    return new Logic(bufferlib.jsonSchemaDescriptor2UserNames(methoddescriptor), this.onParams.bind(this));
  };

  RPCLogic.prototype.onParams = function (params) {
    if (!this.methodname) {
      console.error('No methodname to run for params', params);
      throw new lib.Error('NO_METHODNAME_TO_RUN_FOR_PARAMS');
    }
    var methodname = this.methodname,
      logic = this.parsingLogic,
      currpos = logic.currentPosition();
    console.log('currentPosition', currpos);
    this.methodname = null;
    this.parsingLogic = null;
    this.users[0].init(currpos, 0);
    if (!this.outercb) {
      //this.destroy();
    } else {
      params = [methodname].concat(params);
      console.log('calling out with', params);
      this.outercb(params);
    }
    return 'stop';
  };

  RPCLogic.prototype.toBuffer = function (methodname, paramsarry) {
    var methodarry = [methodname],
      methodnb = this.neededBytes(methodarry),
      logic = this.getLogic(methodname),
      paramsnb = logic.neededBytes(paramsarry),
      bufflen = methodnb+paramsnb,
      buffer = new Buffer(bufflen);
    Logic.prototype.toBuffer.call(this, methodarry, buffer, 0);
    logic.toBuffer(paramsarry, buffer, methodnb);
    return buffer;
  };

  return RPCLogic;
}

module.exports = createRPCLogic;
