ws = {}
this.ws = ws

ws.get_appropriate_ws_url = ->
    pcol = undefined
    u = document.URL
    regex = /https?:\/\/(.+?)(:|\/)/i
    match = regex.exec(u)

    ###
    # We open the websocket encrypted if this page came on an
    # https:// url itself, otherwise unencrypted
    ###

    if u.substring(0, 5) == 'https'
      pcol = 'wss://'
      u = u.substr(8)
    else
      pcol = 'ws://'
      if u.substring(0, 4) == 'http'
        u = u.substr(7)
    u = u.split('/')
    pcol + match[1] + ':8001'

ws.init = ( options ) ->
  defaults =
    onopen: ->
      console.log 'WS open'
      return
    onclose: ->
      console.log 'WS closed'
      return
    onmessage: (ev) ->
      console.log 'WS received'
      console.log ev.data

  options = Object.assign defaults, options

  console.log "Connecting to #{ws.get_appropriate_ws_url()}"
  ws.socket = new WebSocket(ws.get_appropriate_ws_url())
  try
    Object.assign( ws.socket, options )

  catch exception
    alert '<p>Error' + exception

ws.send = ( data ) ->
  ws.socket.send data