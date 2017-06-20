(function() {
  var ws;

  ws = {};

  this.ws = ws;

  ws.get_appropriate_ws_url = function() {
    var match, pcol, regex, u;
    pcol = void 0;
    u = document.URL;
    regex = /https?:\/\/(.+?)(:|\/)/i;
    match = regex.exec(u);

    /*
     * We open the websocket encrypted if this page came on an
     * https:// url itself, otherwise unencrypted
     */
    if (u.substring(0, 5) === 'https') {
      pcol = 'wss://';
      u = u.substr(8);
    } else {
      pcol = 'ws://';
      if (u.substring(0, 4) === 'http') {
        u = u.substr(7);
      }
    }
    u = u.split('/');
    return pcol + match[1] + ':8001';
  };

  ws.init = function(options) {
    var defaults, exception;
    defaults = {
      onopen: function() {
        console.log('WS open');
      },
      onclose: function() {
        console.log('WS closed');
      },
      onmessage: function(ev) {
        console.log('WS received');
        return console.log(ev.data);
      }
    };
    options = Object.assign(defaults, options);
    console.log("Connecting to " + (ws.get_appropriate_ws_url()));
    ws.socket = new WebSocket(ws.get_appropriate_ws_url());
    try {
      return Object.assign(ws.socket, options);
    } catch (error) {
      exception = error;
      return alert('<p>Error' + exception);
    }
  };

  ws.send = function(data) {
    return ws.socket.send(data);
  };

}).call(this);
