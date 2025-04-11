# Manufacturing Facility Dashboard


## Introduction

This project simulates a manufacturing facility's operations over 365 working days and provides an interactive dashboard to visualize key performance metrics. The system consists of:

1. **Factory Simulation** (`factory.py`): Simulates daily operations including workstation utilization, product completion, and random accidents.
2. **Data Visualization Dashboard**: Interactive web-based dashboard showing production trends, workstation performance, and quality metrics.

The dashboard is being continuously upgraded with new visualizations, including:
- Production volume over time
- Workstation occupancy rates
- Product rejection analysis
- Production time metrics

## Getting Started

### Prerequisites

- Python 3.5+
- Modern web browser (Chrome, Firefox, Edge recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SG2_Team1.git
   cd SG2_Team1
   
2. Install required dependencies:
   ```bash
   pip install simpy numpy

### Running the Simulation and Dashboard
1. First, run the factory simulation to generate data (or click the play button at the top right of the code)
   ```bash
   python factory.py
This will create `simulation_data.csv` in the `data/` folder. Right now the folder is empty so that way your generated data is unique and exclusive to you!
   
2. To view the dashboard, right click on the dashboard folder and open an integrated terminal to start a local web server:
   ```bash
   python -m http.server

3. Open your browser and navigate to:
   http://localhost:8000

## Dashboard Features
The interactive dashboard provides several visualization panels:

### Production Overview

- Daily completed products with weekly/monthly aggregation options
- Accident indicators when production was halted

### Workstation Performance

- Occupancy rates across all workstations
- Average processing time per station
- Downtime analysis

### Quality Control

- Daily product rejection counts
- Faulty rate percentage trends
- Rejection patterns over 25-day intervals

### Time Controls

- Toggle between daily, weekly, and monthly views
- Dark mode toggle for better visibility


## Dependencies
The project uses the following Python packages:

- `simpy`: Discrete-event simulation framework
- `numpy`: Numerical operations and random distributions
- `d3.js`: Data visualization (included via CDN)
- `Bootstrap`: Responsive layout (included via CDN)

All visualization dependencies are loaded via CDN in the HTML file - no additional installation needed.
