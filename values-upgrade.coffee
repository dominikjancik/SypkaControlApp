fs = require('fs');

loadValues = ->
  obj = JSON.parse (fs.readFileSync "#{__dirname}/public/values.json", 'utf8').replace(/^\uFEFF/, '')
  console.log 'values loaded'
  obj

values = loadValues()
newValues = {}

for fixture, fixtureValues of values
	newFixtureValues = []
	for v in fixtureValues
		newFixtureValues.push
			v: v
			f: []

	newValues[fixture] = newFixtureValues

console.log newValues

output = JSON.stringify newValues, null, 2
if output? then fs.writeFileSync "#{__dirname}/public/values.json", output