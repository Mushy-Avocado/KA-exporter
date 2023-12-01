(function() {

    // Warn about Firefox - it has poor performance
    (function() {
        let warnedFirefox = !navigator.userAgent.toLowerCase().includes('firefox') || localStorage.getItem('warnedFirefox');
        if (!warnedFirefox) {
            alert("This game uses Processing.js, which has poor performance in Firefox. It is strongly recommended you open this in Chrome.");
            localStorage.setItem('warnedFirefox', true);
        }
    })();

    function getFunctionBody(func) {
        if (typeof func === "function") {
            func = func.toString();
        }
        return func.substring(func.indexOf("{") + 1, func.lastIndexOf("}"));
    }

    // Whether a url has a file extension or not.
    function hasFileExtension(source) {
        var a = source.split('/');
        return a[a.length - 1].includes('.');
    }

    // Caches assets to load before the program starts for preloading
    const assets = (function() {
        let cache = {};

        let imageURLs = [],
            soundURLs = [];

        let currentProgress = 0;

        function loadCache() {
            return Promise.all([
                // Load cached image URLs
                new Promise((resolve, reject) => {
                    let index = 0;
                    if (imageURLs.length === 0) return void resolve();
                    imageURLs.forEach(url => {
                        cache[url] = new Image();
                        cache[url].onload = () => {
                            currentProgress++;
                            if (++index >= imageURLs.length) resolve();
                        };
                        cache[url].onerror = () => {
                            reject("Failed to load image '" + url + "'. Make sure it exists or is in the correct folder.");
                            return false;
                        };
                        cache[url].src = url;
                    });
                }).catch(console.error),
                // Load cached sound URLs
                new Promise((resolve, reject) => {
                    let index = 0;
                    if (soundURLs.length === 0) return void resolve();
                    soundURLs.forEach(url => {
                        cache[url] = new Audio(url);
                        cache[url].oncanplaythrough = () => {
                            currentProgress++;
                            if (++index >= soundURLs.length) resolve();
                        };
                        cache[url].onerror = () => {
                            reject("Failed to load sound '" + url + "'. Make sure it exits or is in the correct folder.");
                        };
                    });
                }).catch(console.error),
            ]);
        }

        const assetRoot = '/';

        return {
            // Loading progress (between 0-1)
            get progress() {
                return currentProgress / (soundURLs.length + imageURLs.length);
            },
            load: loadCache,
            cache: cache,
            cacheImageURL: url => {
                if (imageURLs.indexOf(url) !== -1) return;
                imageURLs.push(url);
            },
            cacheSoundURL: url => {
                if (soundURLs.indexOf(url) !== -1) return;
                soundURLs.push(url);
            },
            getImageURL: source => {
                if (window.location.href.includes("kasandbox.org"))
                    source = "https://cdn.kastatic.org/third_party/javascript-khansrc/live-editor/build/images/" + source + ".png";
                else if (!source.startsWith(assetRoot + 'images'))
                    source = assetRoot + 'images/' + source;
                if (!hasFileExtension(source))
                    source += '.png';
                return source;
            },
            getSoundURL: source => {
                if (window.location.href.includes("kasandbox.org"))
                    source = "https://cdn.kastatic.org/third_party/javascript-khansrc/live-editor/sounds/" + source;
                else if (!source.startsWith(assetRoot + 'sounds'))
                    source = assetRoot + 'sounds/' + source;
                if (!hasFileExtension(source))
                    source += '.mp3';
                return source;
            },
        };
    })();

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

    // Loaded assets that are ready for PJS to use
    const pjsImages = {},
        pjsSounds = {};

    // Initializes the program to make it load
    window.importerKA = function(processing, canvas) {

        const layout = (function(canvas) {

            // Updates the scale of the canvas to fit its parent element
            function updateScaling() {
                var parent = canvas.parentElement;

                let parentRect = parent.getBoundingClientRect();
                var parentWidth = parentRect.right - parentRect.left;
                var parentHeight = parentRect.bottom - parentRect.top;
                var scaleX = parentWidth / canvas.width;
                var scaleY = parentHeight / canvas.height;

                if (Math.min(scaleX, scaleY) > 1) {
                    canvas.style.scale = 1;
                    return;
                }
                canvas.style.scale = Math.min(scaleX, scaleY);
            };

            return {
                update: function() {
                    updateScaling();
                },
            }

        })(canvas);

        // Subsribe to various events to update the layout.
        screen.orientation.addEventListener("change", layout.update);
        window.addEventListener("resize", layout.update);
        window.addEventListener("load", layout.update);

        // To fix an issue where Processing.js throws an error on mobile and breaks the layout
        window.addEventListener("touchstart", () => layout.update(), {
            once: true,
        });

        // Apply defaults
        processing.size(400, 400);
        processing.background(255, 255, 255);
        processing.angleMode = "degrees";
        processing.strokeCap(processing.ROUND);
        processing.draw = function() {}; // draw() needs a value for PJS to run it

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

        function snapToIncrement(val, increment) {
            return Math.ceil(val / increment) * increment;
        }

        // Resizes the canvas to render at a higher resolution.
        const resize = function(width, height) {
            let scaleIncrement = Math.min(processing.width, processing.height) / 2;
            if (!doResize) return;
            width = snapToIncrement(width, scaleIncrement);
            height = snapToIncrement(height, scaleIncrement);
            // Match to the aspect ratio of the canvas
            width = height * (processing.width / processing.height);
            height = height;
            canvas.width = width;
            canvas.height = height;
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
            resize(targetW, targetH);
            layout.update();
        };

        // Sets the title for the project
        processing.title = function(value) {
            document.title = value;
        };

        // Override loadImage and getImage.
        // Image files should be stored in /images/filePath
        processing.loadImage = processing.getImage = function(source) {
            source = assets.getImageURL(source);
            if (!pjsImages[source]) {
                if (assets.cache[source]) {
                    let pimg = new processing.PImage(),
                        img = assets.cache[source];
                    pimg.fromHTMLImageData(img);
                    pimg.loaded = true;
                    pjsImages[source] = pimg;
                } else {
                    pjsImages[source] = old.loadImage(source);
                    pjsImages[source].sourceImg.crossOrigin = "anonymous";
                    assets.cacheImageURL(source);
                }
            }
            return pjsImages[source];
        }

        // Override getSound and playSound.
        // Sound files should be stored in /sounds/filePath
        processing.getSound = function(source) {
            source = assets.getSoundURL(source);
            if (!pjsSounds[source]) {
                pjsSounds[source] = assets.cache[source] || new Audio(source);
                pjsSounds[source].audio = pjsSounds[source];
            }
            return pjsSounds[source];
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
                ret = old.get(0, 0, canvas.width, canvas.height);
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
            var clientRect = canvas.getBoundingClientRect();
            var scaleX = clientRect.width / (processing.width * canvasScaleX);
            return (x - clientRect.left) / (scaleX * canvasScaleX);
        };
        processing.canvasY = function(y) {
            var clientRect = canvas.getBoundingClientRect();
            var scaleY = clientRect.height / (processing.height * canvasScaleY);
            return (y - clientRect.top) / (scaleY * canvasScaleY);
        };

        // Sets/toggles the fullscreen state
        processing.fullscreen = function(bool) {
            if (bool == true) fullscreen.enable();
            else if (bool == false) fullscreen.disable();
            else fullscreen.toggle();
        };

        // Disabled scaling the canvas to be fullscreen
        processing.noResize = function() {
            resize(processing.width, processing.height);
            doResize = false;
        };

        window.LoopProtector = function() {};
        processing.KAInfiniteLoopSetTimeout = () => {};
        processing.externals = {
            canvas: canvas,
        };

        layout.update();
    }

    let pjsInstanceCount = 0;
    window.runPJS = async function(program) {

        const programString = program.toString();

        // Find all getImage() or loadImage() calls to preload before the program starts
        (function() {
            const imageRegex = /\b((load|get)Image)\s*\(\s*(['"])(.*?)\3\s*\)/g;
            let match;
            while ((match = imageRegex.exec(programString)) !== null) {
                if (match[4]) {
                    console.log("Preloading image: " + match[4]);
                    assets.cacheImageURL(assets.getImageURL(match[4]));
                }
            }
        })();

        // Find all getSound() calls to preload
        (function() {
            const soundRegex = /\b(getSound)\s*\(\s*(['"])(.*?)\2\s*\)/g;
            let match;
            while ((match = soundRegex.exec(programString)) !== null) {
                if (match[3]) {
                    console.log("Preloading sound: " + match[3]);
                    assets.cacheSoundURL(assets.getSoundURL(match[3]));
                }
            }
        })();

        const index = pjsInstanceCount++;
        /*
        const canvas = document.getElementsByClassName("sketch")[index];
        const loadingBar = document.createElement("div");
        loadingBar.style.backgroundColor = "rgb(200, 200, 200)";
        loadingBar.style.position = "absolute";
        loadingBar.style.zIndex = 1000;
        loadingBar.style.top = "0px";
        loadingBar.style.left = "0px";
        loadingBar.style.width = "0%";
        loadingBar.style.height = "100%";
        canvas.parentElement.style.position = "relative";

        const loadingParent = document.createElement("div");
        loadingParent.style.position = "absolute";
        loadingParent.style.zIndex = 100;
        loadingParent.style.top = "50%";
        loadingParent.style.left = "50%";
        loadingParent.style.transform = "translate(-50%, -50%)"
        loadingParent.style.width = "200px";
        loadingParent.style.height = "50px";
        loadingParent.style.backgroundColor = "rgb(50, 50, 50)";

        loadingParent.appendChild(loadingBar);
        canvas.parentElement.appendChild(loadingParent);
        const loadingInterval = setInterval(() => {
        	loadingBar.style.width = (assets.progress * 100) + "%";
        }, 1000/60);
        */

        // Make sure the correct Processing.js library is loaded
        const pjsLoaded = new Promise((resolve, reject) => {
            const pjsURL = 'https://cdn.jsdelivr.net/gh/Khan/processing-js@master/processing.js';
            if (!document.querySelector(`script[src='${pjsURL}']`)) {
                let script = document.createElement("script");
                script.src = pjsURL;
                script.type = "text/javascript";
                script.onload = () => {
                    console.log("Processing.js library loaded from URL " + pjsURL);
                    resolve();
                };
                document.head.appendChild(script);
            } else return void resolve();
        });

        await Promise.all([
            pjsLoaded,
            assets.load(),
        ]);

        /*
        loadingParent.remove();
        clearInterval(loadingInterval);
        */

        const script = document.createElement("script");
        script.innerHTML = `
var __pjsIndex = ${index};
var canvas = document.getElementsByClassName("sketch")[__pjsIndex];
if (!canvas) {
throw "KA Exporter: Failed to load sketch: Missing a canvas element in the HTML with an class name of 'sketch'. If you load multiple PJS scripts make sure you have a matching number of canvas tags.";
}
var __processing = processing = new Processing(canvas, proc => {
window.importerKA(proc, canvas);
});
var __processingCopy = {};
Object.keys(processing).forEach(key => {
	if (!window[key]) {
 		__processingCopy[key] = processing[key];
	}
});
Object.assign(window, __processingCopy);
with (__processing) {
	${getFunctionBody(program)}
	if (typeof draw !== "undefined") {
		__processing.draw = draw.bind(this);
	}
	console.log("---Processing sketch sucessfully loaded---");
}
		`;
        script.type = "text/javascript";
        document.body.appendChild(script);
    };

})(); 
