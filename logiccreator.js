function createLogic(execlib, bufferlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function userProducer(username, args) {
    if (lib.isString(username)) {
      return new bufferlib[username]();
    }
    if (lib.isArray(username)) {
      switch (username[1].length) {
        case 1:
          return new bufferlib[username[0]](username[1][0]);
        case 2:
          return new bufferlib[username[0]](username[1][0], username[1][1]);
        case 3:
          return new bufferlib[username[0]](username[1][0], username[1][1], username[1][2]);
        case 4:
          return new bufferlib[username[0]](username[1][0], username[1][1], username[1][2], username[1][3]);
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
    var ret = this.process(buffer);
    while(ret) {
      if (!this.cb) {
        return;
      }
      this.cb(ret);
      ret = this.process();
    }
  };
  function resetter(user) {
    user.init(null);
  }
  Logic.prototype.process = function (buffer) {
    var currentuser = this.users[this.current],
      ret = currentuser.process(buffer);
    if ('undefined' !== typeof ret) {
      if (currentuser.availableBytes() < 1){
        //console.log('resetting at ret', ret, 'current user', this.current, require('util').inspect(currentuser, {depth:null}));
        this.users.forEach(resetter);
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

  return Logic;
}

module.exports = createLogic;
