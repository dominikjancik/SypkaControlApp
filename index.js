(function() {
  var artnets, fixture, fixtureCh, fixtureChCount, fixtures, fs, getFixture, http, i, initOutput, ip, ipValues, loadFixtures, loadValues, mode, name, options, paperboy, path, port, processValue, saveValues, server, switchMode, updateIpValues, updateOutput, updateValues, validatedIp, values, webroot, ws,
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
    console.log((fs.readFileSync(__dirname + "/public/fixtures.json", 'utf8')).replace(/^\uFEFF/, ''));
    obj = JSON.parse((fs.readFileSync(__dirname + "/public/fixtures.json", 'utf8')).replace(/^\uFEFF/, ''));
    console.log('fixtures loaded');
    return obj.fixtures;
  };

  loadValues = function() {
    var obj;
    obj = JSON.parse((fs.readFileSync(__dirname + "/public/values.json", 'utf8')).replace(/^\uFEFF/, ''));
    console.log('values loaded');
    return obj;
  };

  fixtures = loadFixtures();

  values = loadValues();

  saveValues = function() {
    var output;
    output = JSON.stringify(values, null, 2);
    if (output != null) {
      return fs.writeFileSync(__dirname + "/public/values.json", output);
    }
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

  processValue = function(segment, ch, value) {
    if (!mode) {
      if (segment.type === 'column') {
        return Math.min(value, 0.5);
      }
      return value;
    }
    switch (segment.type) {
      case 'strip':
        return ((modulo(ch - 1, 3)) !== 0 ? value : 0);
      case 'column':
        return ((modulo(ch, 6)) === 0 || (modulo(ch, 6)) === 5 ? value : 0);
      case 'side':
      case 'beam':
        return ((modulo(ch, 6)) === 3 || (modulo(ch, 6)) === 2 ? value : 0);
      case 'circle':
        return (ch === 1 ? value : 0);
    }
    return value;
  };

  updateIpValues = function() {
    var ch, cnt, fixture, i, j, name, results, segI, segment, value, valueArray;
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
            var l, m, ref1, ref2, ref3, results2;
            results2 = [];
            for (segI = l = 0, ref1 = segment.count; 0 <= ref1 ? l < ref1 : l > ref1; segI = 0 <= ref1 ? ++l : --l) {
              value = valueArray[i];
              ch = fixtureCh(segment, i);
              cnt = fixtureChCount(segment);
              for (j = m = ref2 = ch, ref3 = ch + cnt; ref2 <= ref3 ? m < ref3 : m > ref3; j = ref2 <= ref3 ? ++m : --m) {
                ipValues[fixture.ip][j] = Math.round(processValue(segment, j, value) * 255);
              }
              console.log(ipValues[fixture.ip]);
              results2.push(i++);
            }
            return results2;
          })());
        }
        return results1;
      })());
    }
    return results;
  };

  updateValues = function(newValues) {
    console.log('updating values');
    values = newValues;
    updateIpValues();
    updateOutput();
    return saveValues();
  };

  mode = false;

  switchMode = function() {
    console.log('switching mode');
    return mode = !mode;
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
          case 'values':
            updateValues(command.values);
            break;
          case 'mode':
            switchMode();
            updateValues(values);
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

  initOutput = function() {};

  for (name in fixtures) {
    fixture = fixtures[name];
    validatedIp = (fixture.ip != null) && fixture.ip.length > 0 ? fixture.ip : 0;
    ip = "192.168.8." + validatedIp;
    options.host = ip;
    console.log(options);
    artnets[fixture.ip] = require('artnet')(options);
  }

  updateOutput = function() {
    var results;
    results = [];
    for (name in fixtures) {
      fixture = fixtures[name];
      console.log(fixture.name);
      results.push(artnets[fixture.ip].set(1, ipValues[fixture.ip]));
    }
    return results;
  };

  console.log(values);

  updateValues(values);

  initOutput();

  updateOutput();

}).call(this);
