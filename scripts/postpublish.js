'use strict'

var fs = require('fs')

// Remove README.md and restore hidden README.adoc
fs.unlink('README.md', function (unlinkErr) {
  if (unlinkErr) throw unlinkErr
})
fs.rename('.README.adoc', 'README.adoc', function (moveErr) {
  if (moveErr) throw moveErr
})
