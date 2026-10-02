// Node 20 can load tsx-transformed components through CommonJS, bypassing the
// ESM CSS loader. Match its empty CSS export for standalone rendering tests.
require.extensions['.css'] = (module) => {
  module.exports = {};
};
