# KA-exporter
Export existing Khan Academy projects easily by loading this script.

### Documentation

Load the script. You need to have a canvas with a class of "sketch" on the target canvas you want to load.

Example program:
```
// Contain all KA code within a function
function program() {
  size(400, 400); // Define canvas size here
  title("Project name here");
  // noResize(); // <-- Disable resizing to fullscreen canvas, try this if there's a rendering bug

  // Khan Academy code goes here. Example:
  ellipse(50, 50, 100, 100);
}

runPJS(program); // Run the code

```
