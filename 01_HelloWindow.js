// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size: 500 x 500
canvas.width = 500;
canvas.height = 500;

// Initialize WebGL settings: viewport
gl.viewport(0, 0, canvas.width, canvas.height);

// Enable SCISSOR_TEST to allow scissor testing
gl.enable(gl.SCISSOR_TEST);

gl.clear(gl.COLOR_BUFFER_BIT);

// Start rendering
render();

// Render loop
function render() {
    
    // Draw four quadrants individually with different colors by using scissor test

    // Left-bottom quadrant (Blue)
    gl.scissor(0, 0, canvas.width / 2, canvas.height / 2);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Right-bottom quadrant (Yellow)
    gl.scissor(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
    gl.clearColor(1.0, 1.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Left-top quadrant (Green)
    gl.scissor(0, canvas.height / 2, canvas.width / 2, canvas.height / 2);
    gl.clearColor(0.0, 1.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Right-top quadrant (Red)
    gl.scissor(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Resize viewport and canvas in 1:1 ratio when window size changes
window.addEventListener('resize', () => {
    if(window.innerWidth < window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerWidth;
    } else {
        canvas.width = window.innerHeight;
        canvas.height = window.innerHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();
});

