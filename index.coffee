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

### Fixture/value handling (loading, parsing, storing) ###

fs = require('fs');

loadFixtures = ->
  console.log (fs.readFileSync "#{__dirname}/public/fixtures.json", 'utf8').replace(/^\uFEFF/, '')
  obj = JSON.parse (fs.readFileSync "#{__dirname}/public/fixtures.json", 'utf8').replace(/^\uFEFF/, '')
  console.log 'fixtures loaded'
  obj.fixtures

loadValues = ->
  obj = JSON.parse (fs.readFileSync "#{__dirname}/public/values.json", 'utf8').replace(/^\uFEFF/, '')
  console.log 'values loaded'
  obj

fixtures = loadFixtures()
values = loadValues()

saveValues = ->
  output = JSON.stringify values, null, 2
  if output? then fs.writeFileSync "#{__dirname}/public/values.json", output

ipValues = []

getFixture = (name) ->
  # TODO converge values and fixtures JSON files, fixture names as keys
  fixtures[ name ]
  #for fixture in fixtures
  #  if fixture.name == name
  #    return fixture
  

fixtureCh = (fixture, index) ->
  # TODO load these settings from JSON
  switch fixture.type
    when 'strip' then return index * 3 + 1
    else return index * fixtureChCount fixture

fixtureChCount = (fixture) ->
  # TODO load these settings from JSON
  switch fixture.type
    when 'strip' then return 3
    when 'column', 'side', 'beam' then return 6
    when 'beam' then return 1
    when 'circle' then return 2
    else
      console.log "Unknown type - #{fixture.type}"
      return 3


updateIpValues = ->
  for name, valueArray of values
    fixture = getFixture name
  
    if !ipValues[fixture.ip]? then ipValues[fixture.ip] = []

    i = 0
    for segment in fixture.segments
      value = valueArray[i]
      ch = fixtureCh segment, i
      cnt = fixtureChCount segment
      for j in [ch...ch+cnt]
        ipValues[fixture.ip][j] = Math.round value * 255
      console.log ipValues[fixture.ip]
      i++
  

updateValues = ( newValues ) ->
  console.log 'updating values'
  values = newValues
  updateIpValues()
  updateOutput()
  saveValues()


### WS HANDLER ###

ws = require 'nodejs-websocket'

server = ws.createServer((conn) ->
  console.log 'New connection'
  conn.on 'text', (str) ->
    console.log 'Received ' + str
    try
      command = JSON.parse(str)
      switch command.command
        when 'values'
          updateValues command.values
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

options = host: '127.0.0.1'
artnets = []
i = 0

initOutput = ->
for name, fixture of fixtures
  validatedIp = if fixture.ip? && fixture.ip.length > 0 then fixture.ip else 0
  ip = "192.168.8.#{validatedIp}"
  options.host = ip
  console.log options
  artnets[fixture.ip] = require('artnet') options

updateOutput = ->
  for name, fixture of fixtures
    artnets[fixture.ip].set 1, ipValues[fixture.ip]
    # console.log fixture.ip
    # console.log ipValues[fixture.ip]

console.log values
updateValues values
initOutput()
updateOutput()
