(function() {
  var artnets, fixture, fixtureCh, fixtureChCount, fixtures, fs, getFixture, http, i, initOutput, ip, ipValues, k, len, loadFixtures, loadValues, options, paperboy, path, port, saveValues, server, updateIpValues, updateOutput, updateValues, validatedIp, values, webroot, ws;

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
    var fixture, k, len;
    for (k = 0, len = fixtures.length; k < len; k++) {
      fixture = fixtures[k];
      if (fixture.name === name) {
        return fixture;
      }
    }
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
      default:
        console.log("Unknown type - " + fixture.type);
        return 3;
    }
  };

  updateIpValues = function() {
    var ch, cnt, fixture, i, j, name, results, value, valueArray;
    results = [];
    for (name in values) {
      valueArray = values[name];
      fixture = getFixture(name);
      if (ipValues[fixture.ip] == null) {
        ipValues[fixture.ip] = [];
      }
      results.push((function() {
        var k, l, len, ref, ref1, results1;
        results1 = [];
        for (i = k = 0, len = valueArray.length; k < len; i = ++k) {
          value = valueArray[i];
          ch = fixtureCh(fixture, i);
          cnt = fixtureChCount(fixture);
          for (j = l = ref = ch, ref1 = ch + cnt; ref <= ref1 ? l < ref1 : l > ref1; j = ref <= ref1 ? ++l : --l) {
            ipValues[fixture.ip][j] = Math.round(value * 255);
          }
          results1.push(console.log(ipValues[fixture.ip]));
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

  for (k = 0, len = fixtures.length; k < len; k++) {
    fixture = fixtures[k];
    validatedIp = (fixture.ip != null) && fixture.ip.length > 0 ? fixture.ip : 0;
    ip = "192.168.8." + validatedIp;
    options.host = ip;
    console.log(options);
    artnets[fixture.ip] = require('artnet')(options);
  }

  updateOutput = function() {
    var l, len1, results;
    results = [];
    for (l = 0, len1 = fixtures.length; l < len1; l++) {
      fixture = fixtures[l];
      results.push(artnets[fixture.ip].set(1, ipValues[fixture.ip]));
    }
    return results;
  };

  console.log(values);

  updateValues(values);

  initOutput();

  updateOutput();

}).call(this);
