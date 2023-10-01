
(function() {

  // Oops! Looks like there's nothing to load...
  if (typeof program == 'undefined') {
    console.error('Missing a global function called "program" to load. Make sure you loaded the script containing it before the importer.');
    return;
  }

  // Firefox has poor performance
  (function() {
    let warnedFirefox = !navigator.userAgent.toLowerCase().includes('firefox') || localStorage.getItem('warnedFirefox');
    if (!warnedFirefox) {
      alert("This game uses Processing.js, which has poor performance in Firefox. It is strongly recommended you open this in Chrome.");
      localStorage.setItem('warnedFirefox', true);
    }
  })();
  
  // Takes a function and adds the specified strings of code before and after it.
  function wrap (start, code, end, args) {
    if (!args) args = [];
    code = code.toString();
    var codeString = (start + code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")) + end);
    return new Function('return function foo(' + args.join(',') + ') {' + codeString + '}')();
  }

  // Whether a url has a file extension or not.
  function hasFileExtension (source) {
    var a = source.split('/');
    return a[a.length - 1].includes('.');
  }

  // Converts a string to a function
  function toFunction (codeString) {
    return new Function("return " + codeString)();
  }

  const fullscreen = (function() {

    function enableFullscreen() {
      if (document.documentElement.reqestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    }
    
    function disableFullscreen() {
      if (document.exitFullScreen) {
        document.exitFullScreen();
      } else if (document.mozExitFullScreen) {
        document.mozExitFullScreen();
      } else if (document.webkitExitFullScreen) {
        document.webkitExitFullScreen();
      }
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
    
    function isFullscreen() {
      return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
    }
    
    // Fullscreen toggle
    function toggleFullscreen() {
      if (!isFullscreen())
        enableFullscreen();
      else
        disableFullscreen();
    }

    return {
      enable: enableFullscreen,
      disable: disableFullscreen,
      toggle: toggleFullscreen,
    };
    
  })();
  const layout = (function() {
    
    // Updates the scale of the canvas to fit its parent element
    function updateScaling() {
      var canvas = window.canvas;
      var parent = canvas.parentElement;
      
      let parentRect = parent.getBoundingClientRect();
      var scaleX = (parentRect.right - parentRect.left) / canvas.width;
      var scaleY = (parentRect.bottom - parentRect.top) / canvas.height;

      canvas.style.scale = Math.min(scaleX, scaleY);
    };

    const toolbar = (function() {

      let toolbarEnabled = true;
      function toggleToolbar() {
        if (toolbarEnabled) disableToolbar();
        else enableToolbar();
      }
    
      function enableToolbar() {
        var elem = document.querySelector('#toolbar');
        if (!elem) return;
        toolbarEnabled = true;
        elem.style.translate = '0px 0px';
        elem.style.position = "relative";
        elem.style.top = "0px";
        elem.style.left = "0px";
        updateScaling();
      }
    
      function disableToolbar() {
        var elem = document.querySelector('#toolbar');
        if (!elem) return;
        toolbarEnabled = false;
        elem.style.translate = '0px -100%';
        elem.style.position = "absolute";
        elem.style.top = "0px";
        elem.style.left = "0px";
        elem.style.right = "0px";
        updateScaling();
      }
    
      // Updates the toolbar layout
      function updateToolbar() {
        if (window.innerHeight == screen.height) disableToolbar();
        else enableToolbar();
      }
  
      return {
        toggle: toggleToolbar,
        enable: enableToolbar,
        disable: disableToolbar,
        update: updateToolbar,
      }
      
    })();

    return {
      toolbar,
      update: function() {
        layout.toolbar.update();
        updateScaling();
      },
    }
    
  })();

  // Initializes the program to make it load
  function initialize(processing) {

    scaleIncrement = 0;

    // Apply defaults
    processing.size(400, 400);
    processing.background(255, 255, 255);
    processing.angleMode = "degrees";
    processing.assetRoot = '/'; // Where sounds and images are stored
    
    var canvasScaleX = 1;
    var canvasScaleY = 1;

    // Save old copies of PJS functions
    const old = {
      get: processing.get,
      image: processing.image,
      background: processing.background,
      resetMatrix: processing.resetMatrix,
      filter: processing.filter,
      loadImage: processing.loadImage,
    };

    // Resizes the canvas to render correctly at the specified width and height.
    let resize = function(width, height) {
      // Match to the aspect ratio of the canvas
      width = height * (processing.width / processing.height);
      height = height;
      window.canvas.width = width;
      window.canvas.height = height;
      canvasScaleX = width / processing.width;
      canvasScaleY = height / processing.height;
      old.resetMatrix();
      processing.scale(canvasScaleX, canvasScaleY);
      layout.update();
    };

    // Size only sets the actual variable "width" and "height". resize() takes care of the rest.
    processing.size = function(w, h) {
      processing.width = w;
      processing.height = h;
      resize(screen.width * window.devicePixelRatio, screen.height * window.devicePixelRatio);
      layout.update();
    };

    // Sets the scale increment so as not to cause gaps in the rendering
    processing.pixelPerfect = function () {
      scaleIncrement = ~~(processing.width / 200);
      layout.update();
    };
    
    // Sets the title for the project
    processing.title = function(value) {
      document.title = value;
      var title = document.getElementById('title');
      if (title) title.textContent = value;
    };

    // Override loadImage and getImage.
    // Image files should be stored in assetRoot/images/
    processing.loadImage = function(source) {
      if (!source.startsWith(processing.assetRoot + 'images'))
        source = processing.assetRoot + 'images/' + source;
      if (!hasFileExtension(source))
        source += '.png';
      return old.image(source);
    }
    processing.getImage = processing.loadImage;

    // Override getSound and playSound.
    // Sound files should be stored in assetRoot/sounds/
    var loadedSounds = {};
    processing.getSound = function(source) {
      if (!source.startsWith(processing.assetRoot + 'sounds'))
        source = processing.assetRoot + 'sounds/' + source;
      if (!hasFileExtension(source))
        source += '.mp3';

      if (!loadedSounds[source]) {
        loadedSounds[source] = new Audio(source);
      }
      return loadedSounds[source];
    }
    processing.playSound = function(sound, volume = 1) {
      sound.volume = volume;
      sound.play().catch(e => {
        console.warn(e);
      });
    }

    // New functions that take into account scaling
    processing.image = function(img, x, y, w, h) {
      if (!w && !h)
        old.image.call(this, img, x, y, img.width / (img.originScaleX || 1), img.height / (img.originScaleY || 1));
      else old.image.call(this, img, x, y, w, h);
    };
    processing.get = function() {
      var ret;
      if (arguments.length == 0)
        ret = old.get.call(this, 0, 0, window.canvas.width, window.canvas.height);
      else if (arguments.length == 2)
        ret = old.get.call(this, arguments[0] * canvasScaleX, arguments[1] * canvasScaleY);
      else
        ret = old.get.call(this, arguments[0] * canvasScaleX, arguments[1] * canvasScaleY, arguments[2] * canvasScaleX, arguments[3] * canvasScaleY);
      // If the canvas is resized multiple times, this makes sure it's rendered correctly (albeit blurry)
      ret.originScaleX = canvasScaleX;
      ret.originScaleY = canvasScaleY;
      return ret;
    };
    processing.background = function(...args) {
      processing.width *= canvasScaleX;
      processing.height *= canvasScaleY;
      old.background.apply(processing, args);
      processing.width /= canvasScaleX;
      processing.height /= canvasScaleY;
    };
    processing.resetMatrix = function() {
      old.resetMatrix();
      processing.scale(canvasScaleX, canvasScaleY);
    };
    processing.filter = function(...args) {
      processing.width *= canvasScaleX;
      processing.height *= canvasScaleY;
      old.filter.apply(processing, args);
      processing.width /= canvasScaleX;
      processing.height /= canvasScaleY;
    };

    processing.debug = console.log.bind(console);
    processing.Program = {
      restart: window.location.reload.bind(window),
      assertEqual: console.warn.bind(console),
    };

    // Update mouse coordinates
    var scaledMouseX = 0;
    var scaledMouseY = 0;
    window.addEventListener("mousemove", function(e) {
      scaledMouseX = processing.canvasX(e.clientX);
      scaledMouseY = processing.canvasY(e.clientY);
    });

    // Scales an axis based on the size of the canvas
    // Takes a screen position as input
    processing.canvasX = function(x) {
      var clientRect = window.canvas.getBoundingClientRect();
      var scaleX = clientRect.width / (processing.width * canvasScaleX);
      return (x - clientRect.left) / (scaleX * canvasScaleX);
    };
    processing.canvasY = function(y) {
      var clientRect = window.canvas.getBoundingClientRect();
      var scaleY = clientRect.height / (processing.height * canvasScaleY);
      return (y - clientRect.top) / (scaleY * canvasScaleY);
    };

    // mouseX and mouseY references are replaced with this at runtime.
    processing.getMouseX = function() {
      return scaledMouseX;
    };
    processing.getMouseY = function() {
      return scaledMouseY;
    };

    processing.fullscreen = function(bool) {
      if (bool == true) fullscreen.enable();
      else if (bool == false) fullscreen.disable();
      else fullscreen.toggle();
    };

    processing.toolbar = function(bool) {
      if (bool == true) layout.toolbar.enable();
      else if (bool == false) layout.toolbar.disable();
      else layout.toolbar.toggle();
    };

    layout.update();
  }

  // Takes in a function and outputs a compiled version at runtime.
  function compile(func) {
    var codeString = func.toString();

    // Remove the KAInfiniteLoopSetTimeout hack.
    var loopTimeoutMatch = codeString.match("this[ ]*\[[ ]*\[[ ]*(\"KAInfiniteLoopSetTimeout\")[ ]*\][ ]*\][ ]*\([ ]*\d*[ ]*\);*");
    if (loopTimeoutMatch)
      codeString = codeString.replace(loopTimeoutMatch[0], "");

    // These functions are replaced at compile time.
    var replacers = {
      '(?<!\\.)mouseX': 'getMouseX()',
      '(?<!\\.)mouseY': 'getMouseY()',
    };

    for (var [from, to] of Object.entries(replacers)) {
      codeString = codeString.replaceAll(new RegExp(from, 'g'), to);
    }
    
    var code = toFunction(codeString);

    // Make processing variables the global context.
    return wrap('with (processing) {', code, '}', ['processing']);
  }

  // Add fullscreen button
  var fullscreenButton = document.getElementById('fullscreen');
  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", fullscreen.toggle);
  }

  // Subsribe to various events to update the layout.
  screen.orientation.addEventListener("change", layout.update);
  window.addEventListener("resize", layout.update);
  window.addEventListener("load", layout.update);

  // To fix an issue where Processing.js throws an error on mobile and breaks the layout
  let mobileErrorFix = window.addEventListener("touchstart", () => {
    layout.update();
    window.removeEventListener("touchstart", mobileErrorFix);
  });

  // Compile the input function
  var compiledProgram = compile(program);

  // The final output to give to processing.js
  function output(processing) {
    initialize(processing);
    compiledProgram(processing);
    layout.update();
  }
  
  window.canvas = document.getElementById("canvas");
  window.processing = new Processing(window.canvas, output);
})();
