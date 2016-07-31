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
