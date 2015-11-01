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
