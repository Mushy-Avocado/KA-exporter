
function toggleFullscreen() {
  if (!document.fullscreenElement &&    // alternative standard method
    !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  }
}

(function() {
  window.onbeforeunload = () => true;
  
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
      document.querySelector("#toolbar").style.display = "none";
    } else {
      document.querySelector("#toolbar").style.display = "block";
    }
  });
  
  // https://stackoverflow.com/a/61543105/17564818
  let applyScaling = scaledWrapper => {
    let scaledContents = scaledWrapper.getElementsByClassName('scaled-content');
  
    for (var i = 0; i < scaledContents.length; i++) {
      var scaledContent = scaledContents[i];
      scaledContent.style.transform = 'scale(1, 1)';
  
      let { width: cw, height: ch } = scaledContent.getBoundingClientRect();
      let { width: ww, height: wh } = scaledWrapper.getBoundingClientRect();
  
      let scaleAmtX = Math.min(ww / cw, wh / ch);
      let scaleAmtY = scaleAmtX;
      // Don't scale up, only down.
      if (scaleAmtX > 1 && scaleAmtY > 1) return;
      scaledContent.style.transform = `scale(${scaleAmtX}, ${scaleAmtY})`;
      scaledContent.style.webkitTransform = `scale(${scaleAmtX}, ${scaleAmtY})`;
    }
  };
  
  var wrapper = document.querySelector("#content");
  applyScaling(wrapper);
  // A little hack just to make sure nothing changed after the initial scaling was applied.
  window.setTimeout(() => applyScaling(wrapper), 1000)
  window.onresize = () => applyScaling(wrapper);
  screen.orientation.addEventListener("change", () => applyScaling(wrapper));
  
  // Most browsers support ResizeObserver
  if (typeof ResizeObserver != "undefined") {
    new ResizeObserver(() => applyScaling(wrapper)).observe(wrapper);
  }
})();


function createProcessing(func) {

  // Takes a function and adds the code before and after it.
  const wrap = (start, code, end) => {
    code = code.toString();
    var codeString = (start + code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")) + end);
    return new Function('return function foo(processing) {' + codeString + '}')();
  };

  // Whether a url has a file extension or not.
  const hasFileExtension = (source) => {
    var a = source.split('/');
    return a[a.length - 1].includes('.');
  }

  const toFunction = (codeString) => {
    return new Function("return " + codeString)();
  };
  
  function initialize (processing) {

    processing.assetRoot = '/';
    
    // Apply defaults
    processing.size(400, 400);
    processing.background(255, 255, 255);
    processing.angleMode = "degrees";

    var globalScaleX = 1;
    var globalScaleY = 1;

    // Resizes the canvas without making it blurry. size() must be called first.
    processing.resize = (width, height) => {
      globalScaleX = width / processing.width;
      globalScaleY = height / processing.height;
      window.canvas.width *= globalScaleX;
      window.canvas.height *= globalScaleY;
      processing.scale(globalScaleX, globalScaleY);
    };

    // Override loadImage and getImage.
    // Image files should be stored in assetRoot/images/
    var pjsLoadImage = processing.loadImage;
    processing.loadImage = function(source) {
      if (!source.startsWith(processing.assetRoot + 'images'))
        source = processing.assetRoot + 'images/' + source;
      if (!hasFileExtension(source))
        source += '.png';
      return pjsLoadImage(source);
    }
    processing.getImage = processing.loadImage;

    // Override getSound and playSound.
    // Sound files should be stored in assetRoot/sounds/
    var loadedSounds = {};
    processing.getSound = function (source) {
      if (!source.startsWith(processing.assetRoot + 'sounds')) 
        source = processing.assetRoot + 'sounds/' + source;
      if (!hasFileExtension(source)) 
        source += '.mp3';
      
      if (!loadedSounds[source]) {
        loadedSounds[source] = new Audio(source);
        loadedSounds[source].key = source;
      }
      return loadedSounds[source];
    }
    processing.playSound = function (audio, volume = 1) {
      var sound = processing.getSound(audio.key);
      sound.volume = volume;    
      sound.play().catch(e => {
        console.warn(e);
      });
    }

    // Save old copies of PJS functions
    var pjsGet = processing.get;
    var pjsImage = processing.image;
    var pjsBackground = processing.background;

    // New functions that take into account scaling
    processing.image = function(img, x, y, w, h) {
      if (!w && !h) {
        pjsImage.call(this, img, x, y, img.width / globalScaleX, img.height / globalScaleY);
      } else {
        pjsImage.call(this, img, x, y, w, h);
      }
    };
    
    processing.get = function()
    {
      if (arguments.length == 0) {
        return pjsGet.call(this, 0, 0, window.canvas.width, window.canvas.height);
      } else {
        return pjsGet.call(this, arguments[0] * globalScaleX, arguments[1] * globalScaleY, arguments[2] * globalScaleX, arguments[3] * globalScaleY);
      }
    };

    // Tricking PJS into rendering at a larger size.
    processing.background = function(...args) {
      processing.width *= globalScaleX;
      processing.height *= globalScaleY;
      pjsBackground.apply(processing, args);
      processing.width /= globalScaleX;
      processing.height /= globalScaleY;
    };

    processing.debug = () => 
    {
      console.log.apply(this, arguments);
    };
    
    processing.Program = {
      restart: () => window.location.reload(),
      assertEqual: console.warn.bind(console),
    };

    // Update mouse coordinates
    var lastClientX = 0;
    var lastClientY = 0;
    window.addEventListener("mousemove", function(e) {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
    });

    // Scales an axis based on the size of the canvas
    // Takes a screen position as input
    processing.canvasX = function(x) {
      var clientRect = window.canvas.getBoundingClientRect();
      var scaleX = clientRect.width / (processing.width * globalScaleX);
      return (x - clientRect.left) / (scaleX * globalScaleX);
    };
    processing.canvasY = function(y) {
      var clientRect = window.canvas.getBoundingClientRect();
      var scaleY = clientRect.height / (processing.height * globalScaleY);
      return (y - clientRect.top) / (scaleY * globalScaleY);
    };

    // mouseX and mouseY references are replaced with this at compile time.
    processing.getMouseX = function() {
      return processing.canvasX(lastClientX);
    };
    processing.getMouseY = function() {
      return processing.canvasY(lastClientY);
    };
    
  }

  // Takes in a function and outputs a compiled version.
  function compile (func) {
    var codeString = func.toString();

    // Remove the KAInfiniteLoopSetTimeout hack.
    var loopTimeoutMatch = codeString.match("this[ ]*\[[ ]*\[[ ]*(\"KAInfiniteLoopSetTimeout\")[ ]*\][ ]*\][ ]*\([ ]*\d*[ ]*\);*");
    if (loopTimeoutMatch)
      codeString = codeString.replace(loopTimeoutMatch[0], "");

    // These functions are replaced at compile time.
    var replacers = {
      '/(?<!\\.)mouseX/': 'getMouseX()',
      '/(?<!\\.)mouseY/': 'getMouseY()',
    };
  
    for (var [from, to] of Object.entries(replacers)) {
      codeString = codeString.replaceAll(new RegExp(from), to);
    }
    var code = toFunction(codeString);

    // Make processing variables the global context.
    return wrap('with (processing) {', code, '}');
  }

  // Compile the input function
  var sketch = compile(func);

  // The final output to give to processing.js
  function output(processing) {
    initialize(processing);
    sketch(processing);
  }

  window.canvas = document.getElementById("canvas"); 
  window.processing = new Processing(window.canvas, output);
}
