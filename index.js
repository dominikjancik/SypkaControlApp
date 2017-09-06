(function() {
  var IP_LOCAL, Matrix, animatedFlags, artnets, debugMode, degreesToRadians, deleteScene, fixtureCh, fixtureChCount, fixtureTypes, fixtures, flagProcessors, frameInterval, frameTime, fs, getFixture, getPosition, http, i, initOutput, ipValues, isAnimated, listScenes, loadFixtureTypes, loadFixtures, loadScene, loadValues, options, outputFrame, paperboy, path, port, positions, processArguments, processValue, saveScene, saveValues, server, updateIpValues, updateOutput, updateValues, valuePosSin, values, valuesDirty, webroot, ws,
    modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

  if (process.env.NODE_ENV !== 'production') {
    require('longjohn');
  }


  /* STATIC WEBSERVER */

  paperboy = require('paperboy');

  http = require('http');

  path = require('path');

  webroot = path.join(__dirname, 'public');

  port = 80;

  http.createServer(function(req, res) {
    var ip;
    ip = req.connection.remoteAddress;
    paperboy.deliver(webroot, req, res).addHeader('X-Powered-By', 'Atari').before(function() {
      console.log('Request received for ' + req.url);
    }).after(function(statusCode) {
      console.log(statusCode + ' - ' + req.url + ' ' + ip);
    }).error(function(statusCode, msg) {
      console.log([statusCode, msg, req.url, ip].join(' '));
      res.writeHead(statusCode, {
        'Content-Type': 'text/plain'
      });
      res.end('Error [' + statusCode + ']');
    }).otherwise(function(err) {
      console.log([404, err, req.url, ip].join(' '));
      res.writeHead(404, {
        'Content-Type': 'text/plain'
      });
      res.end('Error 404: File not found');
    });
  }).listen(port);

  console.log('paperboy on his round at http://localhost:' + port);


  /* Fixture/value handling (loading, parsing, storing) */

  fs = require('fs');

  loadFixtures = function() {
    var obj;
    obj = JSON.parse((fs.readFileSync(__dirname + "/public/fixtures.json", 'utf8')).replace(/^\uFEFF/, ''));
    console.log('fixtures loaded');
    return obj.fixtures;
  };

  loadFixtureTypes = function() {
    var obj;
    obj = JSON.parse((fs.readFileSync(__dirname + "/public/fixtureTypes.json", 'utf8')).replace(/^\uFEFF/, ''));
    console.log('fixture types loaded');
    return obj.fixtureTypes;
  };

  loadValues = function(from) {
    var obj;
    if (from == null) {
      from = "values";
    }
    obj = JSON.parse((fs.readFileSync(__dirname + "/public/" + from + ".json", 'utf8')).replace(/^\uFEFF/, ''));
    console.log('values loaded');
    return obj;
  };

  fixtures = loadFixtures();

  values = loadValues();

  fixtureTypes = loadFixtureTypes();

  saveValues = function(to) {
    var output;
    if (to == null) {
      to = "values";
    }
    output = JSON.stringify(values, null, 2);
    if (output != null) {
      return fs.writeFileSync(__dirname + "/public/" + to + ".json", output);
    }
  };


  /* Scene handling */

  Matrix = require("transformation-matrix-js").Matrix;

  saveScene = function(name) {
    return saveValues("scenes/" + name);
  };

  loadScene = function(name) {
    return loadValues("scenes/" + name);
  };

  deleteScene = function(name) {
    return fs.unlinkSync("public/scenes/" + name);
  };

  listScenes = function() {
    return fs.readdirSync('public/scenes');
  };

  ipValues = [];

  getFixture = function(name) {
    return fixtures[name];
  };

  fixtureCh = function(fixture, index) {
    switch (fixture.type) {
      case 'strip':
        return index * 3 + 1;
      default:
        return index * fixtureChCount(fixture);
    }
  };

  fixtureChCount = function(fixture) {
    switch (fixture.type) {
      case 'strip':
        return 3;
      case 'column':
      case 'side':
      case 'beam':
        return 6;
      case 'beam':
        return 1;
      case 'circle':
        return 2;
      case 'elevator':
        return 1;
      default:
        console.log("Unknown type - " + fixture.type);
        return 3;
    }
  };

  valuesDirty = true;

  isAnimated = false;

  animatedFlags = ['up', 'down'];

  frameInterval = void 0;

  frameTime = new Date().getTime();


  /* FLAGS */

  valuePosSin = function(vi, speed) {
    return vi.value * Math.max(0.2, (Math.sin(vi.pos.y / 15 + frameTime / 500 * speed)) / 2 + 0.5);
  };

  flagProcessors = {
    o: function(vi) {
      switch (vi.segment.type) {
        case 'strip':
          return ((modulo(vi.ch - 1, 3)) !== 0 ? vi.value : 0);
        case 'column':
          return ((modulo(vi.ch, 6)) === 0 || (modulo(vi.ch, 6)) === 5 ? vi.value : 0);
        case 'side':
        case 'beam':
          return ((modulo(vi.ch, 6)) === 3 || (modulo(vi.ch, 6)) === 2 ? vi.value : 0);
        case 'circle':
          return (vi.ch === 1 ? vi.value : 0);
      }
      return vi.value;
    },
    down: function(vi) {
      return valuePosSin(vi, -1);
    },
    up: function(vi) {
      return valuePosSin(vi, 1);
    }
  };


  /* END FLAGS */

  processValue = function(segment, i, ch, value, flags, pos) {
    var type, vi;
    type = segment.type;
    vi = {
      segment: segment,
      i: i,
      ch: ch,
      value: value,
      pos: pos
    };
    flags.forEach(function(flag) {
      return vi.value = flagProcessors[flag](vi);
    });
    return vi.value;
  };

  degreesToRadians = function(degrees) {
    return degrees / 180 * Math.PI;
  };

  positions = [];

  getPosition = function(segment, i, globalFixtureIndex) {
    var m, offset, pos, sizeY, type;
    pos = positions[globalFixtureIndex];
    if (pos != null) {
      return pos;
    }
    console.log("Calculating position for fixture #" + globalFixtureIndex);
    type = segment.type;
    sizeY = fixtureTypes[segment.type].size.y;
    m = new Matrix();
    m.rotate(degreesToRadians(segment.rotZ)).translateY(sizeY * i);
    offset = m.applyToPoint(0, 0);
    return positions[globalFixtureIndex] = {
      x: segment.x + offset.x,
      y: segment.y + offset.y
    };
  };

  updateIpValues = function() {
    var ch, cnt, fixture, fixtureIndex, flag, flags, globalFixtureIndex, i, j, lastValue, name, newValue, pos, results, segment, value, valueArray;
    isAnimated = false;
    valuesDirty = false;
    globalFixtureIndex = 0;
    results = [];
    for (name in values) {
      valueArray = values[name];
      fixture = getFixture(name);
      if (ipValues[fixture.ip] == null) {
        ipValues[fixture.ip] = [];
      }
      i = 0;
      results.push((function() {
        var k, len, ref, results1;
        ref = fixture.segments;
        results1 = [];
        for (k = 0, len = ref.length; k < len; k++) {
          segment = ref[k];
          results1.push((function() {
            var l, len1, n, o, ref1, ref2, ref3, results2;
            results2 = [];
            for (fixtureIndex = l = 0, ref1 = segment.count; 0 <= ref1 ? l < ref1 : l > ref1; fixtureIndex = 0 <= ref1 ? ++l : --l) {
              value = valueArray[i].v;
              flags = new Set(valueArray[i].f);
              if (!isAnimated) {
                for (n = 0, len1 = animatedFlags.length; n < len1; n++) {
                  flag = animatedFlags[n];
                  if (flags.has(flag)) {
                    isAnimated = true;
                  }
                }
              }
              ch = fixtureCh(segment, i);
              cnt = fixtureChCount(segment);
              pos = getPosition(segment, fixtureIndex, globalFixtureIndex);
              for (j = o = ref2 = ch, ref3 = ch + cnt; ref2 <= ref3 ? o < ref3 : o > ref3; j = ref2 <= ref3 ? ++o : --o) {
                lastValue = ipValues[fixture.ip][j];
                ipValues[fixture.ip][j] = newValue = Math.round(processValue(segment, fixtureIndex, j, value, flags, pos) * 255);
                valuesDirty |= lastValue !== newValue;
              }
              i++;
              results2.push(globalFixtureIndex++);
            }
            return results2;
          })());
        }
        return results1;
      })());
    }
    return results;
  };

  outputFrame = function() {
    frameTime = new Date().getTime();
    updateIpValues();
    updateOutput();
    if (isAnimated) {
      if (frameInterval == null) {
        return frameInterval = setInterval(outputFrame, 50);
      }
    } else {
      if (frameInterval != null) {
        clearInterval(frameInterval);
      }
      return frameInterval = void 0;
    }
  };

  updateValues = function(newValues) {
    console.log('updating values');
    values = newValues;
    outputFrame();
    return saveValues();
  };


  /* WS HANDLER */

  ws = require('nodejs-websocket');

  server = ws.createServer(function(conn) {
    console.log('New connection');
    conn.on('text', function(str) {
      var command, err;
      console.log('Received ' + str);
      try {
        command = JSON.parse(str);
        switch (command.command) {
          case 'ping':
            conn.sendText(JSON.stringify({
              command: 'pong'
            }));
            break;
          case 'values':
            updateValues(command.values);
            break;
          case 'mode':
            switchMode();
            updateValues(values);
            break;
          case 'saveScene':
            saveScene(command.data);
            break;
          case 'deleteScene':
            deleteScene(command.data);
            break;
          case 'listScenes':
            conn.sendText(JSON.stringify({
              command: 'scenes',
              data: listScenes()
            }));
        }
      } catch (error) {
        err = error;
        console.log('Failed parsing command: ' + err);
      }
    });
    conn.on('close', function(code, reason) {
      console.log('Connection closed');
    });
    conn.on('error', function(err) {
      console.log('Error handled:');
      console.log(err.stack);
    });
  }).listen(8001);

  options = {
    host: '127.0.0.1'
  };

  artnets = [];

  i = 0;

  debugMode = false;

  IP_LOCAL = '127.0.0.1';

  processArguments = function() {
    var localArg;
    localArg = process.argv.indexOf('-debug');
    if (localArg !== -1) {
      debugMode = true;
      if (process.argv[localArg + 1] != null) {
        return IP_LOCAL = process.argv[localArg + 1];
      }
    }
  };

  initOutput = function() {
    var fixture, ip, name, results, validatedIp;
    console.log("Initializing output");
    if (!debugMode) {
      console.log("Output mode - Standard");
      results = [];
      for (name in fixtures) {
        fixture = fixtures[name];
        validatedIp = (fixture.ip != null) && fixture.ip.length > 0 ? fixture.ip : 0;
        ip = "192.168.8." + validatedIp;
        options.host = ip;
        console.log(options);
        results.push(artnets[fixture.ip] = require('artnet')(options));
      }
      return results;
    } else {
      console.log("Output mode - Local test");
      console.log("Binding to IP " + IP_LOCAL);
      ip = IP_LOCAL;
      options.host = ip;
      return artnets[ip] = require('artnet')(options);
    }
  };

  updateOutput = function() {
    var fixture, name, results;
    if (!valuesDirty) {
      return;
    }
    results = [];
    for (name in fixtures) {
      fixture = fixtures[name];
      if (!debugMode) {
        results.push(artnets[fixture.ip].set(1, ipValues[fixture.ip]));
      } else {
        results.push(artnets[IP_LOCAL].set(fixture.ip, 1, ipValues[fixture.ip]));
      }
    }
    return results;
  };

  processArguments();

  initOutput();

  updateValues(values);

}).call(this);
