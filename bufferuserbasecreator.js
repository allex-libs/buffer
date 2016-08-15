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
        //console.log('concating at cursor', this.cursor, 'with original bufflen', this.buffer.length, 'at', this.currentPosition());
        if (this.cursor < b.length) {
          tail = b.length-this.cursor;
          bc = new Buffer(tail + b.length);
          b.copy(bc, 0, this.cursor, b.length);
          buffer.copy(bc, tail, 0, buffer.length);
          this.buffer = bc;
          this.cursor = 0;
        } else {
          this.init(buffer);
        }
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
