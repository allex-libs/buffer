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
    console.log('ConditionalLogic created', this);
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
  ConditionalLogic.prototype.onTimeToSwitchLogic = function () {
    var logicname, logic;
    if (this.parsingLogic) {
      throw new lib.Error('SHOULDNT_HAVE_HAD_PARSING_LOGIC');
      return;
    }
    logicname = this.logicNameFromResults();
    //console.log('onTimeToSwitchLogic', this.results, '=>', logicname);
    logic = this.getLogic(logicname);
    if (logic) {
      this.activateLogic(logic);
    }
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
    console.log('finalizeCycle', arguments);
    var logic = this.parsingLogic,
      currpos;
    //console.log('currentPosition', currpos);
    this.parsingLogic = null;
    if (logic) {
      currpos = logic.currentPosition();
      this.users[0].init(currpos, 0);
    }
    if (!this.outercb) {
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
    return 'stop';
  };

  return ConditionalLogic;
}

module.exports = createConditionalLogic;
