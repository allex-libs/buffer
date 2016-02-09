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
