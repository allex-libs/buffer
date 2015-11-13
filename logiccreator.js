function createLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  var _UserWord = 'User';
  function makeUpUserName(username) {
    if (username.lastIndexOf(_UserWord) !== username.length-_UserWord.length) {
      return username+'User';
    }
    return username;
  }
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

  function Logic(usernamearry, frombuffercb) {
    this.users = usernamearry.map(userProducer);
    this.cb = frombuffercb;
    this.results = new Array(this.users.length);
    this.current = 0;
  }
  Logic.prototype.destroy = function () {
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
    var ret = this.process(buffer), shouldstop;
    while(ret) {
      if (!this.cb) {
        return;
      }
      shouldstop = this.cb(ret);
      if (shouldstop === 'stop') {
        this.reset();
        this.current = 0;
        return;
      }
      ret = this.process();
    }
  };
  function resetter(user) {
    user.init(null);
  }
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
