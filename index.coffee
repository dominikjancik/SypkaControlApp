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
  # console.log (fs.readFileSync "#{__dirname}/public/fixtures.json", 'utf8').replace(/^\uFEFF/, '')
  obj = JSON.parse (fs.readFileSync "#{__dirname}/public/fixtures.json", 'utf8').replace(/^\uFEFF/, '')
  console.log 'fixtures loaded'
  obj.fixtures

loadFixtureTypes = ->
  obj = JSON.parse (fs.readFileSync "#{__dirname}/public/fixtureTypes.json", 'utf8').replace(/^\uFEFF/, '')
  console.log 'fixture types loaded'
  obj.fixtureTypes

loadValues = ( from = "values" ) ->
  obj = JSON.parse (fs.readFileSync "#{__dirname}/public/#{from}.json", 'utf8').replace(/^\uFEFF/, '')
  console.log 'values loaded'
  obj

fixtures = loadFixtures()
values = loadValues()
fixtureTypes = loadFixtureTypes()

saveValues = ( to = "values" ) ->
  output = JSON.stringify values, null, 2
  if output? then fs.writeFileSync "#{__dirname}/public/#{to}.json", output


### Scene handling ###

Matrix = require("transformation-matrix-js").Matrix;

saveScene = ( name ) ->
  saveValues "scenes/#{name}"

loadScene = ( name ) ->
  loadValues "scenes/#{name}"

deleteScene = ( name ) ->
  fs.unlinkSync "public/scenes/#{name}"

listScenes = ->
  fs.readdirSync 'public/scenes' # TODO reconsider Sync variant
  


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
    when 'elevator' then return 1
    else
      console.log "Unknown type - #{fixture.type}"
      return 3

# TODO per ip/universe
valuesDirty = true
isAnimated = false

# TODO load from JSON
animatedFlags = [ 'up', 'down' ]

frameInterval = undefined
frameTime = new Date().getTime()

### FLAGS ###
# TODO move to its own files?

valuePosSin = ( vi, speed ) ->
  vi.value * Math.max(0.2, ((Math.sin(vi.pos.y / 15 + frameTime / 500 * speed)) / 2 + 0.5))

flagProcessors =
  o: ( vi ) ->
    switch vi.segment.type
      when 'strip'
        return (if (((vi.ch - 1) %% 3) != 0) then vi.value else 0)
      when 'column'
        return (if ((vi.ch %% 6) == 0 || (vi.ch %% 6) == 5) then vi.value else 0)
      when 'side', 'beam'
        return (if ((vi.ch %% 6) == 3 || (vi.ch %% 6) == 2) then vi.value else 0)
      when 'circle'
        return (if (vi.ch == 1) then vi.value else 0)

    return vi.value
  down: ( vi ) ->
    #return vi.value * ((frameTime / 1000) %% 1)
    valuePosSin vi, -1
  up: ( vi ) ->
    valuePosSin vi, 1

### END FLAGS ###

processValue = (segment, i, ch, value, flags, pos) ->
  type = segment.type

  vi =
    segment: segment
    i: i
    ch: ch
    value: value
    pos: pos

  flags.forEach (flag) ->
    vi.value = flagProcessors[flag] vi
  #value = oFlag vi if flagsSet.has('o')

  return vi.value

degreesToRadians = ( degrees ) ->
  degrees / 180 * Math.PI

getPosition = (segment, i) ->
  # TODO precalculate positions on init
  type = segment.type
  sizeY = fixtureTypes[segment.type].size.y

  m = new Matrix()
  m.rotate(degreesToRadians segment.rotZ).translateY(sizeY * i)
  offset = m.applyToPoint 0, 0
  
  ret =
    x: segment.x + offset.x
    y: segment.y + offset.y


updateIpValues = ->
  isAnimated = false
  valuesDirty = false
  
  for name, valueArray of values
    fixture = getFixture name
    # console.log name
    # console.log fixture
  
    if !ipValues[fixture.ip]? then ipValues[fixture.ip] = []

    i = 0

    # console.log fixture.name
    for segment in fixture.segments
      for segI in [0...segment.count]
        value = valueArray[i].v
        flags = new Set valueArray[i].f

        unless isAnimated
          for flag in animatedFlags
            if flags.has flag
              isAnimated = true

        ch = fixtureCh segment, i
        cnt = fixtureChCount segment

        # console.log "#{fixture.name}"
        pos = getPosition segment, segI
        # console.log "Segment part: #{segment.type}, #{segI}, {#{pos.x}, #{pos.y}}"

        for j in [ch...ch+cnt]
          lastValue = ipValues[fixture.ip][j]
          ipValues[fixture.ip][j] = newValue = Math.round processValue(segment, segI, j, value, flags, pos) * 255
          valuesDirty |= lastValue != newValue
        # console.log ipValues[fixture.ip]
        i++
  
outputFrame = ->
  frameTime = new Date().getTime()
  console.log "Frame output #{frameTime}"

  updateIpValues()
  updateOutput()

  if isAnimated
    frameInterval = setInterval outputFrame, 50 if !frameInterval?
  else
    clearInterval frameInterval if frameInterval?
    frameInterval = undefined

updateValues = ( newValues ) ->
  console.log 'updating values'
  values = newValues
  outputFrame()
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
        when 'ping'
          conn.sendText JSON.stringify
            command: 'pong'
        when 'values'
          updateValues command.values
        when 'mode'
          switchMode()
          updateValues values
        when 'saveScene'
          saveScene command.data
        when 'deleteScene'
          deleteScene command.data
        when 'listScenes'
          conn.sendText JSON.stringify
            command: 'scenes'
            data: listScenes()
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

debugMode = false;
IP_LOCAL = '127.0.0.1'

processArguments = ->
  localArg = process.argv.indexOf '-debug'
  if localArg != -1
    debugMode = true
    if process.argv[localArg + 1]? then IP_LOCAL = process.argv[localArg + 1]

initOutput = ->
  console.log "Initializing output"
  unless debugMode
    console.log "Output mode - Standard"
    for name, fixture of fixtures
      validatedIp = if fixture.ip? && fixture.ip.length > 0 then fixture.ip else 0
      ip = "192.168.8.#{validatedIp}"
      options.host = ip
      console.log options
      artnets[fixture.ip] = require('artnet') options
  else
    console.log "Output mode - Local test"
    console.log "Binding to IP #{IP_LOCAL}"
    ip = IP_LOCAL
    options.host = ip
    artnets[ip] = require('artnet') options

updateOutput = ->
  return unless valuesDirty

  for name, fixture of fixtures
    # console.log fixture.name
    unless debugMode
      artnets[fixture.ip].set 1, ipValues[fixture.ip]
    else
      artnets[IP_LOCAL].set fixture.ip, 1, ipValues[fixture.ip]
    # console.log fixture.ip
    # console.log ipValues[fixture.ip]

# console.log values

processArguments()

initOutput()
updateValues values
# updateOutput()
