# Neural-Nematode: DeepWorm - C. elegans Connectome Visualization

An interactive visualization of the C. elegans nervous system connectome, built with React and D3.js. This tool allows researchers and enthusiasts to explore the neural network of C. elegans, a model organism in neuroscience. *Data Source - The connectome data is based on the simplified version from nanotode, representing the neural connections in C. elegans.

## Features

- **Interactive Network Visualization**: Force-directed graph representation of the C. elegans nervous system
- **Color-Coded Neuron Types**: Easy identification of:
  - Sensory neurons (Cyan)
  - Interneurons (Magenta)
  - Motor neurons (Green)
  - Muscle cells (Yellow)
- **Connection Details**: 
  - Solid lines represent chemical synapses
  - Dashed lines represent gap junctions
  - Line thickness indicates connection strength
  - Node size represents total number of connections
- **Interactive Features**:
  - Zoom and pan navigation
  - Hover for neuron details
  - Filter by neurotransmitter type
  - Draggable nodes for custom arrangement

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/neuro-bit/Neural-Nematode.git
cd Neural-Nematode

2. Install dependecies:
npm install

3. Run the development server:
npm run dev

4. Open your browser and navigate to http://localhost:5173

