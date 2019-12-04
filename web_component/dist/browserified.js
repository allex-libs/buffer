(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function createArrayUser(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = bufferlib.BufferUserBase,
    userProducer = bufferlib.userProducer;

  function ArrayUser(typename) {
    BufferUserBase.call(this);
    this.lenhandler = new bufferlib.UInt16LEUser();
    this.typename = typename;
    this.results = null;
    this.resultslength = null;
    this.toparse = null;
  }
  lib.inherit(ArrayUser, BufferUserBase);
  ArrayUser.prototype.destroy = function () {
    this.toparse = null;
    this.resultslength = null;
    this.results = null;
    this.typename = null;
    if (this.lenhandler) {
      this.lenhandler.destroy();
    }
    this.lenhandler = null;
    BufferUserBase.prototype.destroy.call(this);
  };

  function neededbyter(type, offset, val) {
    return offset+type.neededBytes(val);
  }
  ArrayUser.prototype.neededBytes = function (valarray) {
    if (!lib.isArray(valarray)) {
      throw new lib.Error('NOT_AN_ARRAY');
    }
    var type = userProducer(this.typename), _t = type, ret;
    ret = valarray.reduce(neededbyter.bind(null, _t), this.lenhandler.neededBytes(valarray.length)); //all neededBytes + 2 for the leading length
    _t = null;
    return ret;
  };
  function tobufferer(type, buffer, offset, val) {
    var nb = type.neededBytes(val);
    type.toBuffer(val, buffer.slice(offset));
    return offset+nb;
  }
  ArrayUser.prototype.toBuffer = function (valarray, buffer) {
    if (!lib.isArray(valarray)) {
      throw new lib.Error('NOT_AN_ARRAY');
    }
    var type = userProducer(this.typename), _t = type, _b = buffer;
    this.lenhandler.toBuffer(valarray.length, buffer);
    valarray.reduce(tobufferer.bind(null, _t, _b), this.lenhandler.neededBytes(valarray.length));
    _t = null;
    _b = null;
  };

  ArrayUser.prototype.use = function () {
    try {
    if (!this.buffer) {
      //console.log ('no buffer, no ByteArray now');
      return;
    }
    if (!this.results) {
      this.lenhandler.init(this.buffer, this.cursor);
      var len = this.lenhandler.use();
      if ('number' === typeof len) {
        this.resultslength = len;
        this.toparse = 0;
        this.results = new Array(len);
        this.cursor = this.lenhandler.cursor;
        this.lenhandler.init(null);
      }
    }
    if (!this.results) {
      return;
    }
    var type = userProducer(this.typename), val;
    while (this.toparse < this.resultslength) {
      type.init(this.buffer, this.cursor);
      val = type.use();
      if ('undefined' !== typeof val) {
        this.results[this.toparse] = val;
        this.cursor = type.cursor;
        this.toparse++;
      } else {
        return;
      }
    }
    var results = this.results;
    this.results = null;
    this.resultslength = null;
    this.toparse = null;
    return results;
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };

  return ArrayUser;
}

module.exports = createArrayUser;

},{}],2:[function(require,module,exports){
function createBoolUser(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    ByteUser = bufferlib.ByteUser;

  function BoolUser() {
    ByteUser.call(this);
  }
  lib.inherit(BoolUser, ByteUser);
  BoolUser.prototype.use = function () {
    if (this.availableBytes() < 1) {
      return;
    }
    var ret = this.buffer[this.cursor];
    ret = (ret === 0 ? false : true);
    this.cursor += 1;
    return ret;
  };
  BoolUser.prototype.neededBytes = function () {
    return 1;
  };
  BoolUser.prototype.toBuffer = function (item, buffer) {
    if (item) {
      buffer[0] = 1;
    } else {
      buffer[0] = 0;
    }
  };

  return BoolUser;
}

module.exports = createBoolUser;

},{}],3:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_bufferlib',require('./index')(ALLEX));

},{"./index":10}],4:[function(require,module,exports){
(function (Buffer){
function createBufferUserBase(execlib) {
  'use strict';
  var lib = execlib.lib;

  function BufferUserBase() {
    this.buffer = null;
    this.cursor = null;
  }
  BufferUserBase.prototype.destroy = function () {
    this.cursor = null;
    this.buffer = null;
  };
  BufferUserBase.prototype.init = function (buff, cursor) {
    this.buffer = buff;
    this.cursor = cursor || 0;
  };
  BufferUserBase.prototype.process = function (buffer) {
    var b = this.buffer, tail, bc;
    if (buffer) {
      if (b) {
        if (this.cursor < b.length) {
          /*
          tail = b.length-this.cursor;
          bc = Buffer.alloc(tail + b.length);
          b.copy(bc, 0, this.cursor, b.length);
          buffer.copy(bc, tail, 0, buffer.length);
          this.buffer = bc;
          */
          this.buffer = Buffer.concat([b.slice(this.cursor), buffer]);
          this.cursor = 0;
        } else {
          this.init(buffer);
        }
      } else {
        this.init(buffer);
      }
    }
    return this.use();
  };
  BufferUserBase.prototype.availableBytes = function () {
    if (!this.buffer) {
      return 0;
    }
    return this.buffer.length - this.cursor;
  };
  BufferUserBase.prototype.currentPosition = function () {
    if (!this.buffer) {return null;}
    return this.buffer.slice(this.cursor);
  };
  BufferUserBase.prototype.neededBytes = function () {
    throw new lib.Error('NOT_IMPLEMENTED', 'Generic BufferUserBase does not implement neededBytes');
  };
  BufferUserBase.prototype.toBuffer = function (item, buffer) {
    throw new lib.Error('NOT_IMPLEMENTED', 'Generic BufferUserBase does not implement toBuffer');
  };

  return BufferUserBase;
};

module.exports = createBufferUserBase;

}).call(this,require("buffer").Buffer)
},{"buffer":46}],5:[function(require,module,exports){
function createBufferUser(execlib, BufferUserBase, toBuffer) {
  'use strict';
  var lib = execlib.lib,
    _LENBUFFSIZE = 4;

  function BufferUser(buff, cursor) {
    BufferUserBase.call(this, buff, cursor);
    this.buflen = null;
  }
  lib.inherit(BufferUser, BufferUserBase);
  BufferUser.prototype.destroy = function () {
    this.buflen = null;
    BufferUserBase.prototype.destroy.call(this);
  };
  BufferUser.prototype.init = function (buff, cursor) {
    BufferUserBase.prototype.init.call(this, buff, cursor);
    this.buflen = null;
  };
  BufferUser.prototype.use = function () {
    if (!this.buflen && this.availableBytes()>_LENBUFFSIZE) {
      this.buflen = this.buffer.readUInt32LE(this.cursor);
    }
    if (!this.buflen) {
      return;
    }
    var neededbytes = this.buflen+_LENBUFFSIZE,
      availablebytes = this.buffer.length-this.cursor,
      ret;
    //console.log('BufferUser needs', neededbytes, 'bytes');
    if (neededbytes<=availablebytes) {
      //console.log('slicing from', this.cursor, 'for', this.buflen, 'bytes on buffer of', this.buffer.length, 'bytes');
      ret = this.buffer.slice(this.cursor+_LENBUFFSIZE, this.cursor+_LENBUFFSIZE+this.buflen);
      //console.log('final result is', ret);
      this.buflen = null;
      this.cursor += neededbytes;
      return ret;
    }
  };
  BufferUser.prototype.neededBytes = function (buff) {
    buff = toBuffer(buff);
    return buff.length+_LENBUFFSIZE;
  };
  BufferUser.prototype.toBuffer = function (bufferitem, buffer) {
    bufferitem = toBuffer(bufferitem);
    buffer.writeUInt32LE(bufferitem.length, 0);
    bufferitem.copy(buffer, _LENBUFFSIZE);
  };

  return BufferUser;
}

module.exports = createBufferUser;


},{}],6:[function(require,module,exports){
function createByteArrayUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;

  function ByteArrayUser(len) {
    BufferUserBase.call(this);
    this.len = len;
  }
  lib.inherit(ByteArrayUser, BufferUserBase);
  ByteArrayUser.prototype.destroy = function () {
    this.len = null;
    BufferUserBase.prototype.destroy.call(this);
  };
  ByteArrayUser.prototype.use = function () {
    if (!this.buffer) {
      //console.log ('no buffer, no ByteArray now');
      return;
    }
    if (this.availableBytes() < this.len) {
      //console.log('Cannot read', this.len, 'bytes, buffer is', this.buffer.length, 'long, my cursor at', this.cursor, 'I need', this.len, 'bytes, so availableBytes yields', this.availableBytes());
      return;
    }
    var ret = new Array(this.len), i;
    for(i = 0; i < this.len; i++) {
      ret[i] = this.buffer[this.cursor+i];
    }
    this.cursor += this.len;
    return ret;
  };
  ByteArrayUser.prototype.neededBytes = function () {
    return this.len;
  };
  function buffWriter(buffer, item, index) {
    buffer[index] = item;
  }
  ByteArrayUser.prototype.toBuffer = function (numarray, buffer) {
    if(numarray.length!==this.len) {
      throw new lib.Error('INVALID_NUMARRAY_LENGTH', 'Array of numbers provided to toBuffer needs to be '+this.len+' elements long');
    }
    var _b = buffer;
    numarray.forEach(buffWriter.bind(null, _b));
    _b = null;
  };

  return ByteArrayUser;
}

module.exports = createByteArrayUser;

},{}],7:[function(require,module,exports){
function createByteUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;

  function ByteUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(ByteUser, BufferUserBase);
  ByteUser.prototype.use = function () {
    if (this.availableBytes() < 1) {
      return;
    }
    var ret = this.buffer[this.cursor];
    this.cursor += 1;
    return ret;
  };
  ByteUser.prototype.neededBytes = function () {
    return 1;
  };
  ByteUser.prototype.toBuffer = function (item, buffer) {
    buffer[0] = item;
  };

  return ByteUser;
}

module.exports = createByteUser;

},{}],8:[function(require,module,exports){
function createCharUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;

  function CharUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(CharUser, BufferUserBase);
  CharUser.prototype.use = function () {
    if (this.availableBytes() < 1) {
      return;
    }
    var ret = String.fromCharCode(this.buffer[this.cursor]);
    this.cursor += 1;
    return ret;
  };
  CharUser.prototype.neededBytes = function () {
    return 1;
  };
  CharUser.prototype.toBuffer = function (item, buffer) {
    buffer[0] = item.charCodeAt(0);
  };

  return CharUser;
}

module.exports = createCharUser;

},{}],9:[function(require,module,exports){
(function (Buffer){
function createConditionalLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    Logic = bufferlib.Logic;

  function ConditionalLogic(outercb) {
    Logic.call(this, this.criteriaLogicUserNames, this.onTimeToSwitchLogic.bind(this));
    this.logics = new lib.Map();
    this.parsingLogic = null;
    this.outercb = outercb;
    this.tempCurrentPosition = null;
    //console.log('ConditionalLogic created', this);
  }
  lib.inherit(ConditionalLogic, Logic);
  ConditionalLogic.prototype.destroy = function () {
    this.tempCurrentPosition = null;
    this.outercb = null;
    this.parsingLogic = null;
    if (this.logics) {
      lib.containerDestroyAll(this.logics);
      this.logics.destroy();
    }
    this.logics = null;
    Logic.prototype.destroy.call(this);
  };
  ConditionalLogic.prototype.takeBuffer = function (buff) {
    if (this.tempCurrentPosition) {
      this.tempCurrentPosition = Buffer.concat([this.tempCurrentPosition, buff]);
      return;
    }
    //console.log('ConditionalLogic takeBuffer', buff, ', parsingLogic', this.parsingLogic);
    if (this.parsingLogic) {
      this.parsingLogic.takeBuffer(buff);
    } else {
      Logic.prototype.takeBuffer.call(this, buff);
    }
  };
  ConditionalLogic.prototype.onTimeToSwitchLogic = function () {
    //console.trace();
    //console.log('onTimeToSwitchLogic maybe, parsingLogic', this.parsingLogic);
    var logicname, logic;
    if (this.parsingLogic) {
      throw new lib.Error('SHOULDNT_HAVE_HAD_PARSING_LOGIC');
    }
    logicname = this.logicNameFromResults();
    //console.log('onTimeToSwitchLogic', this.results, '=>', logicname);
    logic = this.getLogic(logicname);
    if (logic) {
      //console.log('activating logic');
      this.activateLogic(logic);
    }
    return 'stop';
  };
  ConditionalLogic.prototype.activateLogic = function (logic) {
    this.parsingLogic = logic;
    //console.log('methodname', methodname, '=> logic', logic);
    //console.log('logic buffer length', logic.buffer ? logic.buffer.length : 0);
    logic.takeBuffer(this.currentPosition());
  };
  ConditionalLogic.prototype.getLogic = function (logicname) {
    var ret = this.logics.get(logicname);
    if (ret) {
      return ret;
    }
    ret = this.onMissingLogic(logicname);
    if (q.isPromise(ret)){
      q.then(
        this.activateLogic.bind(this)
      );
    } else {
      return ret;
    }
  };
  ConditionalLogic.prototype.finalizeCycle = function (param1foroutercb, param2foroutercb){
    //console.log('finalizeCycle', arguments);
    var logic = this.parsingLogic;
    this.parsingLogic = null;
    if (logic) {
      this.tempCurrentPosition = logic.currentPosition();
    }
    if (!this.outercb) {
      console.error('no outercb in ConditionalLogic?!');
      //this.destroy();
    } else {
      //console.log('calling out with', params);
      try {
      this.outercb.apply(null, Array.prototype.slice.call(arguments,0));
      } catch(e) {
        console.error(e.stack);
        console.error(e);
      }
    }
    //console.log('finalizeCycle ends on', currpos ? currpos.toString() : 'null');
    if (this.tempCurrentPosition) {
      lib.runNext(this.cycleAgain.bind(this));
    }
    return 'stop';
  };
  ConditionalLogic.prototype.cycleAgain = function () {
    var buff = this.tempCurrentPosition;
    this.tempCurrentPosition = null;
    this.reset();
    this.takeBuffer(buff);
  };

  return ConditionalLogic;
}

module.exports = createConditionalLogic;

}).call(this,require("buffer").Buffer)
},{"buffer":46}],10:[function(require,module,exports){
(function (Buffer){
function createBufferLib (execlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = require('./bufferuserbasecreator')(execlib),
    StringUser = require('./stringusercreator')(execlib, BufferUserBase);

  function array2buffer (array) {
    var al = array.length, ret = Buffer.alloc(al), i;
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


}).call(this,require("buffer").Buffer)
},{"./arrayusercreator":1,"./boolusercreator":2,"./bufferuserbasecreator":4,"./bufferusercreator":5,"./bytearrayusercreator":6,"./byteusercreator":7,"./charusercreator":8,"./conditionallogiccreator":9,"./int16beusercreator":11,"./int16leusercreator":12,"./int32beusercreator":13,"./int32leusercreator":14,"./int48beusercreator":15,"./int48leusercreator":16,"./int64beusercreator":17,"./int64leusercreator":18,"./int8usercreator":19,"./integerstringusercreator":20,"./jsonschemadescriptor2usernamescreator":21,"./jsonstringusercreator":22,"./logiccreator":23,"./logicusercreator":24,"./rpclogicclientcreator":26,"./rpclogiccreator":27,"./rpclogicservercreator":28,"./stringusercreator":29,"./synchronouslogiccreator":30,"./tcpcallablestandaloneclientcreator":31,"./tcpcallablestandalonecreator":32,"./uint16beusercreator":33,"./uint16leusercreator":34,"./uint32beusercreator":35,"./uint32leusercreator":36,"./uint48beusercreator":37,"./uint48leusercreator":38,"./uint64beusercreator":39,"./uint64leusercreator":40,"./userproducer":41,"./usertcprmiclientcreator":42,"./usertcprmimixincreator":43,"buffer":46}],11:[function(require,module,exports){
function createInt16BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int16BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int16BEUser, BufferUserBase);
  Int16BEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readInt16BE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  Int16BEUser.prototype.neededBytes = function () {
    return 2;
  };
  Int16BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt16BE(item, 0);
  };

  return Int16BEUser;
}

module.exports = createInt16BEUser;

},{}],12:[function(require,module,exports){
function createInt16LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int16LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int16LEUser, BufferUserBase);
  Int16LEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readInt16LE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  Int16LEUser.prototype.neededBytes = function () {
    return 2;
  };
  Int16LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt16LE(item, 0);
  };

  return Int16LEUser;
}

