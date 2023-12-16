# KA-exporter
Export existing Khan Academy projects easily by loading this script.

### Documentation

Load the script. That's all there is to it! You need to have a canvas with an ID of "sketch" on the target canvas you want to load.

Example program:
```
// Contain all KA code within a function
function program() {
  size(400, 400); // Define canvas size
  title("Project name here");
  // noResize(); // <-- Disable resizing to fullscreen canvas, try this if there's a rendering bug

  // Khan Academy code goes here
  ellipse(50, 50, 100, 100);
}

runPJS(program); // Run the code

```
