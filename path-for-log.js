'use strict';

const path = require('path');

/**
 * Filesystem path for stdout/stderr: relative to process.cwd().
 */
function pathForLog(filePath) {
  const absolutePath = path.resolve(filePath);
  const relativeToCwd = path.relative(process.cwd(), absolutePath);
  return relativeToCwd === '' ? '.' : relativeToCwd;
}

module.exports = { pathForLog };