module.exports = createInt16LEUser;

},{}],13:[function(require,module,exports){
function createInt32BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int32BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int32BEUser, BufferUserBase);
  Int32BEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readInt32BE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  Int32BEUser.prototype.neededBytes = function () {
    return 4;
  };
  Int32BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt32BE(item, 0);
  };

  return Int32BEUser;
}

module.exports = createInt32BEUser;

},{}],14:[function(require,module,exports){
function createInt32LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int32LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int32LEUser, BufferUserBase);
  Int32LEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readInt32LE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  Int32LEUser.prototype.neededBytes = function () {
    return 4;
  };
  Int32LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeInt32LE(item, 0);
  };

  return Int32LEUser;
}

module.exports = createInt32LEUser;

},{}],15:[function(require,module,exports){
function createInt48BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int48BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int48BEUser, BufferUserBase);
  Int48BEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readIntBE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  Int48BEUser.prototype.neededBytes = function () {
    return 6;
  };
  Int48BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeIntBE(item, 0, 6);
  };

  return Int48BEUser;
}

module.exports = createInt48BEUser;

},{}],16:[function(require,module,exports){
function createInt48LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int48LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int48LEUser, BufferUserBase);
  Int48LEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readIntLE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  Int48LEUser.prototype.neededBytes = function () {
    return 6;
  };
  Int48LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeIntLE(item, 0, 6);
  };

  return Int48LEUser;
}

