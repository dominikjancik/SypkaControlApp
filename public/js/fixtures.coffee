$(document).ready ->  

	container3d = $('#container')
	fixtureGroups = []

	fixture_json_url = ->
		'fixtures.json'

	values_json_url = ->
		'values.json?t=' + (new Date()).getTime()

	getIntensityColor = ( value ) ->
		colorValue = Math.round(255 * value)
		"rgb(#{colorValue}, #{colorValue}, #{colorValue})"

	# Dimmer widget
	$.widget 'xyz.dimmer',
		options:
			steps: 10

		_create: ->
			for i in [0..this.options.steps]
				this.element.append this._createButton i

		_createButton: ( index ) ->
			intensity = 1 / this.options.steps * index
			console.log intensity

			d = $(document.createElement 'div')
			d.addClass 'dimmer-button'
			d.css
				width: "#{100 / (this.options.steps + 1)}%"
				background: getIntensityColor intensity

			d.click ->
				setDimmer intensity
			

	# Fixture Widget
	$.widget 'xyz.fixture',
		options:
			name: 'NA'
			index: 0
			value: 0.5
			selected: false

		_create: ->
			this.element.addClass 'fixture'

			this.element.click this, (ev) ->
				console.log 'fixture click'
				console.log ev
				ev.data.options.selected = !ev.data.options.selected
				console.log ev.data.options.selected
				ev.data.element.toggleClass 'selected', ev.data.options.selected

			this._update()

		_update: ->
			console.log 'fixture update'

			this.element.css
				'background-color': getIntensityColor this.options.value

		_constrain: ( value ) ->
			return Math.max(Math.min( value, 1 ), 0)

		value: ( value ) ->
			if value == undefined
				return this.options.value

			this.options.value = this._constrain value
			this._update()
			this

		optionsObject: -> this.options

	$.fn.group = (fixture) ->
		this.addClass 'group'
		
		# this.html(fixture.name).group()

		this.click this, (ev) ->
			console.log 'group click'
			hasSelected = ev.data.siblings('.selected').length > 0
			console.log hasSelected
			ev.data.siblings('.fixture').toggleClass 'selected', !hasSelected

		this

	$.fn.fixtureGroup = (fixture) ->
		console.log this

		settings = $.extend
			x: 0
			y: 0
			z: 0
			rotX: 0
			rotY: 0
			rotZ: 0,
			fixture

		this.data(settings)

		this.addClass 'fixtureGroup'
		this.addClass fixture.type
		this.addClass 'floor' + fixture.floor
		this.data fixture

		this.updateTransform = ->
			console.log 'update transform'
			console.log this.data()
			this.css
				transform: "translate3d(#{this.data().x}vw, #{this.data().y}vw, #{this.data().z}vw) rotateX(#{this.data().rotX}deg) rotateY(#{this.data().rotY}deg) rotateZ(#{this.data().rotZ}deg)"

		this.updateTransform()

		this.hasSelected = ->
			this.children('.selected').length > 0

		this.translate = (x, y, z = 0) ->
			this.data().x += x
			this.data().y += y
			this.data().z += z
			this.updateTransform()

		this.rotate = (x, y, z = 0) ->
			this.data().rotX += x
			this.data().rotY += y
			this.data().rotZ += z
			this.updateTransform()

		this


	add_fixture = (fixture) ->
		d = document.createElement 'div'
		fixtureGroups.push $(d).fixtureGroup fixture

		if fixture.count > 1
			g = document.createElement 'div'
			$(g).group()
			$(d).append g

		
		for i in [0...fixture.count]
			f = document.createElement 'div'
			$(f).fixture
				name: fixture.name
				index: i
			d.append(f)
		
		$('#container').append(d)

	# $('input[type="range"]').rangeslider
	# 	onSlide: (position, value) -> console.log 'hello'

	clearSelection = -> $('.fixture').removeClass 'selected'
	selected = -> $('.selected')
	allFixtures = -> $('.fixture')

	invertSelection = -> $('.fixture').toggleClass 'selected'

	# UI
	# Set dimmer value, expects values between 0-1, triggers dimmer:change event
	setDimmer = ( value ) ->
		# fixtures = if selected().length > 0 then selected() else allFixtures()
		fixtures = selected()

		fixtures.fixture('value', value)
		$(window).trigger 'dimmer:change'# TODO move this to fixtures? (all need to be handled at once though)


	$('#reset').click clearSelection
	$('#invert').click invertSelection
	$('.dimmer').dimmer()
	$('#dimmer').change (ev) ->
		value = ev.target.value
		setDimmer value / 100

		

	$(document).bind 'keydown', 'esc', clearSelection

	showFloor = (floor) ->
		$('.floor1').hide()
		$('.floor2').hide()
		$('.floor3').hide()
		
		$(".floor#{floor}").show()

		$('#floor').html floor

	$.get fixture_json_url(), (data) ->
		for fixture in data.fixtures
			add_fixture fixture

		showFloor 1

	getFixtureGroupByName = ( name ) ->
		console.log 'looking up ' + name
		fgs = $('.fixtureGroup')
		for fixtureGroup in fgs
			if $(fixtureGroup).data('name') == name then return $(fixtureGroup)

	$.get values_json_url(), (data) ->
		console.log 'load'
		console.log data
		for name, values of data
			console.log name
			fg = getFixtureGroupByName name
			console.log fg
			i = 0
			fg.children('.fixture').each ->
				# console.log values[i]
				$(this).fixture('value', values[i]) # TODO move logic to fixtureGroup Widget
				console.log i
				i++

			# console.log 'loaded values'
			# TODO LOAD VALUES INTO FIXTURES			


	$('#floor1').click ->
		showFloor 1
	$('#floor2').click ->
		showFloor 2
	$('#floor3').click ->
		showFloor 3


	updateOrigin = ->
		midX = $(window).width() / 2 + $(window).scrollLeft()
		midY = $(window).height() / 2 + $(window).scrollTop()
		container3d.css
			'perspective-origin': "#{midX}px #{midY}px"
	
	$(window).scroll updateOrigin
	updateOrigin()

	translateSelected = (x, y, z) ->
		for fg in fixtureGroups
			if fg.hasSelected()
				fg.translate(x, y, z)

	translateSelectedOnKey = (key, x, y, z = 0) ->
		$(document).bind 'keydown', key, (ev) ->
			ev.preventDefault()
			translateSelected x, y, z

	rotateSelected = (x, y, z) ->
		for fg in fixtureGroups
			if fg.hasSelected()
				fg.rotate(x, y, z)

	rotateSelectedOnKey = (key, x, y, z = 0) ->
		$(document).bind 'keydown', key, (ev) ->
			ev.preventDefault()
			rotateSelected x, y, z

	translateSelectedOnKey 'right', 5, 0
	translateSelectedOnKey 'left', -5, 0
	translateSelectedOnKey 'up', 0, -5
	translateSelectedOnKey 'down', 0, 5
	translateSelectedOnKey 'shift+right', 20, 0
	translateSelectedOnKey 'shift+left', -20, 0
	translateSelectedOnKey 'shift+up', 0, -20
	translateSelectedOnKey 'shift+down', 0, 20
	translateSelectedOnKey 'ctrl+up', 0, 0, 5
	translateSelectedOnKey 'ctrl+down', 0, 0, -5
	rotateSelectedOnKey 'ctrl+left', 0, -45, 0
	rotateSelectedOnKey 'ctrl+right', 0, 45, 0
	rotateSelectedOnKey 'alt+left', 0, 0, -45
	rotateSelectedOnKey 'alt+right', 0, 0, 45
	rotateSelectedOnKey 'alt+up', -45, 0, 0
	rotateSelectedOnKey 'alt+down', 45, 0, 0

	# JSON output

	$(document).bind 'keydown', 'ctrl+s', (ev) ->
		ev.preventDefault()
		console.log 'save'

		fixtures = []

		$('.fixtureGroup').each (i) ->
			fixtures.push $(this).data()

		fixturesJSON = JSON.stringify {fixtures: fixtures}, null, 2

		blob = new Blob [fixturesJSON], {type: "text/plain;charset=utf-8"}
		saveAs blob, 'fixtures.json'


	valuesJSON = ->
		# TODO ability to send only updated values
		values = {}

		$('.fixture').fixture().each ->
			fixtureOptions = $(this).fixture('optionsObject')
			index = fixtureOptions.index
			name = fixtureOptions.name
			value = fixtureOptions.value

			if values[ name ] == undefined then values[ name ] = []
			values[ name ][ index ] = value

			# console.log $(this).fixture('optionsObject').value

		console.log values

		return JSON.stringify
			values: values
			command: 'values',
			null, 2

	valuesJSON()
	$(document).bind 'keydown', 'ctrl+d', (ev) ->
		ev.preventDefault()

		blob = new Blob [valuesJSON()], {type: "text/plain;charset=utf-8"}
		saveAs blob, 'values.json'

	# WS Communication
	handleMessage = (ev) ->
		console.log 'Handling WS message'

	window.ws.init
		onmessage: handleMessage

	$(window).on 'dimmer:change', ->
		console.log 'Sending new values'
		window.ws.send valuesJSON()






