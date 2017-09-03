(function() {
  var fixture, fixtureValues, fs, i, len, loadValues, newFixtureValues, newValues, output, v, values;

  fs = require('fs');

  loadValues = function() {
    var obj;
    obj = JSON.parse((fs.readFileSync(__dirname + "/public/values.json", 'utf8')).replace(/^\uFEFF/, ''));
    console.log('values loaded');
    return obj;
  };

  values = loadValues();

  newValues = {};

  for (fixture in values) {
    fixtureValues = values[fixture];
    newFixtureValues = [];
    for (i = 0, len = fixtureValues.length; i < len; i++) {
      v = fixtureValues[i];
      newFixtureValues.push({
        v: v,
        f: []
      });
    }
    newValues[fixture] = newFixtureValues;
  }

  console.log(newValues);

  output = JSON.stringify(newValues, null, 2);

  if (output != null) {
    fs.writeFileSync(__dirname + "/public/values.json", output);
  }

}).call(this);