module.exports = createInt48LEUser;

},{}],17:[function(require,module,exports){
var Int64 = require('node-int64');
function createInt64BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int64BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int64BEUser, BufferUserBase);
  Int64BEUser.prototype.use = function () {
    var ret;
    if (this.availableBytes() < 8) {
      return;
    }
    ret = (new Int64(this.buffer, this.cursor))+0;
    //console.log(this.buffer.slice(this.cursor, this.cursor+8), '=>', ret);
    this.cursor += 8;
    return ret;
  };
  Int64BEUser.prototype.neededBytes = function () {
    return 8;
  };
  Int64BEUser.prototype.toBuffer = function (item, buffer) {
    var int64 = new Int64(item);
    int64.copy(buffer, 0);
  };

  return Int64BEUser;
}

module.exports = createInt64BEUser;

},{"node-int64":25}],18:[function(require,module,exports){
(function (Buffer){
var Int64 = require('node-int64');
function copy64mirror (src, target, srcstart, targetstart) {
  if (!Buffer.isBuffer(src)) {
    throw new Error('Source provided was not a buffer');
  }
  if (!Buffer.isBuffer(target)) {
    throw new Error('Target provided was not a buffer');
  }
  targetstart = targetstart || 0;
  srcstart = srcstart || 0;
  for (var i = 0; i<8; i++) {
    target[targetstart+7-i] = src[srcstart+i];
  }
}
function createInt64LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function Int64LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(Int64LEUser, BufferUserBase);
  Int64LEUser.prototype.use = function () {
    var ret, tb;
    if (this.availableBytes() < 8) {
      return;
    }
    tb = Buffer.alloc(8);
    copy64mirror(this.buffer, tb, this.cursor);
    ret = (new Int64(tb))+0;
    this.cursor += 8;
    return ret;
  };
  Int64LEUser.prototype.neededBytes = function () {
    return 8;
  };
  Int64LEUser.prototype.toBuffer = function (item, buffer) {
    var int64 = new Int64(item), tb = Buffer.alloc(8);
    int64.copy(tb, 0);
    copy64mirror(tb, buffer);
  };

  return Int64LEUser;
}

module.exports = createInt64LEUser;

}).call(this,require("buffer").Buffer)
},{"buffer":46,"node-int64":25}],19:[function(require,module,exports){
function createInt8User(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    ByteUser = bufferlib.ByteUser;
    
  function Int8User() {
    ByteUser.call(this);
  }
  lib.inherit(Int8User, ByteUser);
  Int8User.prototype.use = function () {
    var ret = ByteUser.prototype.use.call(this);
    if ('number' === typeof ret) {
      if (ret > 127) {
        return -(128-(ret & 0x7f));
      }
    }
    return ret;
  };

  return Int8User;
}

module.exports = createInt8User;

},{}],20:[function(require,module,exports){
function createIntegerStringUser(execlib, StringUser) {
  'use strict';
  var lib = execlib.lib;

  function IntegerStringUser(buff, cursor) {
    StringUser.call(this, buff, cursor);
  }
  lib.inherit(IntegerStringUser, StringUser);
  IntegerStringUser.prototype.use = function () {
    var ret = StringUser.prototype.use.call(this);
    if ('undefined' !== typeof ret) {
      return parseInt(ret);
    }
    return ret;
  };
  IntegerStringUser.prototype.neededBytes = function (intnum) {
    return StringUser.prototype.neededBytes(intnum+'');
  };
  IntegerStringUser.prototype.toBuffer = function (item, buffer) {
    return StringUser.prototype.toBuffer.call(this, item+'', buffer);
  };

  return IntegerStringUser;
}

module.exports = createIntegerStringUser;

},{}],21:[function(require,module,exports){
function createJSONSchemaDescriptor2UserNames(execlib) {
  'use strict';

  function userNameForParameterDescriptor(paramdesc) {
    if (paramdesc.strongtype) {
      return paramdesc.strongtype;
    }
    switch (paramdesc.type) {
      case 'string':
        return 'String';
      case 'integer':
        return 'IntegerString';
      case 'object':
        return 'JSONString';
      case 'array':
        return 'JSONString';
      default: 
        return 'JSONString';
    }
  }

  function jsonSchemaDescriptor2UserNames(jsd) {
    return jsd.map(userNameForParameterDescriptor);
  }

  return jsonSchemaDescriptor2UserNames;
}

module.exports = createJSONSchemaDescriptor2UserNames;

},{}],22:[function(require,module,exports){
function createJSONStringUser(execlib, StringUser) {
  'use strict';
  var lib = execlib.lib;

  function JSONStringUser(buff, cursor) {
    StringUser.call(this, buff, cursor);
  }
  lib.inherit(JSONStringUser, StringUser);
  JSONStringUser.prototype.use = function () {
    var ret = StringUser.prototype.use.call(this);
    if ('undefined' !== typeof ret) {
      try {
        return JSON.parse(ret);
      } catch (e) {
        console.error(e.stack);
        console.error(e);
        return null;
      }
    }
    return ret;
  };
  JSONStringUser.prototype.neededBytes = function (obj) {
    return StringUser.prototype.neededBytes.call(this, JSON.stringify(obj));
  };
  JSONStringUser.prototype.toBuffer = function (item, buffer) {
    return StringUser.prototype.toBuffer.call(this, JSON.stringify(item), buffer);
  };

  return JSONStringUser;
}

module.exports = createJSONStringUser;

},{}],23:[function(require,module,exports){
(function (Buffer){
function createLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    userProducer = bufferlib.userProducer;

  function Logic(usernamearry, frombuffercb) {
    if (!usernamearry) {
      throw new lib.Error('USERNAME_ARRAY_NEEDED');
    }
    this.users = usernamearry.map(userProducer);
    this.cb = frombuffercb;
    this.results = new Array(this.users.length);
    this.current = 0;
    this.buffers = [];
    this.blocked = false;
  }
  Logic.prototype.destroy = function () {
    this.blocked = null;
    if (this.buffers) {
      if (this.buffers.length) {
        console.error('BUFFERS NOT CONSUMED!');
      }
      this.buffers = null;
    }
    this.results = null;
    this.cb = null;
    if (this.users) {
      lib.arryDestroyAll(this.users);
    }
    this.users = null;
  };
  Logic.prototype.takeBuffer = function (buffer) {
    if (!this.cb) {
      return;
    }
    if (this.blocked) {
      this.buffers.push(buffer);
      return;
    };
    var ret = this.process(buffer), shouldstop;
    while(ret) {
      if (!this.cb) {
        console.log('no cb, will get out now');
        return;
      }
      shouldstop = this.cb(ret);
      if (shouldstop === 'stop') {
        this.reset();
        this.current = 0;
        return;
      }
      if (q.isPromise(shouldstop)) {
        //console.log('blocking on promise');
        this.blocked = true;
        shouldstop.then(this.unblock.bind(this));
        return;
      }
      ret = this.process();
    }
    if (!this.blocked) {
      buffer = this.buffers.shift();
      if (buffer) {
        this.takeBuffer(buffer);
      }
    }
  };
  function resetter(user) {
    user.init(null);
  }
  Logic.prototype.unblock = function () {
    this.blocked = false;
    this.takeBuffer();
  };
  Logic.prototype.reset = function () {
    if (!this.users) {
      return;
    }
    this.users.forEach(resetter);
  };
  Logic.prototype.process = function (buffer) {
    //console.log('process?', buffer);
    var currentuser = this.users[this.current],
      ret = currentuser.process(buffer);
    if ('undefined' !== typeof ret) {
      if (currentuser.availableBytes() < 1){
        //console.log('resetting at ret', ret, 'current user', this.current, require('util').inspect(currentuser, {depth:null}));
        this.reset();
      }
      this.results[this.current] = ret;
      //console.log('results', this.results, 'currently at', this.current);
      this.current++;
      if (this.current === this.users.length) {
        this.current = 0;
        this.users[this.current].init(currentuser.buffer, currentuser.cursor);
        return this.results;
      }
      this.users[this.current].init(currentuser.buffer, currentuser.cursor);
      return this.process();
    }
    //console.log('stopping at', currentuser.cursor, 'of', currentuser.buffer ? currentuser.buffer.length : null, 'current user index', this.current);
  };
  Logic.prototype.currentPosition = function () {
    if (!this.users) {return null;}
    var currentuser = this.users[this.current];
    if (!currentuser) {return null;}
    return currentuser.currentPosition();
  };
  function bytelenSummer(users, result, item, index) {
    return result + users[index].neededBytes(item);
  }
  function bufferWriter(buffer, users, byteoffset, item, index) {
    var user = users[index], nb = user.neededBytes(item);
    user.toBuffer(item, buffer.slice(byteoffset, byteoffset+nb));
    return byteoffset+nb;
  }
  Logic.prototype.neededBytes = function (dataarray) {
    if (dataarray.length !== this.users.length) {
      console.log('dataarray: ',dataarray);
      throw new lib.Error('DATA_ARRAY_LENGTH_MISMATCH', 'Data array provided has to be '+this.users.length+' elements long');
    }
    var _users = this.users, ret;
    ret = dataarray.reduce(bytelenSummer.bind(null, _users), 0)
    _users = null;
    return ret;
  };
  Logic.prototype.toBuffer = function (dataarray, buffer, offset) {
    var buflen = this.neededBytes(dataarray), ret, _ret, _users;
    if (dataarray.length !== this.users.length) {
      throw new lib.Error('DATA_ARRAY_LENGTH_MISMATCH', 'Data array provided has to be '+this.users.length+' elements long');
    }
    offset = offset || 0;
    buffer = buffer || Buffer.alloc(buflen);
    ret = buffer.slice(offset, offset+buflen);
    _ret = ret;
    _users = this.users;
    dataarray.reduce(bufferWriter.bind(null, _ret, _users), 0);
    _ret = null;
    _users = null;
    return ret;
  };

  return Logic;
}

module.exports = createLogic;

}).call(this,require("buffer").Buffer)
},{"buffer":46}],24:[function(require,module,exports){
function createLogicUser (execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    SynchronousLogic = bufferlib.SynchronousLogic;

  function LogicUser(usernamearray) {
    SynchronousLogic.call(this, usernamearray);
    this.buffer = null;
    this.offset = 0;
  }
  lib.inherit(LogicUser, SynchronousLogic);
  LogicUser.prototype.destroy = function () {
    this.offset = null;
    this.buffer = null;
    SynchronousLogic.prototype.destroy.call(this);
  };
  LogicUser.prototype.init = bufferlib.BufferUserBase.prototype.init;
  /*
  LogicUser.prototype.init = function (buffer, cursor) {
    var b = this.buffer;
    this.buffer = buffer;
    this.cursor = cursor || 0;
    console.trace();
    console.log('LogicUser init offset', cursor, buffer, '=>', this.buffer);
  };
  */
  //LogicUser.prototype.process = bufferlib.BufferUserBase.prototype.process;
  LogicUser.prototype.use = function () {
    try {
      var ret = this.decode(this.buffer.slice(this.cursor || 0));
      if (ret) {
        this.cursor += this.neededBytes(ret);
      }
      return ret;
    } catch(e) {
      if (e.code === 'INVALID_BUFFER_FOR_DECODE') {
        return null;
      }
      throw e;
    }
  };

  return LogicUser;
}

module.exports = createLogicUser;

},{}],25:[function(require,module,exports){
(function (Buffer){
//     Int64.js
//
//     Copyright (c) 2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

/**
 * Support for handling 64-bit int numbers in Javascript (node.js)
 *
 * JS Numbers are IEEE-754 binary double-precision floats, which limits the
 * range of values that can be represented with integer precision to:
 *
 * 2^^53 <= N <= 2^53
 *
 * Int64 objects wrap a node Buffer that holds the 8-bytes of int64 data.  These
 * objects operate directly on the buffer which means that if they are created
 * using an existing buffer then setting the value will modify the Buffer, and
 * vice-versa.
 *
 * Internal Representation
 *
 * The internal buffer format is Big Endian.  I.e. the most-significant byte is
 * at buffer[0], the least-significant at buffer[7].  For the purposes of
 * converting to/from JS native numbers, the value is assumed to be a signed
 * integer stored in 2's complement form.
 *
 * For details about IEEE-754 see:
 * http://en.wikipedia.org/wiki/Double_precision_floating-point_format
 */

// Useful masks and values for bit twiddling
var MASK31 =  0x7fffffff, VAL31 = 0x80000000;
var MASK32 =  0xffffffff, VAL32 = 0x100000000;

// Map for converting hex octets to strings
var _HEX = [];
for (var i = 0; i < 256; i++) {
  _HEX[i] = (i > 0xF ? '' : '0') + i.toString(16);
}

//
// Int64
//

/**
 * Constructor accepts any of the following argument types:
 *
 * new Int64(buffer[, offset=0]) - Existing Buffer with byte offset
 * new Int64(Uint8Array[, offset=0]) - Existing Uint8Array with a byte offset
 * new Int64(string)             - Hex string (throws if n is outside int64 range)
 * new Int64(number)             - Number (throws if n is outside int64 range)
 * new Int64(hi, lo)             - Raw bits as two 32-bit values
 */
var Int64 = module.exports = function(a1, a2) {
  if (a1 instanceof Buffer) {
    this.buffer = a1;
    this.offset = a2 || 0;
  } else if (Object.prototype.toString.call(a1) == '[object Uint8Array]') {
    // Under Browserify, Buffers can extend Uint8Arrays rather than an
    // instance of Buffer. We could assume the passed in Uint8Array is actually
    // a buffer but that won't handle the case where a raw Uint8Array is passed
    // in. We construct a new Buffer just in case.
    this.buffer = new Buffer(a1);
    this.offset = a2 || 0;
  } else {
    this.buffer = this.buffer || new Buffer(8);
    this.offset = 0;
    this.setValue.apply(this, arguments);
  }
};


// Max integer value that JS can accurately represent
Int64.MAX_INT = Math.pow(2, 53);

// Min integer value that JS can accurately represent
Int64.MIN_INT = -Math.pow(2, 53);

Int64.prototype = {

  constructor: Int64,

  /**
   * Do in-place 2's compliment.  See
   * http://en.wikipedia.org/wiki/Two's_complement
   */
  _2scomp: function() {
    var b = this.buffer, o = this.offset, carry = 1;
    for (var i = o + 7; i >= o; i--) {
      var v = (b[i] ^ 0xff) + carry;
      b[i] = v & 0xff;
      carry = v >> 8;
    }
  },

  /**
   * Set the value. Takes any of the following arguments:
   *
   * setValue(string) - A hexidecimal string
   * setValue(number) - Number (throws if n is outside int64 range)
   * setValue(hi, lo) - Raw bits as two 32-bit values
   */
  setValue: function(hi, lo) {
    var negate = false;
    if (arguments.length == 1) {
      if (typeof(hi) == 'number') {
        // Simplify bitfield retrieval by using abs() value.  We restore sign
        // later
        negate = hi < 0;
        hi = Math.abs(hi);
        lo = hi % VAL32;
        hi = hi / VAL32;
        if (hi > VAL32) throw new RangeError(hi  + ' is outside Int64 range');
        hi = hi | 0;
      } else if (typeof(hi) == 'string') {
        hi = (hi + '').replace(/^0x/, '');
        lo = hi.substr(-8);
        hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : '';
        hi = parseInt(hi, 16);
        lo = parseInt(lo, 16);
      } else {
        throw new Error(hi + ' must be a Number or String');
      }
    }

    // Technically we should throw if hi or lo is outside int32 range here, but
    // it's not worth the effort. Anything past the 32'nd bit is ignored.

    // Copy bytes to buffer
    var b = this.buffer, o = this.offset;
    for (var i = 7; i >= 0; i--) {
      b[o+i] = lo & 0xff;
      lo = i == 4 ? hi : lo >>> 8;
    }

    // Restore sign of passed argument
    if (negate) this._2scomp();
  },

  /**
   * Convert to a native JS number.
   *
   * WARNING: Do not expect this value to be accurate to integer precision for
   * large (positive or negative) numbers!
   *
   * @param allowImprecise If true, no check is performed to verify the
   * returned value is accurate to integer precision.  If false, imprecise
   * numbers (very large positive or negative numbers) will be forced to +/-
   * Infinity.
   */
  toNumber: function(allowImprecise) {
    var b = this.buffer, o = this.offset;

    // Running sum of octets, doing a 2's complement
    var negate = b[o] & 0x80, x = 0, carry = 1;
    for (var i = 7, m = 1; i >= 0; i--, m *= 256) {
      var v = b[o+i];

      // 2's complement for negative numbers
      if (negate) {
        v = (v ^ 0xff) + carry;
        carry = v >> 8;
        v = v & 0xff;
      }

      x += v * m;
    }

    // Return Infinity if we've lost integer precision
    if (!allowImprecise && x >= Int64.MAX_INT) {
      return negate ? -Infinity : Infinity;
    }

    return negate ? -x : x;
  },

  /**
   * Convert to a JS Number. Returns +/-Infinity for values that can't be
   * represented to integer precision.
   */
  valueOf: function() {
    return this.toNumber(false);
  },

  /**
   * Return string value
   *
   * @param radix Just like Number#toString()'s radix
   */
  toString: function(radix) {
    return this.valueOf().toString(radix || 10);
  },

  /**
   * Return a string showing the buffer octets, with MSB on the left.
   *
   * @param sep separator string. default is '' (empty string)
   */
  toOctetString: function(sep) {
    var out = new Array(8);
    var b = this.buffer, o = this.offset;
    for (var i = 0; i < 8; i++) {
      out[i] = _HEX[b[o+i]];
    }
    return out.join(sep || '');
  },

  /**
   * Returns the int64's 8 bytes in a buffer.
   *
   * @param {bool} [rawBuffer=false]  If no offset and this is true, return the internal buffer.  Should only be used if
   *                                  you're discarding the Int64 afterwards, as it breaks encapsulation.
   */
  toBuffer: function(rawBuffer) {
    if (rawBuffer && this.offset === 0) return this.buffer;

    var out = new Buffer(8);
    this.buffer.copy(out, 0, this.offset, this.offset + 8);
    return out;
  },

  /**
   * Copy 8 bytes of int64 into target buffer at target offset.
   *
   * @param {Buffer} targetBuffer       Buffer to copy into.
   * @param {number} [targetOffset=0]   Offset into target buffer.
   */
  copy: function(targetBuffer, targetOffset) {
    this.buffer.copy(targetBuffer, targetOffset || 0, this.offset, this.offset + 8);
  },

  /**
   * Returns a number indicating whether this comes before or after or is the
   * same as the other in sort order.
   *
   * @param {Int64} other  Other Int64 to compare.
   */
  compare: function(other) {

    // If sign bits differ ...
    if ((this.buffer[this.offset] & 0x80) != (other.buffer[other.offset] & 0x80)) {
      return other.buffer[other.offset] - this.buffer[this.offset];
    }

    // otherwise, compare bytes lexicographically
    for (var i = 0; i < 8; i++) {
      if (this.buffer[this.offset+i] !== other.buffer[other.offset+i]) {
        return this.buffer[this.offset+i] - other.buffer[other.offset+i];
      }
    }
    return 0;
  },

  /**
   * Returns a boolean indicating if this integer is equal to other.
   *
   * @param {Int64} other  Other Int64 to compare.
   */
  equals: function(other) {
    return this.compare(other) === 0;
  },

  /**
   * Pretty output in console.log
   */
  inspect: function() {
    return '[Int64 value:' + this + ' octets:' + this.toOctetString(' ') + ']';
  }
};

}).call(this,require("buffer").Buffer)
},{"buffer":46}],26:[function(require,module,exports){
function createRPCLogicClient(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function InLogic(outercb) {
    bufferlib.ConditionalLogic.call(this,outercb);
    this.logics.add('a', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'a')));
    this.logics.add('r', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'r')));
    this.logics.add('e', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'e')));
    this.logics.add('n', new bufferlib.Logic(['String', 'Char', 'Buffer'], this.onParseDone.bind(this, 'n')));
    this.logics.add('o', new bufferlib.Logic(['String', 'Char', 'Char', 'Buffer'], this.onParseDone.bind(this, 'o')));
  }
  lib.inherit(InLogic, bufferlib.ConditionalLogic);
  InLogic.prototype.logicNameFromResults = function () {
    //console.log('InLogic logicNameFromResults', this.results[0]);
    return this.results[0];
  };
  InLogic.prototype.onParseDone = function (modechar, params){
    //console.log(modechar, 'step done with', params);
    return this.finalizeCycle([modechar].concat(params));
  };
  InLogic.prototype.criteriaLogicUserNames = ['Char'];

  function RPCLogicClient(methoddescriptorprovider, onoobcb) {
    this.onoobcb = onoobcb;
    this.rpclogic = new bufferlib.RPCLogic(methoddescriptorprovider);
    //this.inlogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Buffer'], this.onResponse.bind(this));
    this.inlogic = new InLogic(this.onResponse.bind(this));
    this.mydefers = new lib.Map();
    this.hisdefers = new lib.Map();
  }
  function rejector(defer) {
    defer.reject(new lib.Error('DYING_PREMATURELY'));
  }
  RPCLogicClient.prototype.destroy = function () {
    if (this.hisdefers) {
      this.hisdefers.traverse(rejector);
      this.hisdefers.destroy();
    }
    this.hisdefers = null;
    if (this.mydefers) {
      this.mydefers.traverse(rejector);
      this.mydefers.destroy();
    }
    this.mydefers = null;
    if (this.inlogic) {
      this.inlogic.destroy();
    }
    this.inlogic = null;
    if (this.rpclogic) {
      this.rpclogic.destroy();
    }
    this.rpclogic = null;
    this.onoobcb = null;
  };
  RPCLogicClient.prototype.takeBuffer = function (buff) {
    this.inlogic.takeBuffer(buff);
  };
  RPCLogicClient.prototype.onResponse = function (inarry) {
    //console.log('onResponse', inarry);
    try {
    var command = inarry[0],
      id = inarry[1],
      contentmode = inarry[2],
      content = inarry[3];
    switch(command) {
      case 'a':
        this.reLinkDefer(id, this.content(contentmode, content));
        break;
      case 'r':
        this.resolveDefer(id, this.content(contentmode, content));
        break;
      case 'e':
        this.rejectDefer(id, this.content(contentmode, content));
        break;
      case 'n':
        this.notifyDefer(id, this.content(contentmode, content));
        break;
      case 'o':
        this.doOOB(inarry);
        break;
    }
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  RPCLogicClient.prototype.content = function (contentmode, content) {
    if (contentmode === 'j') {
      return JSON.parse(content.toString());
    }
    if (contentmode === 'b') {
      return content;
    }
  };
  RPCLogicClient.prototype.doOOB = function (inarry) {
    try {
    var carriersessionid = inarry[1],
      oobchannel = inarry[2],
      contentmode = inarry[3],
      content = inarry[4],
      oobcontent;
      if(this.onoobcb) {
        oobcontent = this.content(contentmode, content);
    //console.log('doOOB!', contentmode, content, '=>', oobcontent, 'from carriersessionid', carriersessionid, 'on channel', oobchannel);
        this.onoobcb(oobchannel, oobcontent);
      }
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
    //console.log('doOOB!', oobcontent);
    //return [oobcontent[0], JSON.parse(oobcontent[1])];
  };
  RPCLogicClient.prototype.reLinkDefer = function (id, myid) {
    if (!this.mydefers) {
      return;
    }
    var myd = this.mydefers.remove(myid),
      hisd;
    if (!myd) {
      console.error('Cannot find my out defer', myid);
      return;
    }
    this.hisdefers.add(id, myd);
  };
  RPCLogicClient.prototype.resolveDefer = function (id, result) {
    if (!this.hisdefers) {
      return;
    }
    var d = this.hisdefers.remove(id);
    if (d) {
      d.resolve(result);
    } else {
      console.error('Cannot find his defer', id);
    }
  };
  RPCLogicClient.prototype.rejectDefer = function (id, error) {
    if (!this.hisdefers) {
      return;
    }
    var d = this.hisdefers.remove(id);
    if (d) {
      d.reject(error);
    } else {
      console.error('Cannot find his defer', id);
    }
  };
  RPCLogicClient.prototype.notifyDefer = function (id, progress) {
    var d = this.hisdefers.get(id);
    if (d) {
      d.notify(progress);
    } else {
      console.error('Cannot find his defer', id);
    }
  };

  RPCLogicClient.prototype.call = function (methodname) {
    var params = Array.prototype.slice.call(arguments, 1),
      myd = q.defer(),
      myid = lib.uid();
    this.mydefers.add(myid, myd);
    return {promise: myd.promise, buffer: this.rpclogic.toBuffer(myid, methodname, params)};
  };

  return RPCLogicClient;
}

module.exports = createRPCLogicClient;

},{}],27:[function(require,module,exports){
(function (Buffer){
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

  function RPCLogic(methoddescriptorprovider, outercb, boundparams) {
    ConditionalLogic.call(this, outercb);//this, ['String', 'String'], this.onIDWithMethod.bind(this));
    this.methodDescriptorProvider = methoddescriptorprovider;
    this.boundparams = boundparams;
    this.caller = null;
  }
  lib.inherit(RPCLogic, ConditionalLogic);

  RPCLogic.prototype.destroy = function () {
    this.caller = null;
    this.boundparams = null;
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
    return this.finalizeCycle(callerid, [methodname,params.slice(),this.boundparams]);
  };

  RPCLogic.prototype.toBuffer = function (callerid, methodname, paramsarry) {
    var methodarry = [callerid, methodname],
      methodnb = this.neededBytes(methodarry),
      logic = this.getLogic(methodname),
      paramsnb = logic.neededBytes(paramsarry),
      bufflen = methodnb+paramsnb,
      buffer = Buffer.alloc(bufflen);
    Logic.prototype.toBuffer.call(this, methodarry, buffer, 0);
    logic.toBuffer(paramsarry, buffer, methodnb);
    return buffer;
  };

  RPCLogic.prototype.criteriaLogicUserNames = ['String', 'String'];

  return RPCLogic;
}

module.exports = createRPCLogic;

}).call(this,require("buffer").Buffer)
},{"buffer":46}],28:[function(require,module,exports){
(function (Buffer){
function createRPCLogicServer(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    RPCLogic = bufferlib.RPCLogic,
    _outLogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Buffer']);

  function PendingDefer() {
    this.id = lib.uid();
    this.defer = q.defer();
  }
  PendingDefer.prototype.destroy = function () {
    if (this.defer && this.defer.promise && this.defer.promise.isPending()) {
      this.defer.reject(new lib.Error('DYING_PREMATURELY'));
    }
    this.defer = null;
    this.id = null;
  };

  function RPCLogicServer(callable, methoddescriptorprovider, outcb, boundparams) {
    this.callable = callable;
    this.outcb = outcb;
    this.rpc = new RPCLogic(methoddescriptorprovider, this.onRPC.bind(this), boundparams);
    this.pendingDefers = new lib.Map();
  }
  RPCLogicServer.prototype.destroy = function () {
    if (this.pendingDefers) {
      lib.containerDestroyAll(this.pendingDefers);
      this.pendingDefers.destroy();
    }
    this.pendingDefers = null;
    if (this.rpc) {
      this.rpc.destroy();
    }
    this.rpc = null;
    this.outcb = null;
    this.callable = null;
  };
  RPCLogicServer.prototype.takeBuffer = function (buffer) {
    this.rpc.takeBuffer(buffer);
  };
  RPCLogicServer.prototype.onRPC = function (callerid, execarry) {
    if (!this.outcb) {
      this.destroy();
      return;
    }
    var pd = new PendingDefer();
    this.pendingDefers.add(pd.id, pd);
    this.spit(['a', pd.id, callerid]);
    this.callable.exec(execarry).then(
      this.onResolve.bind(this, pd.id),
      this.onError.bind(this, pd.id),
      this.onNotify.bind(this, pd.id)
    );
  };
  RPCLogicServer.prototype.spit = function (outarry) {
    if (!this.outcb) {
      this.destroy();
      return;
    }
    this.outcb(this.pack(outarry));
  }
  RPCLogicServer.prototype.pack = function (outarry, outlogic) {
    var content = outarry[outarry.length-1],
      b;
    if (Buffer.isBuffer(content)) {
      outarry = outarry.slice(0,-1).concat(['b', content]);
      //outarry = [outarry[0], outarry[1], 'b', content];
    } else {
      outarry = outarry.slice(0,-1).concat(['j', this.nonBufferContentToBuffer(content)]);
      //outarry = [outarry[0], outarry[1], 'j', this.nonBufferContentToBuffer(content)];
    }
    var ret = (outlogic || _outLogic).toBuffer(outarry);
    //console.log('pack', outarry, '=>', ret);
    return ret;
  };
  RPCLogicServer.prototype.nonBufferContentToBuffer = function(content) {
    return Buffer.from(JSON.stringify(content), 'utf8');
  };

  RPCLogicServer.prototype.onResolve = function (id, res) {
    if (this.pendingDefers) {
      this.pendingDefers.remove(id);
    }
    this.spit(['r', id, res]);
  }; 
  RPCLogicServer.prototype.onError = function (id, error) {
    if (this.pendingDefers) {
      this.pendingDefers.remove(id);
    }
    this.spit(['e', id, error]);
  }; 
  RPCLogicServer.prototype.onNotify = function (id, progress) {
    this.spit(['n', id, progress]);
  }; 

  return RPCLogicServer;
}

module.exports = createRPCLogicServer;

}).call(this,require("buffer").Buffer)
},{"buffer":46}],29:[function(require,module,exports){
(function (Buffer){
function createStringUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;

  function StringUser(buff, cursor) {
    BufferUserBase.call(this, buff, cursor);
    this.start = null;
  }
  lib.inherit(StringUser, BufferUserBase);
  StringUser.prototype.destroy = function () {
    this.start = null;
    BufferUserBase.prototype.destroy.call(this);
  };
  StringUser.prototype.init = function (buff, cursor) {
    BufferUserBase.prototype.init.call(this, buff, cursor);
    this.start = cursor;
  };
  StringUser.prototype.use = function () {
    var ret;
    while (this.availableBytes() && this.buffer[this.cursor] !== 0) {
      this.cursor++;
    }
    if (this.buffer && this.buffer[this.cursor] === 0) {
      ret = this.buffer.toString('utf8', this.start, this.cursor);
      this.cursor++;
      return ret;
    }
  };
  StringUser.prototype.neededBytes = function (string) {
    return Buffer.byteLength(string, 'utf8')+1;
  };
  StringUser.prototype.toBuffer = function (item, buffer) {
    var strlen = Buffer.byteLength(item, 'utf8'); //don't use neededBytes because of overloaded versions...
    buffer.write(item, 0, strlen, 'utf8');
    buffer[strlen] = 0;
  };

  return StringUser;
}

module.exports = createStringUser;



}).call(this,require("buffer").Buffer)
},{"buffer":46}],30:[function(require,module,exports){
(function (Buffer){
function createSynchronousLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    Logic = bufferlib.Logic;

  function SynchronousLogic(usernamearray) {
    Logic.call(this, usernamearray, this.syncResult.bind(this));
    this.gotit = null;
  }
  lib.inherit(SynchronousLogic, Logic);
  SynchronousLogic.prototype.destroy = function () {
    this.gotit = null;
    Logic.prototype.destroy.call(this);
  };
  SynchronousLogic.prototype.decode = function (buffer) {
    if (!Buffer.isBuffer(buffer)) {
      return null;
    }
    if (buffer.length < 1) {
      return null;
    }
    this.gotit = void 0;
    this.takeBuffer(buffer);
    if ('undefined' === typeof this.gotit) {
      console.log(buffer, 'not valid?');
      throw new lib.Error('INVALID_BUFFER_FOR_DECODE');
    }
    return this.gotit;
  };
  SynchronousLogic.prototype.syncResult = function () {
    if ('undefined' === typeof this.gotit) {
      this.gotit = this.results.slice(0);
      return 'stop';
    }
  };

  return SynchronousLogic;
}
module.exports = createSynchronousLogic;


}).call(this,{"isBuffer":require("../../node_modules/allexsdk-dev/node_modules/is-buffer/index.js")})
},{"../../node_modules/allexsdk-dev/node_modules/is-buffer/index.js":48}],31:[function(require,module,exports){
var net = require('net');

function createTcpCallableStandaloneClient(execlib, bufferlib) {
  'use strict';
  function TcpCallableStandaloneClient(servicemodulename, host, port, username, password, loggedincb, onoobcb) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.loggedincb = loggedincb;
    this.onoobcb = onoobcb;
    this.session = null;
    this.socket = new net.Socket();
    this.socket.on('error', console.error.bind(console, 'socket error'));
    this.socket.on('data', this.onData.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.rpcclient = null;
    execlib.execSuite.registry.registerClientSide(servicemodulename).then(
      this.onService.bind(this),
      this.onServiceError.bind(this)
    );
  }
  TcpCallableStandaloneClient.prototype.destroy = function () {
    if (this.rpcclient) {
      this.rpcclient.destroy();
    }
    this.rpcclient = null;
    this.socket = null;
    this.session = null;
    this.onoobcb = null;
    this.loggedincb = null;
    this.password = null;
    this.username = null;
    this.port = null;
    this.host = null;
  };
  TcpCallableStandaloneClient.prototype.onService = function (service) {
    //console.log('servicepack', service.get('service').prototype.ClientUser.prototype.__methodDescriptors);
    try {
    this.rpcclient = new bufferlib.RPCLogicClient(service.get('service').prototype.ClientUser.prototype.__methodDescriptors, this.onoobcb);
    this.goConnect();
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  TcpCallableStandaloneClient.prototype.onServiceError = function (error) {
    if (this.socket) {
      this.socket.close();
    } else {
      this.destroy();
    }
  };
  TcpCallableStandaloneClient.prototype.goConnect = function () {
    this.socket.connect(this.port, this.host, this.onConnect.bind(this));
  };
  TcpCallableStandaloneClient.prototype.onConnect = function (error) {
    if (error) {
      console.error('socket connection error', error);
      this.destroy();
      return;
    }
    try {
    var c = this.rpcclient.call('login', this.username, this.password);
    c.promise.then(
      this.onLoggedIn.bind(this),
      this.loggedincb.bind(null, null)
    );
    this.socket.write(c.buffer);
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  TcpCallableStandaloneClient.prototype.onLoggedIn = function (session) {
    this.session = session;
    //console.log('onLoggedIn', this.session);
    this.loggedincb(this, this.session);
  };
  TcpCallableStandaloneClient.prototype.onClose = function () {
    console.log('socket closed', arguments);
    this.destroy();
  };
  TcpCallableStandaloneClient.prototype.onData = function (data) {
    //console.log('data!', data, data.toString());
    this.rpcclient.takeBuffer(data);
  };
  TcpCallableStandaloneClient.prototype.call = function (methodname) {
    var c = this.rpcclient.call('userInvoke', this.session, methodname, Array.prototype.slice.call(arguments, 1));
    this.socket.write(c.buffer);
    return c.promise;
  };

  return TcpCallableStandaloneClient;
}

module.exports = createTcpCallableStandaloneClient;

},{"net":45}],32:[function(require,module,exports){
var net = require('net');

function createTcpCallableStandalone(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib;

  function Connection(callable, socket) {
    this.callable = callable;
    this.socket = socket;
    //console.log('__methodDescriptors', this.callable.__methodDescriptors);
    this.rpcserver = new bufferlib.RPCLogicServer(this.callable, this.callable.__methodDescriptors, this.doSend.bind(this), this);
    this.oobLogic = new bufferlib.Logic(['Char', 'String', 'Char', 'Char', 'Buffer']);
    this.session = null;
    this.socket.on('data', this.onData.bind(this));
    this.socket.on('error', this.destroy.bind(this));
    this.socket.on('close', this.destroy.bind(this));
    this.sessions = new lib.Map();
  }
  Connection.prototype.destroy = function () {
    var sess = this.session, sesss = this.sessions;
    this.sessions = null;
    this.session = null;
    if (this.oobLogic) {
      this.oobLogic.destroy();
    }
    this.oobLogic = null;
    if (this.rpcserver) {
      this.rpcserver.destroy();
    }
    this.rpcserver = null;
    this.socket = null;
    this.callable = null;
    if (sesss) {
      lib.containerDestroyAll(sesss);
      sesss.destroy();
    }
    if (sess) {
      sess.destroy();
    }
  };
  Connection.prototype.onData = function (buffer) {
    //console.log('onData', buffer, buffer.toString());
    this.rpcserver.takeBuffer(buffer);
  };
  Connection.prototype.doSend = function (outbuff) {
    if (this.socket){
      //console.log('doSend', outbuff, outbuff.toString());
      this.socket.write(outbuff);
    }
  };
  Connection.prototype.sendData = function (data) {
    if (!this.socket) {
      return null;
    }
    //console.log('should send data', data);
    var oob;
    if (data[0] === 'oob') {
      oob = data[1];
      this.doSend(this.rpcserver.pack(['o', oob[0], oob[1], oob[2]], this.oobLogic));
    }
  };
  Connection.prototype.add = function(session) {
    if (this.session) {
      console.error('Connection already has a session');
      return;
    }
    if (!session.destroyed) {
      console.error('Session that Connection has to add is dead already'); 
      this.socket.close();
      return;
    }
    this.session = session;
    this.session.destroyed.attach(this.onSessionDown.bind(this));
  };
  Connection.prototype.onSessionDown = function() {
    if (!this.socket) {
      return;
    }
    this.socket.end();
  };
  Connection.prototype.communicationType = 'tcpstandalone';

  function onConnection(callable, socket) {
    new Connection(callable, socket);
  }
  function createServer(callable) {
    return net.createServer(onConnection.bind(null, callable));
  }

  return createServer;
}

module.exports = createTcpCallableStandalone;

},{"net":45}],33:[function(require,module,exports){
function createUInt16BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt16BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt16BEUser, BufferUserBase);
  UInt16BEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readUInt16BE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  UInt16BEUser.prototype.neededBytes = function () {
    return 2;
  };
  UInt16BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt16BE(item, 0);
  };

  return UInt16BEUser;
}

module.exports = createUInt16BEUser;

},{}],34:[function(require,module,exports){
function createUInt16LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt16LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt16LEUser, BufferUserBase);
  UInt16LEUser.prototype.use = function () {
    if (this.availableBytes() < 2) {
      return;
    }
    var ret = this.buffer.readUInt16LE(this.cursor);
    this.cursor += 2;
    return ret;
  };
  UInt16LEUser.prototype.neededBytes = function () {
    return 2;
  };
  UInt16LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt16LE(item, 0);
  };

  return UInt16LEUser;
}

