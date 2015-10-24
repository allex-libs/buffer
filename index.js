function createBufferLib (execlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUser = require('./bufferusercreator')(execlib);

  var ret = {
    BufferUser: BufferUser,
    ByteUser: require('./byteusercreator')(execlib, BufferUser),
    UInt16LEUser: require('./uint16leusercreator')(execlib, BufferUser),
    UInt32BEUser: require('./uint32beusercreator')(execlib, BufferUser),
    UInt32LEUser: require('./uint32leusercreator')(execlib, BufferUser),
    ByteArrayUser: require('./bytearrayusercreator')(execlib, BufferUser),
    StringUser: require('./stringusercreator')(execlib, BufferUser)
  };

  return ret;
}

module.exports = createBufferLib;

