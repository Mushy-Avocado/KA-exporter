# KA-exporter
Export existing Khan Academy projects easily by loading this script.

### Documentation

```
// Global function must be named "program"
function program() {
  size(400, 400); // Define canvas size
  title("Project name here");
  // noResize(); // <-- Disable resizing to fullscreen canvas, try this if there's a rendering bug

  // Khan Academy code goes here
  ellipse(50, 50, 100, 100);
}

```

Then load the script. That's all there is to it! You need to have an ID of "canvas" on the target canvas you want to load.
