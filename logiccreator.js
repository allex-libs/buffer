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
    buffer = buffer || new Buffer(buflen);
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
