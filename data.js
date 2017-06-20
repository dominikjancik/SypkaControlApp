var fs = require('fs');
var csv = require('csv');

var cols = [];
var fixtureColumns = [
	'floor',
	'group',
	'name',
	'type',
	'count',
	'ip'
];

function parseFixture(dataRow) {
	var fixtureObject = {};
	
	fixtureObject.x = fixtureObject.y = 0;

	for (var i = fixtureColumns.length - 1; i >= 0; i--) {
		var col = fixtureColumns[i];
		fixtureObject[col] = dataRow[cols[col]];
	}

	console.log(fixtureObject);
	return fixtureObject;
}

function writeFile(path, contents) {
	fs.writeFileSync(path, contents);
}

var parser = csv.parse({delimiter: ','}, function(err, data){
  for (var i = data[0].length - 1; i >= 0; i--) {
  	cols[data[0][i]] = i;
  }

  console.log(data[0]);
  console.log(cols);

  var fixtures = { fixtures: [] };

  for (var i = data.length - 1; i >= 1; i--) {
  	fixtures.fixtures.push(parseFixture(data[i]));
  }

  console.log(fixtures);

  writeFile(__dirname+'/public/fixtures.json', JSON.stringify(fixtures, null, 2));
});

fs.createReadStream(__dirname+'/data/Lettenmayer Light overview - Lights.csv').pipe(parser);