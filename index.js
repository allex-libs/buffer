function createBufferLib (execlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = require('./bufferuserbasecreator')(execlib),
    StringUser = require('./stringusercreator')(execlib, BufferUserBase);

  function array2buffer (array) {
    var al = array.length, ret = new Buffer(al), i;
    for (i=0; i<al; i++) {
      ret[i] = array[i];
    }
    return ret;
  }

  function toBuffer(obj) {
    if (Buffer.isBuffer(obj)) {
      return obj;
    }
    if ('object' === typeof obj && obj.type === 'Buffer' && lib.isArray(obj.data)){ 
      return array2buffer(obj.data);
    }
    if (lib.isArray(obj)) {
      return array2buffer(obj);
    }
  };

  var ret = {
    toBuffer: toBuffer,
    jsonSchemaDescriptor2UserNames: require('./jsonschemadescriptor2usernamescreator')(execlib),
    BufferUserBase: BufferUserBase,
    ByteUser: require('./byteusercreator')(execlib, BufferUserBase),
    CharUser: require('./charusercreator')(execlib, BufferUserBase),
    UInt16BEUser: require('./uint16beusercreator')(execlib, BufferUserBase),
    UInt16LEUser: require('./uint16leusercreator')(execlib, BufferUserBase),
    UInt32BEUser: require('./uint32beusercreator')(execlib, BufferUserBase),
    UInt32LEUser: require('./uint32leusercreator')(execlib, BufferUserBase),
    UInt48BEUser: require('./uint48beusercreator')(execlib, BufferUserBase),
    UInt48LEUser: require('./uint48leusercreator')(execlib, BufferUserBase),
    UInt64BEUser: require('./uint64beusercreator')(execlib, BufferUserBase),
    UInt64LEUser: require('./uint64leusercreator')(execlib, BufferUserBase),
    Int16BEUser: require('./int16beusercreator')(execlib, BufferUserBase),
    Int16LEUser: require('./int16leusercreator')(execlib, BufferUserBase),
    Int32BEUser: require('./int32beusercreator')(execlib, BufferUserBase),
    Int32LEUser: require('./int32leusercreator')(execlib, BufferUserBase),
    Int48BEUser: require('./int48beusercreator')(execlib, BufferUserBase),
    Int48LEUser: require('./int48leusercreator')(execlib, BufferUserBase),
    Int32BEUser: require('./int32beusercreator')(execlib, BufferUserBase),
    Int32LEUser: require('./int32leusercreator')(execlib, BufferUserBase),
    Int64BEUser: require('./int64beusercreator')(execlib, BufferUserBase),
    Int64LEUser: require('./int64leusercreator')(execlib, BufferUserBase),
    ByteArrayUser: require('./bytearrayusercreator')(execlib, BufferUserBase),
    BufferUser: require('./bufferusercreator')(execlib, BufferUserBase, toBuffer),
    StringUser: StringUser,
    IntegerStringUser: require('./integerstringusercreator')(execlib, StringUser),
    JSONStringUser: require('./jsonstringusercreator')(execlib, StringUser)
  };
  ret.BoolUser = require('./boolusercreator')(execlib, ret);
  ret.userProducer = require('./userproducer')(execlib, ret);
  ret.ArrayUser = require('./arrayusercreator')(execlib, ret);
  ret.Int8User = require('./int8usercreator')(execlib, ret);

  ret.Logic = require('./logiccreator')(execlib, ret);
  ret.SynchronousLogic = require('./synchronouslogiccreator')(execlib, ret);
  ret.LogicUser = require('./logicusercreator')(execlib, ret);
  ret.ConditionalLogic = require('./conditionallogiccreator')(execlib, ret);
  ret.RPCLogic = require('./rpclogiccreator')(execlib, ret);
  ret.RPCLogicServer = require('./rpclogicservercreator')(execlib, ret);
  ret.RPCLogicClient = require('./rpclogicclientcreator')(execlib, ret);
  ret.doUserTCPRMIMixin = require('./usertcprmimixincreator')(execlib, ret);
  execlib.execSuite.taskRegistry.registerClass({name: 'runUserRMITcpClient', klass: require('./usertcprmiclientcreator')(execlib, ret)});
  ret.createTcpCallableStandalone = require('./tcpcallablestandalonecreator')(execlib, ret);
  ret.TcpCallableStandaloneClient = require('./tcpcallablestandaloneclientcreator')(execlib, ret);

  ret.makeCodec = function(usernamearray, typename) {
    if (!typename) {
      throw new lib.Error('CODEC_TYPENAME_NEEDED');
    }
    var sl = new this.SynchronousLogic(usernamearray);
    return {
      encode: function (arry) {
        return sl.toBuffer(arry);
      },
      decode: function (buff) {
        return sl.decode(buff);
      },
      buffer: true,
      type: typename
    }
  };

  return ret;
}

module.exports = createBufferLib;

