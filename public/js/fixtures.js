(function() {
  $(document).ready(function() {
    var FLAGS, addFlag, add_fixture, allFixtures, clearConnectInterval, clearFlags, clearPingInterval, clearSelection, closeSceneList, connectInterval, container3d, createElement, deleteScene, deleteSceneCommand, fixtureGroups, fixture_json_url, getBaseData, getFixtureGroupsByName, getIntensityColor, getSegmentData, handleMessage, initConnectInterval, initConnection, initFlags, initPingInterval, invertSelection, listScenes, listScenesCommand, loadScene, loadValues, navDrag, navlock, navmapClick, navmapDown, navmapMove, navmapUp, pingInterval, pingReceived, pingSent, rotateSelected, rotateSelectedOnKey, saveScene, saveSceneCommand, scene_json_url, selected, sendCommand, setDimmer, showFloor, showScenes, translateSelected, translateSelectedOnKey, updateNavmap, updateOrigin, valuesJSON, values_json_url, wsPing, wsPingHandle, wsPongReceived;
    FLAGS = ['o', 'down', 'up'];
    createElement = function(elem) {
      return $(document.createElement(elem));
    };
    container3d = $('#container');
    fixtureGroups = [];
    fixture_json_url = function() {
      return 'fixtures.json?t=' + (new Date()).getTime();
    };
    values_json_url = function() {
      return 'values.json?t=' + (new Date()).getTime();
    };
    scene_json_url = function(filename) {
      return ("scenes/" + filename + "?t=") + (new Date()).getTime();
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
        flags: new Set(),
        selected: false
      },
      _create: function() {
        this.element.addClass('fixture');
        this.element.click(this, function(ev) {
          ev.data.options.selected = !ev.data.options.selected;
          return ev.data.element.toggleClass('selected', ev.data.options.selected);
        });
        return this._update();
      },
      _update: function() {
        var caption, flag, j, len, ref;
        this.element.css({
          'background-color': getIntensityColor(this.options.value)
        });
        caption = "";
        ref = Array.from(this.options.flags);
        for (j = 0, len = ref.length; j < len; j++) {
          flag = ref[j];
          console.log(caption);
          caption += flag + " ";
        }
        return this.element.html(caption);
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
      flags: function(flags) {
        if (flags === void 0) {
          return Array.from(this.options.flags);
        }
        this.options.flags = new Set(flags);
        this._update();
        return this;
      },
      addFlag: function(flag) {
        console.log("Adding " + flag);
        this.options.flags.add(flag);
        this._update();
        return this;
      },
      deleteFlag: function(flag) {
        this.options.flags["delete"](flag);
        this._update();
        return this;
      },
      clearFlags: function() {
        this.options.flags.clear();
        this._update();
        return this;
      },
      optionsObject: function() {
        return this.options;
      }
    });
    $.fn.group = function(fixture) {
      this.addClass('group');
      this.data({
        name: fixture.name
      });
      this.click(this, function(ev) {
        var fg, fgs, hasSelected, j, k, len, len1, results;
        fgs = getFixtureGroupsByName(ev.data.data('name'));
        console.log(ev.data.data('name'));
        console.log(fgs);
        console.log('group click');
        hasSelected = false;
        for (j = 0, len = fgs.length; j < len; j++) {
          fg = fgs[j];
          if (fg.children('.selected').length > 0) {
            hasSelected = true;
            break;
          }
        }
        console.log(hasSelected);
        results = [];
        for (k = 0, len1 = fgs.length; k < len1; k++) {
          fg = fgs[k];
          results.push(fg.children('.fixture').toggleClass('selected', !hasSelected));
        }
        return results;
      });
      return this;
    };
    $.fn.fixtureGroup = function(fixture, segment) {
      var fixtureTopData, flag, j, len, ref, settings;
      settings = $.extend({
        x: 0,
        y: 0,
        z: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        flags: []
      }, segment);
      fixtureTopData = getBaseData(fixture);
      delete fixtureTopData['segments'];
      settings = $.extend(settings, fixtureTopData);
      this.data(settings);
      this.addClass('fixtureGroup');
      this.addClass(segment.type);
      ref = settings.flags;
      for (j = 0, len = ref.length; j < len; j++) {
        flag = ref[j];
        this.addClass(flag);
      }
      this.addClass('floor' + segment.floor);
      this.data(segment);
      this.updateTransform = function() {
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
      var d, f, g, i, j, k, len, ref, ref1, results, segment;
      ref = fixture.segments;
      results = [];
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        segment = ref[i];
        d = document.createElement('div');
        fixtureGroups.push($(d).fixtureGroup(fixture, segment));
        if ((segment.count > 1 || fixture.segments.length > 1) && i === 0) {
          g = document.createElement('div');
          $(g).group(fixture);
          $(d).append(g);
        }
        for (i = k = 0, ref1 = segment.count; 0 <= ref1 ? k < ref1 : k > ref1; i = 0 <= ref1 ? ++k : --k) {
          f = document.createElement('div');
          $(f).fixture({
            name: fixture.name,
            index: i
          });
          d.append(f);
        }
        results.push($('#container').append(d));
      }
      return results;
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
    addFlag = function(flag) {
      var fixtures;
      fixtures = selected();
      fixtures.fixture('addFlag', flag);
      return $(window).trigger('dimmer:change');
    };
    clearFlags = function() {
      var fixtures;
      console.log('Clearing flags');
      fixtures = selected();
      fixtures.fixture('clearFlags');
      return $(window).trigger('dimmer:change');
    };
    initFlags = function() {
      var flag, flagButton, flagsContainer, fn, j, len;
      flagsContainer = $('#flags');
      flagButton = $('#flags input');
      fn = function() {
        var scopedFlag;
        scopedFlag = flag;
        return flagButton.clone().val(flag).click(function() {
          return addFlag(scopedFlag);
        }).appendTo(flagsContainer);
      };
      for (j = 0, len = FLAGS.length; j < len; j++) {
        flag = FLAGS[j];
        fn();
      }
      return $('#flagsClear').click(clearFlags);
    };
    initFlags();
    $('#reset').click(clearSelection);
    $('#invert').click(invertSelection);
    $('.dimmer').dimmer();
    $('#dimmer').change(function(ev) {
      var value;
      value = ev.target.value;
      return setDimmer(value / 100);
    });
    $("#mode").click(function() {
      return addFlag('o');
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
      var fixture, name, ref;
      console.log("Loading fixtures");
      console.log(data);
      ref = data.fixtures;
      for (name in ref) {
        fixture = ref[name];
        console.log("loaded " + name);
        add_fixture(fixture);
      }
      return showFloor(1);
    });
    getFixtureGroupsByName = function(name) {
      var fgs, fixtureGroup, fixtureGroupsArr, found, j, len;
      fgs = $('.fixtureGroup');
      fixtureGroupsArr = [];
      found = false;
      for (j = 0, len = fgs.length; j < len; j++) {
        fixtureGroup = fgs[j];
        if ($(fixtureGroup).data('name') === name) {
          fixtureGroupsArr.push($(fixtureGroup));
          found = true;
          continue;
        }
        if (found) {
          break;
        }
      }
      return fixtureGroupsArr;
    };
    loadValues = function(path, callback) {
      if (callback == null) {
        callback = void 0;
      }
      return $.get(path, function(data) {
        var fg, fgs, i, j, len, name, values;
        console.log('load');
        console.log(data);
        for (name in data) {
          values = data[name];
          fgs = getFixtureGroupsByName(name);
          i = 0;
          for (j = 0, len = fgs.length; j < len; j++) {
            fg = fgs[j];
            fg.children('.fixture').each(function() {
              $(this).fixture('value', values[i].v);
              $(this).fixture('flags', values[i].f);
              return i++;
            });
          }
        }
        if (callback != null) {
          return callback();
        }
      });
    };
    loadValues(values_json_url());
    $('#floor1').click(function() {
      return showFloor(1);
    });
    $('#floor2').click(function() {
      return showFloor(2);
    });
    $('#floor3').click(function() {
      return showFloor(3);
    });
    saveScene = function() {
      var name;
      name = prompt('Scene name');
      return saveSceneCommand(name);
    };
    showScenes = function(scenes) {
      var deleteAnchor, deleteLi, fn, j, len, li, loadAnchor, loadLi, scene, ul;
      $('.scenes__list').html('');
      fn = function() {
        var clickScene;
        clickScene = scene;
        loadAnchor.click(function(ev) {
          ev.preventDefault();
          return loadScene(clickScene);
        });
        return deleteAnchor.click(function(ev) {
          ev.preventDefault();
          return deleteScene(clickScene);
        });
      };
      for (j = 0, len = scenes.length; j < len; j++) {
        scene = scenes[j];
        li = createElement('li');
        ul = createElement('ul');
        loadLi = createElement('li');
        loadAnchor = createElement('a');
        deleteLi = createElement('li');
        deleteAnchor = createElement('a');
        loadAnchor.attr({
          href: '#'
        });
        deleteAnchor.attr({
          href: '#'
        });
        loadAnchor.html(scene);
        deleteAnchor.html('X');
        loadLi.append(loadAnchor);
        deleteLi.append(deleteAnchor);
        ul.append(loadLi);
        ul.append(deleteLi);
        li.append(ul);
        ul.addClass('scenes__list__scene');
        loadLi.addClass('scenes__list__scene__name');
        deleteLi.addClass('scenes__list__scene__delete');
        fn();
        $('.scenes__list').append(li);
      }
      return $('.scenes').show();
    };
    loadScene = function(name) {
      console.log("Loading scene " + name);
      loadValues(scene_json_url(name), function() {
        return $(window).trigger('dimmer:change');
      });
      return closeSceneList();
    };
    deleteScene = function(name) {
      console.log("Deleting scene " + name);
      deleteSceneCommand(name);
      return closeSceneList();
    };
    listScenes = function(ev) {
      ev.preventDefault();
      return listScenesCommand();
    };
    closeSceneList = function(ev) {
      if (ev != null) {
        ev.preventDefault();
      }
      return $('.scenes').hide();
    };
    $('#saveScene').click(saveScene);
    $('#loadScene').click(listScenes);
    $('#closeScenes').click(closeSceneList);
    closeSceneList();
    updateOrigin = function() {
      var midX, midY;
      midX = $(window).width() / 2 + $(window).scrollLeft();
      midY = $(window).height() / 2 + $(window).scrollTop();
      return container3d.css({
        'perspective-origin': midX + "px " + midY + "px"
      });
    };
    updateNavmap = function() {
      var mapElem, posElem, top, topPercent;
      if (navlock) {
        return;
      }
      mapElem = $('.navmap');
      posElem = $('.navmap__position');
      topPercent = $(window).scrollTop() / ($(document).height() - $(window).height());
      top = (mapElem.height() - posElem.height()) * topPercent;
      return posElem.css({
        top: top + "px"
      });
    };
    navlock = false;
    navDrag = false;
    navmapMove = function(ev) {
      var clickY, mapElem, posElem, top, topPercent;
      mapElem = $('.navmap');
      posElem = $('.navmap__position');
      clickY = ev.originalEvent.y - mapElem.position().top;
      topPercent = clickY / (mapElem.height() - posElem.height());
      top = ($(document).height() - $(window).height()) * topPercent;
      navlock = true;
      console.log("scroll to " + top);
      $(window).scrollTop(top);
      return navlock = false;
    };
    navmapClick = function(ev) {
      navmapDown(ev);
      navmapMove(ev);
      return navmapUp(ev);
    };
    navmapDown = function(ev) {
      return navDrag = true;
    };
    navmapUp = function(ev) {
      return navDrag = false;
    };
    $(window).scroll(updateOrigin);
    $(window).scroll(updateNavmap);
    $('.navmap').click(navmapMove);
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
    getBaseData = function(data) {
      return {
        ip: data.ip,
        name: data.name,
        group: data.group,
        segments: []
      };
    };
    getSegmentData = function(data) {
      return {
        x: data.x,
        y: data.y,
        z: data.z,
        rotX: data.rotX,
        rotY: data.rotY,
        rotZ: data.rotZ,
        count: data.count,
        type: data.type,
        floor: data.floor,
        flags: data.flags
      };
    };
    $(document).bind('keydown', 'ctrl+s', function(ev) {
      var blob, fixtures, fixturesJSON;
      ev.preventDefault();
      console.log('save');
      fixtures = {};
      $('.fixtureGroup').each(function(i) {
        var data;
        data = $(this).data();
        if (fixtures[data.name] == null) {
          fixtures[data.name] = getBaseData(data);
        }
        return fixtures[data.name].segments.push(getSegmentData(data));
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
        var fixtureOptions, flags, index, name, value;
        fixtureOptions = $(this).fixture('optionsObject');
        index = fixtureOptions.index;
        name = fixtureOptions.name;
        value = fixtureOptions.value;
        flags = Array.from(fixtureOptions.flags);
        if (values[name] === void 0) {
          values[name] = [];
        }
        return values[name].push({
          v: value,
          f: flags
        });
      });
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
      var reply;
      console.log('Handling WS message');
      console.log(ev.data);
      reply = JSON.parse(ev.data);
      switch (reply.command) {
        case 'pong':
          return wsPongReceived();
        case 'scenes':
          return showScenes(reply.data);
      }
    };
    connectInterval = void 0;
    initConnectInterval = function() {
      if (connectInterval == null) {
        return connectInterval = window.setInterval(initConnection, 2000);
      }
    };
    clearConnectInterval = function() {
      window.clearInterval(connectInterval);
      return connectInterval = void 0;
    };
    pingInterval = void 0;
    pingReceived = false;
    wsPingHandle = function() {
      if (pingReceived) {
        wsPongReceived();
        return true;
      } else {
        window.ws.socket.close();
        clearPingInterval();
        initConnectInterval();
        return false;
      }
    };
    clearPingInterval = function() {
      var PingInterval;
      console.log('Ping Timeout Clear');
      window.clearInterval(PingInterval);
      return PingInterval = void 0;
    };
    pingSent = false;
    initPingInterval = function() {
      console.log('Ping Interval');
      pingSent = false;
      if (pingInterval == null) {
        return pingInterval = window.setInterval(wsPing, 5000);
      }
    };
    wsPongReceived = function() {
      console.log('Pong Received');
      return pingReceived = true;
    };
    wsPing = function() {
      if (pingSent) {
        if (!wsPingHandle()) {
          return;
        }
      }
      console.log('Ping');
      pingReceived = false;
      window.ws.send(JSON.stringify({
        command: 'ping'
      }));
      return pingSent = true;
    };
    initConnection = function() {
      return window.ws.init({
        onmessage: handleMessage,
        onopen: function() {
          console.log('connected');
          $('.overlay').hide();
          initPingInterval();
          return clearConnectInterval();
        },
        onclose: function() {
          console.log('disconnected');
          $('.overlay').show();
          clearPingInterval();
          return initConnectInterval();
        }
      });
    };
    sendCommand = function(command, data) {
      if (data == null) {
        data = {};
      }
      return window.ws.send(JSON.stringify({
        command: command,
        data: data
      }));
    };
    saveSceneCommand = function(name) {
      return sendCommand('saveScene', name);
    };
    deleteSceneCommand = function(name) {
      return sendCommand('deleteScene', name);
    };
    listScenesCommand = function() {
      return sendCommand('listScenes');
    };
    initConnection();
    return $(window).on('dimmer:change', function() {
      console.log('Sending new values');
      return window.ws.send(valuesJSON());
    });
  });

}).call(this);
