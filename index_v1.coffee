setValues = (value) ->
  i = 0
  while i < 50
    values[i] = value
    i++
  return

updateValues = ->
  `var i`
  console.log 'Updating values'
  setValues lightSettings.intensity
  if lightSettings.side
    values[0] = 0
  if lightSettings.single.enabled
    setValues 0
    i = 0
    while i < lightSettings.single.count
      values[i + lightSettings.single.ch] = lightSettings.intensity
      i++
  i = 0
  while i < nodes.length
    artnets[i].set 1, values
    i++
  return

if process.env.NODE_ENV != 'production'
  require 'longjohn'

### STATIC WEBSERVER ###

paperboy = require('paperboy')
http = require('http')
path = require('path')
webroot = path.join(__dirname, 'public')
port = 80
http.createServer((req, res) ->
  ip = req.connection.remoteAddress
  paperboy.deliver(webroot, req, res).addHeader('X-Powered-By', 'Atari').before(->
    console.log 'Request received for ' + req.url
    return
  ).after((statusCode) ->
    console.log statusCode + ' - ' + req.url + ' ' + ip
    return
  ).error((statusCode, msg) ->
    console.log [
      statusCode
      msg
      req.url
      ip
    ].join(' ')
    res.writeHead statusCode, 'Content-Type': 'text/plain'
    res.end 'Error [' + statusCode + ']'
    return
  ).otherwise (err) ->
    console.log [
      404
      err
      req.url
      ip
    ].join(' ')
    res.writeHead 404, 'Content-Type': 'text/plain'
    res.end 'Error 404: File not found'
    return
  return
).listen port
console.log 'paperboy on his round at http://localhost:' + port

### WS HANDLER ###

ws = require 'nodejs-websocket'
values = []
setValues 120
lightSettings = 
  side: false
  intensity: 120
  single:
    enabled: false
    ch: 0
    count: 1
side = true

server = ws.createServer((conn) ->
  console.log 'New connection'
  conn.on 'text', (str) ->
    console.log 'Received ' + str
    try
      command = JSON.parse(str)
      switch command.command
        when 'sides'
          lightSettings.side = !lightSettings.side
        when 'value'
          #setValues(newValue);
          lightSettings.intensity = command.value
        when 'single'
          lightSettings.single = command.value
      updateValues()
    catch err
      console.log 'Failed parsing command: ' + err
    return
  conn.on 'close', (code, reason) ->
    console.log 'Connection closed'
    return
  conn.on 'error', (err) ->
    console.log 'Error handled:'
    console.log err.stack
    return
  return
).listen(8001)

nodelist = require('./node-list')
options = host: '127.0.0.1'
artnets = []
nodes = nodelist.nodes()
i = 0

while i < nodes.length
  options.host = nodes[i]
  console.log options
  artnets[i] = require('artnet')(options)
  artnets[i].set 1, values
  i++