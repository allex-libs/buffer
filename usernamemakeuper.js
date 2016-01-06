var _UserWord = 'User';
function makeUpUserName(username) {
  if (username.lastIndexOf(_UserWord) !== username.length-_UserWord.length) {
    return username+'User';
  }
  return username;
}

module.exports = makeUpUserName;
