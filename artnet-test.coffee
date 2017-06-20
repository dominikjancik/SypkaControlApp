options = host: '192.168.8.54'

values = []

setValues = (value) ->
  for i in [0...512]
    values[i] = value

setValues 0

artnet = require('artnet')(options)
artnet.set 1, values
console.log 'sent'
artnet.close()
