# Line and Circle Drawing Algorithm Visualizer


![TechStack](https://img.shields.io/badge/Tech-JavaScript%20%7C%20HTML%20%7C%20CSS-lightgrey)

A browser-based visualizer for classic computer graphics algorithms.  
This tool demonstrates step-by-step plotting of lines and circles on a grid using popular rasterization algorithms.

---

## Features

### Supported Algorithms
- DDA Line Drawing Algorithm  
- Bresenham Line Drawing Algorithm  
- Midpoint Circle Algorithm  
- Bresenham Circle Algorithm  

### UI Features
- Step-by-step visualization  
- Play, Pause, Next-step controls  
- Adjustable speed  
- Zoom in and out  
- Grid panning  
- Origin toggle (top-left or center)  
- Snap-to-grid  
- Optional direction arrows  
- Step table with calculations  
- Mouse coordinate display  

---

## How It Works

The project uses:
- HTML canvas for drawing  
- JavaScript generator functions to yield step-by-step output  
- A scalable and pannable grid  
- Rendering functions for plotting pixels, axes, and labels  

Each algorithm produces points one step at a time, which are rendered on the canvas and also recorded in the step table.

---

## Project Structure

