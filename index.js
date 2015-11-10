function createBufferLib (execlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUser = require('./bufferusercreator')(execlib),
    StringUser = require('./stringusercreator')(execlib, BufferUser);

  var ret = {
    jsonSchemaDescriptor2UserNames: require('./jsonschemadescriptor2usernamescreator')(execlib),
    BufferUser: BufferUser,
    ByteUser: require('./byteusercreator')(execlib, BufferUser),
    CharUser: require('./charusercreator')(execlib, BufferUser),
    UInt16LEUser: require('./uint16leusercreator')(execlib, BufferUser),
    UInt32BEUser: require('./uint32beusercreator')(execlib, BufferUser),
    UInt32LEUser: require('./uint32leusercreator')(execlib, BufferUser),
    ByteArrayUser: require('./bytearrayusercreator')(execlib, BufferUser),
    StringUser: StringUser,
    IntegerStringUser: require('./integerstringusercreator')(execlib, StringUser),
    JSONStringUser: require('./jsonstringusercreator')(execlib, StringUser)
  };

  ret.Logic = require('./logiccreator')(execlib, ret);

  return ret;
}

module.exports = createBufferLib;