module.exports = createUInt16LEUser;

},{}],35:[function(require,module,exports){
function createUInt32BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt32BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt32BEUser, BufferUserBase);
  UInt32BEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readUInt32BE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  UInt32BEUser.prototype.neededBytes = function () {
    return 4;
  };
  UInt32BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt32BE(item, 0);
  };

  return UInt32BEUser;
}

module.exports = createUInt32BEUser;

},{}],36:[function(require,module,exports){
function createUInt32LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt32LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt32LEUser, BufferUserBase);
  UInt32LEUser.prototype.use = function () {
    if (this.availableBytes() < 4) {
      return;
    }
    var ret = this.buffer.readUInt32LE(this.cursor);
    this.cursor += 4;
    return ret;
  };
  UInt32LEUser.prototype.neededBytes = function () {
    return 4;
  };
  UInt32LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUInt32LE(item, 0);
  };

  return UInt32LEUser;
}

module.exports = createUInt32LEUser;

},{}],37:[function(require,module,exports){
function createUInt48BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt48BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt48BEUser, BufferUserBase);
  UInt48BEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readUIntBE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  UInt48BEUser.prototype.neededBytes = function () {
    return 6;
  };
  UInt48BEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUIntBE(item, 0, 6);
  };

  return UInt48BEUser;
}

