const { app } = require('electron')
const { createWindow, getWindowUrl } = require('../window')

function nodeFunction() {
  console.log('')
}

const $api = {
  app,
  createWindow, getWindowUrl,

  nodeFunction,
}

module.exports = $api
