(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function createArrayUser(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = bufferlib.BufferUserBase,
    userProducer = bufferlib.userProducer;

  function ArrayUser(typename) {
    console.log('new ArrayUser', typename);
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
    var type = userProducer(this.typename);
    return valarray.reduce(neededbyter.bind(null, type), this.lenhandler.neededBytes(valarray.length)); //all neededBytes + 2 for the leading length
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
    var type = userProducer(this.typename);
    this.lenhandler.toBuffer(valarray.length, buffer);
    valarray.reduce(tobufferer.bind(null, type, buffer), this.lenhandler.neededBytes(valarray.length));
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
ALLEX.execSuite.libRegistry.add('allex_bufferlib',require('./index')(ALLEX));

},{"./index":9}],3:[function(require,module,exports){
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
    var b = this.buffer;
    if (buffer) {
      if (b) {
        //console.log('concating at cursor', this.cursor, 'with original bufflen', this.buffer.length, 'at', this.currentPosition());
        this.buffer = Buffer.concat([b, buffer]);
        //console.log('now the new bufflen is', this.buffer.length, 'and cursor is still', this.cursor, 'at', this.currentPosition());
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
},{"buffer":33}],4:[function(require,module,exports){
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


},{}],5:[function(require,module,exports){
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
    numarray.forEach(buffWriter.bind(null, buffer));
  };

  return ByteArrayUser;
}

module.exports = createByteArrayUser;

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
    //console.log('ConditionalLogic created', this);
  }
  lib.inherit(ConditionalLogic, Logic);
  ConditionalLogic.prototype.destroy = function () {
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
    var logic = this.parsingLogic,
      currpos;
    this.parsingLogic = null;
    if (logic) {
      currpos = logic.currentPosition();
      //console.log('currentPosition', currpos);
      //this.users[0].init(currpos, 0);
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
    if (currpos) {
      lib.runNext(this.cycleAgain.bind(this, currpos));
    }
    return 'stop';
  };
  ConditionalLogic.prototype.cycleAgain = function (buff) {
    this.reset();
    this.takeBuffer(buff);
  };

  return ConditionalLogic;
}

module.exports = createConditionalLogic;

},{}],9:[function(require,module,exports){
(function (Buffer){
function createBufferLib (execlib) {
  'use strict';
  var lib = execlib.lib,
    BufferUserBase = require('./bufferuserbasecreator')(execlib),
    StringUser = require('./stringusercreator')(execlib, BufferUserBase);

  function toBuffer(obj) {
    if (Buffer.isBuffer(obj)) {
      return obj;
    }
    if ('object' === typeof obj && obj.type === 'Buffer' && lib.isArray(obj.data)){ 
      var ret = new Buffer(obj.data.length);
      obj.data.forEach(function(b, ind) {
        ret[ind] = b;
      });
      return ret;
    }
  };

  var ret = {
    toBuffer: toBuffer,
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
    BufferUser: require('./bufferusercreator')(execlib, BufferUserBase, toBuffer),
    StringUser: StringUser,
    IntegerStringUser: require('./integerstringusercreator')(execlib, StringUser),
    JSONStringUser: require('./jsonstringusercreator')(execlib, StringUser)
  };
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


}).call(this,require("buffer").Buffer)
},{"./arrayusercreator":1,"./bufferuserbasecreator":3,"./bufferusercreator":4,"./bytearrayusercreator":5,"./byteusercreator":6,"./charusercreator":7,"./conditionallogiccreator":8,"./int32leusercreator":10,"./int8usercreator":11,"./integerstringusercreator":12,"./jsonschemadescriptor2usernamescreator":13,"./jsonstringusercreator":14,"./logiccreator":15,"./logicusercreator":16,"./rpclogicclientcreator":17,"./rpclogiccreator":18,"./rpclogicservercreator":19,"./stringusercreator":20,"./synchronouslogiccreator":21,"./tcpcallablestandaloneclientcreator":22,"./tcpcallablestandalonecreator":23,"./uint16leusercreator":24,"./uint32beusercreator":25,"./uint32leusercreator":26,"./uint64beusercreator":27,"./uint64leusercreator":28,"./userproducer":29,"./usertcprmiclientcreator":30,"./usertcprmimixincreator":31,"buffer":33}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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
    return dataarray.reduce(bytelenSummer.bind(null, this.users), 0)
  };
  Logic.prototype.toBuffer = function (dataarray, buffer, offset) {
    var buflen = this.neededBytes(dataarray), ret;
    if (dataarray.length !== this.users.length) {
      throw new lib.Error('DATA_ARRAY_LENGTH_MISMATCH', 'Data array provided has to be '+this.users.length+' elements long');
    }
    offset = offset || 0;
    buffer = buffer || new Buffer(buflen);
    ret = buffer.slice(offset, offset+buflen);
    dataarray.reduce(bufferWriter.bind(null, ret, this.users), 0);
    return ret;
  };

  return Logic;
}

