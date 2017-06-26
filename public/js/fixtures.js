(function() {
  $(document).ready(function() {
    var add_fixture, allFixtures, clearSelection, container3d, fixtureGroups, fixture_json_url, getFixtureGroupByName, getIntensityColor, handleMessage, invertSelection, rotateSelected, rotateSelectedOnKey, selected, setDimmer, showFloor, translateSelected, translateSelectedOnKey, updateOrigin, valuesJSON, values_json_url;
    container3d = $('#container');
    fixtureGroups = [];
    fixture_json_url = function() {
      return 'fixtures.json';
    };
    values_json_url = function() {
      return 'values.json?t=' + (new Date()).getTime();
    };
    getIntensityColor = function(value) {
      var colorValue;
      colorValue = Math.round(255 * value);
      return "rgb(" + colorValue + ", " + colorValue + ", " + colorValue + ")";
    };
    $.widget('xyz.dimmer', {
      options: {
        steps: 10
      },
      _create: function() {
        var i, j, ref, results;
        results = [];
        for (i = j = 0, ref = this.options.steps; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
          results.push(this.element.append(this._createButton(i)));
        }
        return results;
      },
      _createButton: function(index) {
        var d, intensity;
        intensity = 1 / this.options.steps * index;
        console.log(intensity);
        d = $(document.createElement('div'));
        d.addClass('dimmer-button');
        d.css({
          width: (100 / (this.options.steps + 1)) + "%",
          background: getIntensityColor(intensity)
        });
        return d.click(function() {
          return setDimmer(intensity);
        });
      }
    });
    $.widget('xyz.fixture', {
      options: {
        name: 'NA',
        index: 0,
        value: 0.5,
        selected: false
      },
      _create: function() {
        this.element.addClass('fixture');
        this.element.click(this, function(ev) {
          console.log('fixture click');
          console.log(ev);
          ev.data.options.selected = !ev.data.options.selected;
          console.log(ev.data.options.selected);
          return ev.data.element.toggleClass('selected', ev.data.options.selected);
        });
        return this._update();
      },
      _update: function() {
        console.log('fixture update');
        return this.element.css({
          'background-color': getIntensityColor(this.options.value)
        });
      },
      _constrain: function(value) {
        return Math.max(Math.min(value, 1), 0);
      },
      value: function(value) {
        if (value === void 0) {
          return this.options.value;
        }
        this.options.value = this._constrain(value);
        this._update();
        return this;
      },
      optionsObject: function() {
        return this.options;
      }
    });
    $.fn.group = function(fixture) {
      this.addClass('group');
      this.click(this, function(ev) {
        var hasSelected;
        console.log('group click');
        hasSelected = ev.data.siblings('.selected').length > 0;
        console.log(hasSelected);
        return ev.data.siblings('.fixture').toggleClass('selected', !hasSelected);
      });
      return this;
    };
    $.fn.fixtureGroup = function(fixture) {
      var settings;
      console.log(this);
      settings = $.extend({
        x: 0,
        y: 0,
        z: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0
      }, fixture);
      this.data(settings);
      this.addClass('fixtureGroup');
      this.addClass(fixture.type);
      this.addClass('floor' + fixture.floor);
      this.data(fixture);
      this.updateTransform = function() {
        console.log('update transform');
        console.log(this.data());
        return this.css({
          transform: "translate3d(" + (this.data().x) + "vw, " + (this.data().y) + "vw, " + (this.data().z) + "vw) rotateX(" + (this.data().rotX) + "deg) rotateY(" + (this.data().rotY) + "deg) rotateZ(" + (this.data().rotZ) + "deg)"
        });
      };
      this.updateTransform();
      this.hasSelected = function() {
        return this.children('.selected').length > 0;
      };
      this.translate = function(x, y, z) {
        if (z == null) {
          z = 0;
        }
        this.data().x += x;
        this.data().y += y;
        this.data().z += z;
        return this.updateTransform();
      };
      this.rotate = function(x, y, z) {
        if (z == null) {
          z = 0;
        }
        this.data().rotX += x;
        this.data().rotY += y;
        this.data().rotZ += z;
        return this.updateTransform();
      };
      return this;
    };
    add_fixture = function(fixture) {
      var d, f, g, i, j, ref;
      d = document.createElement('div');
      fixtureGroups.push($(d).fixtureGroup(fixture));
      if (fixture.count > 1) {
        g = document.createElement('div');
        $(g).group();
        $(d).append(g);
      }
      for (i = j = 0, ref = fixture.count; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        f = document.createElement('div');
        $(f).fixture({
          name: fixture.name,
          index: i
        });
        d.append(f);
      }
      return $('#container').append(d);
    };
    clearSelection = function() {
      return $('.fixture').removeClass('selected');
    };
    selected = function() {
      return $('.selected');
    };
    allFixtures = function() {
      return $('.fixture');
    };
    invertSelection = function() {
      return $('.fixture').toggleClass('selected');
    };
    setDimmer = function(value) {
      var fixtures;
      fixtures = selected();
      fixtures.fixture('value', value);
      return $(window).trigger('dimmer:change');
    };
    $('#reset').click(clearSelection);
    $('#invert').click(invertSelection);
    $('.dimmer').dimmer();
    $('#dimmer').change(function(ev) {
      var value;
      value = ev.target.value;
      return setDimmer(value / 100);
    });
    $(document).bind('keydown', 'esc', clearSelection);
    showFloor = function(floor) {
      $('.floor1').hide();
      $('.floor2').hide();
      $('.floor3').hide();
      $(".floor" + floor).show();
      return $('#floor').html(floor);
    };
    $.get(fixture_json_url(), function(data) {
      var fixture, j, len, ref;
      ref = data.fixtures;
      for (j = 0, len = ref.length; j < len; j++) {
        fixture = ref[j];
        add_fixture(fixture);
      }
      return showFloor(1);
    });
    getFixtureGroupByName = function(name) {
      var fgs, fixtureGroup, j, len;
      console.log('looking up ' + name);
      fgs = $('.fixtureGroup');
      for (j = 0, len = fgs.length; j < len; j++) {
        fixtureGroup = fgs[j];
        if ($(fixtureGroup).data('name') === name) {
          return $(fixtureGroup);
        }
      }
    };
    $.get(values_json_url(), function(data) {
      var fg, i, name, results, values;
      console.log('load');
      console.log(data);
      results = [];
      for (name in data) {
        values = data[name];
        console.log(name);
        fg = getFixtureGroupByName(name);
        console.log(fg);
        i = 0;
        results.push(fg.children('.fixture').each(function() {
          $(this).fixture('value', values[i]);
          console.log(i);
          return i++;
        }));
      }
      return results;
    });
    $('#floor1').click(function() {
      return showFloor(1);
    });
    $('#floor2').click(function() {
      return showFloor(2);
    });
    $('#floor3').click(function() {
      return showFloor(3);
    });
    updateOrigin = function() {
      var midX, midY;
      midX = $(window).width() / 2 + $(window).scrollLeft();
      midY = $(window).height() / 2 + $(window).scrollTop();
      return container3d.css({
        'perspective-origin': midX + "px " + midY + "px"
      });
    };
    $(window).scroll(updateOrigin);
    updateOrigin();
    translateSelected = function(x, y, z) {
      var fg, j, len, results;
      results = [];
      for (j = 0, len = fixtureGroups.length; j < len; j++) {
        fg = fixtureGroups[j];
        if (fg.hasSelected()) {
          results.push(fg.translate(x, y, z));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };
    translateSelectedOnKey = function(key, x, y, z) {
      if (z == null) {
        z = 0;
      }
      return $(document).bind('keydown', key, function(ev) {
        ev.preventDefault();
        return translateSelected(x, y, z);
      });
    };
    rotateSelected = function(x, y, z) {
      var fg, j, len, results;
      results = [];
      for (j = 0, len = fixtureGroups.length; j < len; j++) {
        fg = fixtureGroups[j];
        if (fg.hasSelected()) {
          results.push(fg.rotate(x, y, z));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };
    rotateSelectedOnKey = function(key, x, y, z) {
      if (z == null) {
        z = 0;
      }
      return $(document).bind('keydown', key, function(ev) {
        ev.preventDefault();
        return rotateSelected(x, y, z);
      });
    };
    translateSelectedOnKey('right', 5, 0);
    translateSelectedOnKey('left', -5, 0);
    translateSelectedOnKey('up', 0, -5);
    translateSelectedOnKey('down', 0, 5);
    translateSelectedOnKey('shift+right', 20, 0);
    translateSelectedOnKey('shift+left', -20, 0);
    translateSelectedOnKey('shift+up', 0, -20);
    translateSelectedOnKey('shift+down', 0, 20);
    translateSelectedOnKey('ctrl+up', 0, 0, 5);
    translateSelectedOnKey('ctrl+down', 0, 0, -5);
    rotateSelectedOnKey('ctrl+left', 0, -45, 0);
    rotateSelectedOnKey('ctrl+right', 0, 45, 0);
    rotateSelectedOnKey('alt+left', 0, 0, -45);
    rotateSelectedOnKey('alt+right', 0, 0, 45);
    rotateSelectedOnKey('alt+up', -45, 0, 0);
    rotateSelectedOnKey('alt+down', 45, 0, 0);
    $(document).bind('keydown', 'ctrl+s', function(ev) {
      var blob, fixtures, fixturesJSON;
      ev.preventDefault();
      console.log('save');
      fixtures = [];
      $('.fixtureGroup').each(function(i) {
        return fixtures.push($(this).data());
      });
      fixturesJSON = JSON.stringify({
        fixtures: fixtures
      }, null, 2);
      blob = new Blob([fixturesJSON], {
        type: "text/plain;charset=utf-8"
      });
      return saveAs(blob, 'fixtures.json');
    });
    valuesJSON = function() {
      var values;
      values = {};
      $('.fixture').fixture().each(function() {
        var fixtureOptions, index, name, value;
        fixtureOptions = $(this).fixture('optionsObject');
        index = fixtureOptions.index;
        name = fixtureOptions.name;
        value = fixtureOptions.value;
        if (values[name] === void 0) {
          values[name] = [];
        }
        return values[name][index] = value;
      });
      console.log(values);
      return JSON.stringify({
        values: values,
        command: 'values'
      }, null, 2);
    };
    valuesJSON();
    $(document).bind('keydown', 'ctrl+d', function(ev) {
      var blob;
      ev.preventDefault();
      blob = new Blob([valuesJSON()], {
        type: "text/plain;charset=utf-8"
      });
      return saveAs(blob, 'values.json');
    });
    handleMessage = function(ev) {
      return console.log('Handling WS message');
    };
    window.ws.init({
      onmessage: handleMessage
    });
    return $(window).on('dimmer:change', function() {
      console.log('Sending new values');
      return window.ws.send(valuesJSON());
    });
  });

}).call(this);
