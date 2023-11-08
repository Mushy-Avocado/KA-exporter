
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
		if (typeof args == "string") args = [args];
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
			var parentWidth = parentRect.right - parentRect.left;
			var parentHeight = parentRect.bottom - parentRect.top;
      var scaleX = parentWidth / canvas.width;
      var scaleY = parentHeight / canvas.height;
			//if (pixelPerfect) scaleX = Math.floor(scaleX * (canvas.width / 200)) / (canvas.width / 200);
			//if (pixelPerfect) scaleY = Math.floor(scaleY * (canvas.height / 200)) / (canvas.height / 200);
			
			if (Math.min(scaleX, scaleY) > 1) {
				canvas.style.scale = 1;
				return;
			}
      canvas.style.scale = Math.min(scaleX, scaleY);
    };

    const toolbar = (function() {

			
      let toolbarEnabled = true;
			
      function toggleToolbar() {
        if (toolbarEnabled) disableToolbar();
        else enableToolbar();
      }
    
      function expandToolbar() {
        var elem = document.querySelector('#toolbar');
        if (!elem) return;
        toolbarEnabled = true;
				let enableEvent = new Event("toolbarshow");
        window.dispatchEvent(enableEvent);
        updateScaling();
      }
    
      function collapseToolbar() {
        var elem = document.querySelector('#toolbar');
        if (!elem) return;
        toolbarEnabled = false;
				let disableEvent = new Event("toolbarhide");
        window.dispatchEvent(disableEvent);
        updateScaling();
      }

			function disableToolbar() {
				var elem = document.querySelector('#toolbar');
				if (!elem) return;
				elem.remove();
				updateScaling();
			}
    
      // Updates the toolbar layout
      function updateToolbar() {
        if (window.innerHeight == screen.height) collapseToolbar();
        else expandToolbar();
      }
  
      return {
        toggle: toggleToolbar,
				enable: () => {},
        disable: disableToolbar,
        update: updateToolbar,
      }
      
    })();

    return {
      toolbar,
			pixelPerfect: function() {
				pixelPerfect = true;
			},
      update: function() {
        layout.toolbar.update();
        updateScaling();
      },
    }
    
  })();

  // Initializes the program to make it load
  function initialize(processing) {

    scaleIncrement = 1;

    // Apply defaults
    processing.size(400, 400);
    processing.background(255, 255, 255);
    processing.angleMode = "degrees";
    processing.assetRoot = '/'; // Where sounds and images are stored

		var doResize = true;
    var canvasScaleX = 1;
    var canvasScaleY = 1;

		// Tells processing.js what the width and height actually is for certain rendering functions
		function pushSize() {
			processing.width *= canvasScaleX;
			processing.height *= canvasScaleY;
		}
		function popSize() {
			processing.width /= canvasScaleX;
			processing.height /= canvasScaleY;
		}

    // Save old copies of PJS functions
    const old = {
      get: processing.get.bind(processing),
      image: processing.image.bind(processing),
			loadImage: processing.loadImage.bind(processing),
      background: processing.background.bind(processing),
      resetMatrix: processing.resetMatrix.bind(processing),
      filter: processing.filter.bind(processing),
      loadImage: processing.loadImage.bind(processing),
    };

		function snapToIncrement(val, increment){
			return Math.ceil(val / increment) * increment;
		}

    // Resizes the canvas to render at a higher resolution.
    let resize = function(width, height) {
			if (!doResize) return;
			width = snapToIncrement(width, scaleIncrement);
			height = snapToIncrement(height, scaleIncrement);
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
			var targetW = screen.width * window.devicePixelRatio;
			var targetH = screen.height * window.devicePixelRatio;
			if (targetW < w && targetH < h) {
      	resize(targetW, targetH);
			} else {
				resize(targetW, targetH);
			}
      layout.update();
    };

    // Sets the scale increment so as not to cause gaps in the rendering
    processing.pixelPerfect = function (bool) {
			if (bool === void 0 || bool) {
				scaleIncrement = Math.min(processing.width, processing.height) / 2;
			} else {
				scaleIncrement = 0;
			}
			resize(screen.width * window.devicePixelRatio, screen.height * window.devicePixelRatio);
    };
    
    // Sets the title for the project
    processing.title = function(value) {
      document.title = value;
      var title = document.getElementById('title');
      if (title) title.textContent = value;
    };

    // Override loadImage and getImage.
    // Image files should be stored in assetRoot/images/filePath
    processing.loadImage = function(source) {
      if (!source.startsWith(processing.assetRoot + 'images'))
        source = processing.assetRoot + 'images/' + source;
      if (!hasFileExtension(source))
        source += '.png';
      return old.loadImage(source);
    }
    processing.getImage = processing.loadImage;

    // Override getSound and playSound.
    // Sound files should be stored in assetRoot/sounds/filePath
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

		// Draws at the correct scale when no width and height are given
    processing.image = function(img, x, y, w, h) {
			if (!w && !h)
        old.image(img, x, y, img.width / (img.originScaleX || 1), img.height / (img.originScaleY || 1));
      else old.image(img, x, y, w, h);
    };

		// Captures the correct part of the screen
    processing.get = function() {
      var ret;
      if (arguments.length == 0)
        ret = old.get(0, 0, window.canvas.width, window.canvas.height);
      else if (arguments.length == 2)
        ret = old.get(arguments[0] * canvasScaleX, arguments[1] * canvasScaleY);
      else
        ret = old.get(arguments[0] * canvasScaleX, arguments[1] * canvasScaleY, arguments[2] * canvasScaleX, arguments[3] * canvasScaleY);
      // Makes sure the images are rendered correctly at a different scale
      ret.originScaleX = canvasScaleX;
      ret.originScaleY = canvasScaleY;
      return ret;
    };

		// Makes sure these render on the whole canvas
    processing.background = function(...args) {
      pushSize();
      old.background.apply(processing, args);
      popSize();
    };
    processing.filter = function(...args) {
      pushSize();
      old.filter.apply(processing, args);
      popSize();
    };

		// Makes sure the canvas is still scaled correctly
    processing.resetMatrix = function() {
      old.resetMatrix();
      processing.scale(canvasScaleX, canvasScaleY);
    };

    processing.debug = console.log.bind(console);
    processing.Program = {
      restart: window.location.reload.bind(window),
      assertEqual: console.warn.bind(console),
    };

    // Update mouse coordinates
    window.addEventListener("mousemove", function(e) {
      processing.mouseX = processing.canvasX(e.clientX);
      processing.mouseY = processing.canvasY(e.clientY);
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

		// Sets/toggles the fullscreen state
    processing.fullscreen = function(bool) {
      if (bool == true) fullscreen.enable();
      else if (bool == false) fullscreen.disable();
      else fullscreen.toggle();
    };

		// Sets/toggles the toolbar visibility
    processing.toolbar = function(bool) {
      if (bool == true || bool == void 0) layout.toolbar.enable();
      else if (bool == false) layout.toolbar.disable();
    };

		// Disabled scaling the canvas to be fullscreen
		processing.noResize = function() {
			resize(processing.width, processing.height);
			doResize = false;
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
      //codeString = codeString.replaceAll(new RegExp(from, 'g'), to);
    }
    
    var code = toFunction(codeString);

    // Make processing variables the global context.
    return wrap('with (processing) { try {', code, '} catch(e) { console.error(e); } }', ['processing']);
  }

  // Add fullscreen button behavior
  var fullscreenButton = document.getElementById('fullscreen');
  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", fullscreen.toggle);
  }

  // Subsribe to various events to update the layout.
  screen.orientation.addEventListener("change", layout.update);
  window.addEventListener("resize", layout.update);
  window.addEventListener("load", layout.update);

  // To fix an issue where Processing.js throws an error on mobile and breaks the layout
  window.addEventListener("touchstart", () => {
    layout.update();
  }, {
		once: true,
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