module.exports = createUInt48BEUser;

},{}],38:[function(require,module,exports){
function createUInt48LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt48LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt48LEUser, BufferUserBase);
  UInt48LEUser.prototype.use = function () {
    if (this.availableBytes() < 6) {
      return;
    }
    var ret = this.buffer.readUIntLE(this.cursor, 6);
    this.cursor += 6;
    return ret;
  };
  UInt48LEUser.prototype.neededBytes = function () {
    return 6;
  };
  UInt48LEUser.prototype.toBuffer = function (item, buffer) {
    buffer.writeUIntLE(item, 0, 6);
  };

  return UInt48LEUser;
}

module.exports = createUInt48LEUser;

},{}],39:[function(require,module,exports){
function createUInt64BEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt64BEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt64BEUser, BufferUserBase);
  UInt64BEUser.prototype.use = function () {
    if (this.availableBytes() < 8) {
      return;
    }
    //var ret = this.buffer.readUInt64BE(this.cursor);
    var ret = 0,
      hi = this.buffer.readUInt32BE(this.cursor),
      lo = this.buffer.readUInt32BE(this.cursor+4);
    ret += (lo);
    ret += ( hi * 0x100000000);
    //console.log('lo', lo, 'hi', hi, '=>', ret);
    this.cursor += 8;
    return ret;
  };
  UInt64BEUser.prototype.neededBytes = function () {
    return 8;
  };
  UInt64BEUser.prototype.toBuffer = function (item, buffer) {
    //buffer.writeUInt64BE(item, 0);
    var hi = ~~(item / 0x100000000),
      lo = item % 0x100000000;
    //console.log(item, '=> lo', lo, 'hi', hi);
    buffer.writeUInt32BE(hi, 0);
    buffer.writeUInt32BE(lo, 4);
  };

  return UInt64BEUser;
}