module.exports = createLogic;

}).call(this,require("buffer").Buffer)
},{"buffer":33}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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
    var myd = this.mydefers.remove(myid),
      hisd;
    if (!myd) {
      console.error('Cannot find my out defer', myid);
      return;
    }
    this.hisdefers.add(id, myd);
  };
  RPCLogicClient.prototype.resolveDefer = function (id, result) {
    var d = this.hisdefers.remove(id);
    if (d) {
      d.resolve(result);
    } else {
      console.error('Cannot find his defer', id);
    }
  };
  RPCLogicClient.prototype.rejectDefer = function (id, error) {
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

},{}],18:[function(require,module,exports){
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
    this.finalizeCycle(callerid, [methodname,params.slice(),this.boundparams]);
    return 'stop';
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

}).call(this,require("buffer").Buffer)
},{"buffer":33}],19:[function(require,module,exports){
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
    return new Buffer(JSON.stringify(content), 'utf8');
  };

  RPCLogicServer.prototype.onResolve = function (id, res) {
    this.pendingDefers.remove(id);
    this.spit(['r', id, res]);
  }; 
  RPCLogicServer.prototype.onError = function (id, error) {
    this.pendingDefers.remove(id);
    this.spit(['e', id, error]);
  }; 
  RPCLogicServer.prototype.onNotify = function (id, progress) {
    this.spit(['n', id, progress]);
  }; 

  return RPCLogicServer;
}

module.exports = createRPCLogicServer;

}).call(this,require("buffer").Buffer)
},{"buffer":33}],20:[function(require,module,exports){
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
},{"buffer":33}],21:[function(require,module,exports){
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


}).call(this,{"isBuffer":require("../../../allex-toolbox-dev/node_modules/browserify/node_modules/insert-module-globals/node_modules/is-buffer/index.js")})
},{"../../../allex-toolbox-dev/node_modules/browserify/node_modules/insert-module-globals/node_modules/is-buffer/index.js":37}],22:[function(require,module,exports){
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
    execlib.execSuite.libRegistry.register(servicemodulename).then(
      this.onServicePack.bind(this),
      this.onServicePackError.bind(this)
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
  TcpCallableStandaloneClient.prototype.onServicePack = function (servicepack) {
    //console.log('servicepack', servicepack);
    try {
    var serviceuserprototype = servicepack.Service.prototype.userFactory.get('service').prototype;
    this.rpcclient = new bufferlib.RPCLogicClient(serviceuserprototype.__methodDescriptors, this.onoobcb);
    this.goConnect();
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  TcpCallableStandaloneClient.prototype.onServicePackError = function (error) {
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
    console.log(c);
    c.promise.then(
      this.onLoggedIn.bind(this),
      this.loggedincb.bind(null, this, false)
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

},{"net":32}],23:[function(require,module,exports){
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
    var oob = data.oob;
    if (oob) {
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

},{"net":32}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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
      lo = this.buffer.readUInt32BE(this.cursor),
      hi = this.buffer.readUInt32BE(this.cursor+4);
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
    buffer.writeUInt32BE(lo, 0);
    buffer.writeUInt32BE(hi, 4);
  };

  return UInt64BEUser;
}

module.exports = createUInt64BEUser;

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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
},{"buffer":33}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){

},{}],33:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
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
    case 'binary':
    case 'base64':
    case 'raw':
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
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
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
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

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

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
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

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
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

function binaryWrite (buf, string, offset, length) {
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
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
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

      case 'binary':
        return binaryWrite(this, string, offset, length)

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

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
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

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

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
  offset = offset | 0
  byteLength = byteLength | 0
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
  offset = offset | 0
  byteLength = byteLength | 0
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
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
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
  offset = offset | 0
  byteLength = byteLength | 0
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
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

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
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

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
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
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
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
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

  for (var i = 0; i < length; i++) {
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
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
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
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":34,"ieee754":35,"isarray":36}],34:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],35:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
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
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

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
  var eLen = nBytes * 8 - mLen - 1
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
      m = (value * c - 1) * Math.pow(2, mLen)
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

},{}],36:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],37:[function(require,module,exports){
/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install is-buffer`
 */

module.exports = function (obj) {
  return !!(obj != null &&
    (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
      (obj.constructor &&
      typeof obj.constructor.isBuffer === 'function' &&
      obj.constructor.isBuffer(obj))
    ))
}

},{}]},{},[2]);