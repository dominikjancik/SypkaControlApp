$(document).ready ->
  socket = undefined

  get_appropriate_ws_url = ->
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

  sendCommand = (name, value) ->
    command = JSON.stringify(
      command: name
      value: value)
    socket.send command
    return

  sendSingle = ->
    value = 
      enabled: $('#single_enabled').prop('checked')
      ch: parseInt($('#single_ch').val())
      count: parseInt($('#single_count').val())
    console.log value
    sendCommand 'single', value
    return

  console.log get_appropriate_ws_url()
  socket = new WebSocket(get_appropriate_ws_url())
  console.log 'Set up'
  # open
  try
    socket.onopen = ->
      console.log 'WS open'
      return

    socket.onclose = ->
      console.log 'WS closed'
      return

  catch exception
    alert '<p>Error' + exception
  
  handle = $('#custom-handle')
  
  $('#slider').slider
    min: 0
    max: 255
    value: 120
    create: ->
      handle.text $(this).slider('value')
      return
    slide: (event, ui) ->
      handle.text ui.value
      return
    change: (event, ui) ->
      console.log ui.value
      #socket.send( ui.value );
      sendCommand 'value', parseInt(ui.value)
      return
  
  $('#side').click ->
    #socket.send("COM_SIDES");
    sendCommand 'sides', 'toggle'
    return
  
  $('#single_send').click sendSingle
  
  $('#single_plus').click ->
    ch = parseInt($('#single_ch').val())
    count = parseInt($('#single_count').val())
    ch += count
    $('#single_ch').val ch
    sendSingle()
    return
  
  $('#single_minus').click ->
    ch = parseInt($('#single_ch').val())
    count = parseInt($('#single_count').val())
    ch -= count
    $('#single_ch').val ch
    sendSingle()
    return
  return