module.exports = createUInt64BEUser;

},{}],40:[function(require,module,exports){
function createUInt64LEUser(execlib, BufferUserBase) {
  'use strict';
  var lib = execlib.lib;
  
  function UInt64LEUser() {
    BufferUserBase.call(this);
  }
  lib.inherit(UInt64LEUser, BufferUserBase);
  UInt64LEUser.prototype.use = function () {
    if (this.availableBytes() < 8) {
      return;
    }
    //var ret = this.buffer.readUInt64LE(this.cursor);
    var ret = 0,
      lo = this.buffer.readUInt32LE(this.cursor),
      hi = this.buffer.readUInt32LE(this.cursor+4);
    ret += (lo);
    ret += ( hi * 0x100000000);
    //console.log('lo', lo, 'hi', hi, '=>', ret);
    this.cursor += 8;
    return ret;
  };
  UInt64LEUser.prototype.neededBytes = function () {
    return 8;
  };
  UInt64LEUser.prototype.toBuffer = function (item, buffer) {
    //buffer.writeUInt64LE(item, 0);
    var hi = ~~(item / 0x100000000),
      lo = item % 0x100000000;
    //console.log(item, '=> lo', lo, 'hi', hi);
    buffer.writeUInt32LE(lo, 0);
    buffer.writeUInt32LE(hi, 4);
  };

  return UInt64LEUser;
}

module.exports = createUInt64LEUser;

},{}],41:[function(require,module,exports){
var _UserWord = 'User';

function makeUpUserName(username) {
  'use strict';
  if (username.lastIndexOf(_UserWord) !== username.length-_UserWord.length) {
    return username+'User';
  }
  return username;
}

function createUserProducer(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib;

  function userProducer(username, args) {
    if (lib.isString(username)) {
      return new bufferlib[makeUpUserName(username)]();
    }
    if (lib.isArray(username)) {
      switch (username[1].length) {
        case 1:
          return new bufferlib[makeUpUserName(username[0])](username[1][0]);
        case 2:
          return new bufferlib[makeUpUserName(username[0])](username[1][0], username[1][1]);
        case 3:
          return new bufferlib[makeUpUserName(username[0])](username[1][0], username[1][1], username[1][2]);
        case 4:
          return new bufferlib[makeUpUserName(username[0])](username[1][0], username[1][1], username[1][2], username[1][3]);
      }
    }
  }

  return userProducer;
}

module.exports = createUserProducer;

},{}],42:[function(require,module,exports){
(function (Buffer){
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

}).call(this,require("buffer").Buffer)
},{"buffer":46}],43:[function(require,module,exports){
function createUserTcpRMIMixin (execlib, bufferlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q;


  function doMixin(User, ParentUser) {
    var ParentTcpServer = ParentUser.prototype.TcpTransmissionServer,
      ParentTcpHandler = ParentTcpServer.prototype.ConnectionHandler;

    function RMITcpHandler(userserver, server, connection) {
      ParentTcpHandler.call(this, userserver, server, connection);
      this.rpcserver = new (bufferlib.RPCLogicServer)(this.userserver.user, User.prototype.__methodDescriptors, this.doSend.bind(this));
    }
    lib.inherit(RMITcpHandler, ParentTcpHandler);
    RMITcpHandler.prototype.destroy = function () {
      if (this.rpcserver) {
        this.rpcserver.destroy();
      }
      this.rpcserver = null;
      ParentTcpHandler.prototype.destroy.call(this);
    };
    RMITcpHandler.prototype.onPacketForProcess = function(buffer) {
      //console.log('giving', buffer, 'to rpcserver');//, this.rpcserver);
      this.rpcserver.takeBuffer(buffer);
    };
    RMITcpHandler.prototype.onRequest = function (reqarry) {
      //console.log('onRequest', reqarry);
      if (!(this.userserver && this.userserver.user)) {
        this.connection.end();
        return;
      }
      this.userserver.user.exec(reqarry).then(
        this.doSend.bind(this),
        this.doEnd.bind(this)
      );
    };
    RMITcpHandler.prototype.doSend = function (outbuff) {
      if (this.connection) {
        this.connection.write(outbuff);
      }
    };
    RMITcpHandler.prototype.doEnd = function () {
      this.connection.end();
    };

    function RMITcpServer(user, options){
      ParentTcpServer.call(this, user, options);
    }
    lib.inherit(RMITcpServer, ParentTcpServer);
    RMITcpServer.prototype.ConnectionHandler = RMITcpHandler;
    RMITcpServer.prototype.timeOutInSeconds = Infinity;

    User.prototype.TcpTransmissionServer = RMITcpServer;
  }

  return doMixin;
}

module.exports = createUserTcpRMIMixin;

},{}],44:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],45:[function(require,module,exports){

},{}],46:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":44,"buffer":46,"ieee754":47}],47:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],48:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}]},{},[3]);
