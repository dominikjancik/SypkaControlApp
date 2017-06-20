(function() {
  $(document).ready(function() {
    var exception, get_appropriate_ws_url, handle, sendCommand, sendSingle, socket;
    socket = void 0;
    get_appropriate_ws_url = function() {
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
    sendCommand = function(name, value) {
      var command;
      command = JSON.stringify({
        command: name,
        value: value
      });
      socket.send(command);
    };
    sendSingle = function() {
      var value;
      value = {
        enabled: $('#single_enabled').prop('checked'),
        ch: parseInt($('#single_ch').val()),
        count: parseInt($('#single_count').val())
      };
      console.log(value);
      sendCommand('single', value);
    };
    console.log(get_appropriate_ws_url());
    socket = new WebSocket(get_appropriate_ws_url());
    console.log('Set up');
    try {
      socket.onopen = function() {
        console.log('WS open');
      };
      socket.onclose = function() {
        console.log('WS closed');
      };
    } catch (error) {
      exception = error;
      alert('<p>Error' + exception);
    }
    handle = $('#custom-handle');
    $('#slider').slider({
      min: 0,
      max: 255,
      value: 120,
      create: function() {
        handle.text($(this).slider('value'));
      },
      slide: function(event, ui) {
        handle.text(ui.value);
      },
      change: function(event, ui) {
        console.log(ui.value);
        sendCommand('value', parseInt(ui.value));
      }
    });
    $('#side').click(function() {
      sendCommand('sides', 'toggle');
    });
    $('#single_send').click(sendSingle);
    $('#single_plus').click(function() {
      var ch, count;
      ch = parseInt($('#single_ch').val());
      count = parseInt($('#single_count').val());
      ch += count;
      $('#single_ch').val(ch);
      sendSingle();
    });
    $('#single_minus').click(function() {
      var ch, count;
      ch = parseInt($('#single_ch').val());
      count = parseInt($('#single_count').val());
      ch -= count;
      $('#single_ch').val(ch);
      sendSingle();
    });
  });

}).call(this);
