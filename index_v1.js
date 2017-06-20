(function() {
  var artnets, http, i, lightSettings, nodelist, nodes, options, paperboy, path, port, server, setValues, side, updateValues, values, webroot, ws;

  setValues = function(value) {
    var i;
    i = 0;
    while (i < 50) {
      values[i] = value;
      i++;
    }
  };

  updateValues = function() {
    var i;
    var i;
    console.log('Updating values');
    setValues(lightSettings.intensity);
    if (lightSettings.side) {
      values[0] = 0;
    }
    if (lightSettings.single.enabled) {
      setValues(0);
      i = 0;
      while (i < lightSettings.single.count) {
        values[i + lightSettings.single.ch] = lightSettings.intensity;
        i++;
      }
    }
    i = 0;
    while (i < nodes.length) {
      artnets[i].set(1, values);
      i++;
    }
  };

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


  /* WS HANDLER */

  ws = require('nodejs-websocket');

  values = [];

  setValues(120);

  lightSettings = {
    side: false,
    intensity: 120,
    single: {
      enabled: false,
      ch: 0,
      count: 1
    }
  };

  side = true;

  server = ws.createServer(function(conn) {
    console.log('New connection');
    conn.on('text', function(str) {
      var command, err;
      console.log('Received ' + str);
      try {
        command = JSON.parse(str);
        switch (command.command) {
          case 'sides':
            lightSettings.side = !lightSettings.side;
            break;
          case 'value':
            lightSettings.intensity = command.value;
            break;
          case 'single':
            lightSettings.single = command.value;
        }
        updateValues();
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

  nodelist = require('./node-list');

  options = {
    host: '127.0.0.1'
  };

  artnets = [];

  nodes = nodelist.nodes();

  i = 0;

  while (i < nodes.length) {
    options.host = nodes[i];
    console.log(options);
    artnets[i] = require('artnet')(options);
    artnets[i].set(1, values);
    i++;
  }

}).call(this);
