function createBufferUser(execlib) {
  'use strict';
  var lib = execlib.lib;

  function BufferUser() {
    this.buffer = null;
    this.cursor = null;
  }
  BufferUser.prototype.destroy = function () {
    this.cursor = null;
    this.buffer = null;
  };
  BufferUser.prototype.init = function (buff, cursor) {
    this.buffer = buff;
    this.cursor = cursor || 0;
  };
  BufferUser.prototype.process = function (buffer) {
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
  BufferUser.prototype.availableBytes = function () {
    if (!this.buffer) {
      return 0;
    }
    return this.buffer.length - this.cursor;
  };
  BufferUser.prototype.currentPosition = function () {
    if (!this.buffer) {return null;}
    return this.buffer.slice(this.cursor);
  };

  return BufferUser;
};

module.exports = createBufferUser;
