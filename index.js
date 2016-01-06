function createBufferLib (execlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = require('./bufferuserbasecreator')(execlib),
    StringUser = require('./stringusercreator')(execlib, BufferUserBase);

  var ret = {
    jsonSchemaDescriptor2UserNames: require('./jsonschemadescriptor2usernamescreator')(execlib),
    BufferUserBase: BufferUserBase,
    ByteUser: require('./byteusercreator')(execlib, BufferUserBase),
    CharUser: require('./charusercreator')(execlib, BufferUserBase),
    UInt16LEUser: require('./uint16leusercreator')(execlib, BufferUserBase),
    UInt32BEUser: require('./uint32beusercreator')(execlib, BufferUserBase),
    UInt32LEUser: require('./uint32leusercreator')(execlib, BufferUserBase),
    UInt64BEUser: require('./uint64beusercreator')(execlib, BufferUserBase),
    UInt64LEUser: require('./uint64leusercreator')(execlib, BufferUserBase),
    Int32LEUser: require('./int32leusercreator')(execlib, BufferUserBase),
    ByteArrayUser: require('./bytearrayusercreator')(execlib, BufferUserBase),
    BufferUser: require('./bufferusercreator')(execlib, BufferUserBase),
    StringUser: StringUser,
    IntegerStringUser: require('./integerstringusercreator')(execlib, StringUser),
    JSONStringUser: require('./jsonstringusercreator')(execlib, StringUser)
  };
  ret.ArrayUser = require('./arrayusercreator')(execlib, ret);
  ret.Int8User = require('./int8usercreator')(execlib, ret);

  ret.Logic = require('./logiccreator')(execlib, ret);
  ret.SynchronousLogic = require('./synchronouslogiccreator')(execlib, ret);
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
        try {
        return sl.toBuffer(arry);
        } catch(e) {
          console.error(e.stack);
          console.error(e);
        }
      },
      decode: function (buff) {
        try {
        return sl.decode(buff);
        } catch(e) {
          console.error(e.stack);
          console.error(e);
        }
      },
      buffer: true,
      type: typename
    }
  };

  return ret;
}

module.exports = createBufferLib;

