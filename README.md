# Three.js HBKU  Interactive 3D Avatar Viewer

This project is a 3D interactive model viewer built using React and Three.js. It loads a GLTF model, supports animations, and allows user interaction 
via keyboard and mouse inputs. The project utilizes the `three.js` library, `GLTFLoader`, and `Stats.js` for performance monitoring.

## Features

- **3D Model Loading**: Loads a GLTF model from a specified path.
- **Scene Setup**: Configurable lights, camera, fog, and background.
- **Animation Support**: Includes predefined animation states and emotes.
- **Keyboard Controls**:
  - Arrow keys: Move the model.
  - Spacebar: Make the model jump.
- **Mouse Controls**:
  - Left-click: Triggers a "Wave" emote.
  - Right-click: Triggers a "Thumbs Up" emote.
- **GUI Controls**: Allows switching between animation states and modes.
- **Performance Monitoring**: Uses Stats.js to display real-time FPS and rendering statistics.
- **Cursor Follow Mode**: Allows the model to follow the cursor position.

## Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <project-directory>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm start
   ```

## Configuration

The project uses a `CONFIG` object to centralize various settings:

- `camera`: Position, field of view, and target.
- `scene`: Background color and fog.
- `lights`: Hemisphere and directional lighting.
- `ground`: Plane size and material.
- `grid`: Grid helper settings.
- `model`: Path to the 3D model.
- `animations`: List of supported states and emotes.
- `cursorFollow`: Controls sensitivity when in cursor-follow mode.
- `keyboard`: Defines movement speed, jump height, and rotation speed.

## Controls

- **Keyboard**:
  - `ArrowUp`: Move forward.
  - `ArrowDown`: Move backward.
  - `ArrowLeft`: Move left.
  - `ArrowRight`: Move right.
  - `Space`: Jump.
- **Mouse**:
  - Left-click: "Wave" emote.
  - Right-click: "Thumbs Up" emote.
- **GUI Panel**:
  - Change animation states.
  - Adjust movement speed.
  - Toggle between "Default" and "Follow Cursor" modes.

## Dependencies

- `three`
- `react`
- `three/examples/jsm/loaders/GLTFLoader`
- `three/examples/jsm/libs/stats.module`
- `three/examples/jsm/libs/lil-gui.module.min`




