(function() {
  var artnet, options, setValues, values;

  options = {
    host: '192.168.8.54'
  };

  values = [];

  setValues = function(value) {
    var i, j, results;
    results = [];
    for (i = j = 0; j < 512; i = ++j) {
      results.push(values[i] = value);
    }
    return results;
  };

  setValues(0);

  artnet = require('artnet')(options);

  artnet.set(1, values);

  console.log('sent');

  artnet.close();

}).call(this);
