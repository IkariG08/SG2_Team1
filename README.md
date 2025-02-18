# Electronic Device Manufacturing Factory Simulation

This repository contains a Python-based simulation of an electronic device manufacturing factory using the **SimPy** library for the Simulation & Visualization class in Universidad Panamericana, instructed by professor Gabriel Castillo Cortés. The simulation models the production process, including workstations, material resupply, workstation failures, and quality control. The goal is to analyze the factory's performance, identify bottlenecks, and propose improvements to enhance efficiency and product quality.

---

## **Table of Contents**
1. [Project Overview](#project-overview)
2. [Code Structure](#code-structure)
3. [Dependencies](#dependencies)

---

## **Project Overview**
The simulation models a factory with six workstations that produce electronic devices. Each workstation requires raw materials, which are supplied by automatic resupply devices. Workstations can fail randomly, and repairs take time, leading to downtime. Products go through all six workstations, and there is a chance of rejection at the end due to quality issues. The simulation runs for 5000 time units and tracks key performance metrics, such as total production, rejected products, workstation occupancy, downtime, and supplier usage.

---

## **Code Structure**
The code is organized into the following components:

1. **Data Classes**:
   - `WorkstationStats`: Tracks statistics for each workstation (e.g., busy time, downtime, failures).
   - `SupplierStats`: Tracks usage statistics for resupply devices.
   - `FactoryStats`: Tracks overall factory performance (e.g., completed products, rejected products).

2. **Workstation Class**:
   - Represents a workstation with attributes like failure probability, repair time, and material bin.
   - Methods include `resupply` (to replenish materials) and `repair` (to handle failures).

3. **Product Class**:
   - Represents a product being manufactured.
   - Methods include `process_station` (to simulate processing at a workstation) and `process` (to move the product through all workstations).

4. **Factory Class**:
   - Manages the overall simulation, including workstations, resupply devices, and product generation.
   - Methods include `generate_products` (to create new products) and `accident` (to simulate random accidents).

5. **Simulation Execution**:
   - The `run_simulation` function runs the simulation and collects results.

---

## **Dependencies**
To run the simulation, you need the following Python libraries:
- **SimPy**: For discrete-event simulation.

You can install the dependencies using `pip`:
```bash
pip install simpy
