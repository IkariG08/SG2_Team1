import random
import simpy
import csv
import os
from dataclasses import dataclass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_FILENAME = os.path.join(BASE_DIR, "data", "simulation_data.csv")

# ------------------------------
# Dataclasses for storing statistics
# ------------------------------
@dataclass
class WorkstationStats:
    busy_time: float = 0.0    # Total time the workstation was processing
    downtime: float = 0.0     # Total time the workstation was under repair
    failures: int = 0         # Number of failures
    total_repair_time: float = 0.0  # Cumulative repair time

@dataclass
class FactoryStats:
    completed: int = 0        # Successfully completed products
    rejected: int = 0         # Rejected products
    total_waiting_time: float = 0.0  # Total waiting time across products
    supplier_usage_time: float = 0.0  # Time suppliers were used

# ------------------------------
# Workstation Class
# ------------------------------
class Workstation:
    def __init__(self, env: simpy.Environment, station_id, failure_prob, repair_mean, resupply_devices):
        self.env = env
        self.id = station_id
        self.resource = simpy.Resource(env, capacity=1)  # Only one product processed at a time
        self.bin = simpy.Container(env, init=25, capacity=25)  # Storage bin starts full
        self.failure_prob = failure_prob  # Probability of failure after processing a batch
        self.repair_mean = repair_mean    # Average repair time
        self.resupply_devices = resupply_devices  # Shared supplier resource
        self.stats = WorkstationStats()
        self.product_counter = 0  # Counter to track when to check for failures

    def resupply(self, factory_stats) -> simpy.Process:
        """Resupply the bin when empty."""
        with self.resupply_devices.request() as req:
            start_time = self.env.now
            yield req  # Wait for a resupply device
            yield self.env.timeout(abs(random.normalvariate(2, 0.5)))  # Resupply time
            yield self.bin.put(25)  # Refill bin
            factory_stats.supplier_usage_time += self.env.now - start_time

    def repair(self) -> simpy.Process:
        """Repair the workstation when it fails."""
        repair_time = random.expovariate(1 / self.repair_mean)  # Generate repair time
        self.stats.downtime += repair_time
        self.stats.failures += 1
        self.stats.total_repair_time += repair_time
        yield self.env.timeout(repair_time)  # Wait for repair to complete

# ------------------------------
# Product Class
# ------------------------------
class Product:
    def __init__(self, product_id, env: simpy.Environment):
        self.id = product_id
        self.env = env
        self.start_time = env.now  # Track when the product was created
        self.waiting_time = 0.0    # Track total waiting time

    def process_station(self, workstation, factory_stats) -> simpy.Process:
        """Process a product through a workstation."""
        request = workstation.resource.request()
        queue_start = self.env.now
        yield request  # Wait for the workstation to be available
        current_wait = self.env.now - queue_start
        self.waiting_time += current_wait
        factory_stats.total_waiting_time += current_wait  # Accumulate waiting time

        yield workstation.bin.get(1)  # Consume one unit from the bin
        if workstation.bin.level == 0:
            # Trigger resupply in parallel if bin is empty
            self.env.process(workstation.resupply(factory_stats))

        processing_time = abs(random.normalvariate(4, 1))  # Generate processing time
        workstation.stats.busy_time += processing_time  # Track busy time
        yield self.env.timeout(processing_time)
        workstation.resource.release(request)  # Release the workstation

        # Check for failure condition every 5 products processed
        workstation.product_counter += 1
        if workstation.product_counter >= 5:
            workstation.product_counter = 0
            if random.random() < workstation.failure_prob:
                self.env.process(workstation.repair())

    def process(self, factory) -> simpy.Process:
        """Process the product through all required workstations."""
        try:
            # Process through the first 3 fixed workstations
            for i in range(3):
                yield from self.process_station(factory.workstations[i], factory.stats)

            # Process at either workstation 3 or 4 (randomly chosen)
            chosen_station = random.choice([factory.workstations[3], factory.workstations[4]])
            yield from self.process_station(chosen_station, factory.stats)

            # Process through the final workstation (number 5)
            yield from self.process_station(factory.workstations[5], factory.stats)

            # Quality control: 5% chance the product is rejected
            if random.random() < 0.05:
                factory.stats.rejected += 1
            else:
                factory.stats.completed += 1

        except simpy.Interrupt:
            print(f"Production halted due to accident at {self.env.now}")
            self.env.exit()  # Normally stops the simulation, but we will handle this in Factory

# ------------------------------
# Factory Class
# ------------------------------
class Factory:
    def __init__(self, env: simpy.Environment):
        self.env = env
        self.resupply_devices = simpy.Resource(env, capacity=3)  # Shared supplier resource
        self.workstations = [
            Workstation(env, 0, 0.02, 3, self.resupply_devices),
            Workstation(env, 1, 0.01, 3, self.resupply_devices),
            Workstation(env, 2, 0.05, 3, self.resupply_devices),
            Workstation(env, 3, 0.15, 3, self.resupply_devices),
            Workstation(env, 4, 0.07, 3, self.resupply_devices),
            Workstation(env, 5, 0.06, 3, self.resupply_devices),
        ]
        self.stats = FactoryStats()
        self.accident_occurred = False  # Flag to mark if an accident occurred in this run
        self.production_process = env.process(self.generate_products())
        env.process(self.accident())

    def generate_products(self) -> simpy.Process:
        """Continuously generate products unless an accident occurs."""
        product_id = 1
        while not self.accident_occurred:
            product = Product(product_id, self.env)
            self.env.process(product.process(self))
            product_id += 1
            yield self.env.timeout(0.5)  # Delay before next product

    def accident(self) -> simpy.Process:
        """Randomly trigger an accident that stops further production."""
        while True:
            yield self.env.timeout(100)
            if random.random() < 0.0001:  # Very low probability of accident
                print(f"Accident at {self.env.now} - Production halted for this run!")
                self.accident_occurred = True
                break  # Stop the accident process

# ------------------------------
# Data Preparation: Run Simulation(s) and Log Data to CSV
# ------------------------------
NUM_RUNS = 365  # One run = One day of production
SIM_TIME = 5000  # Simulation time (in time units)


# Define CSV field names:
fieldnames = [
    "Run",
    "TotalCompleted",
    "TotalRejected",
    "TotalProducts",
    "AvgWaitingTime",
    "FaultyRate",
    "SupplierOccupancy"
]
for i in range(6):
    fieldnames.append(f"WS{i}_Occupancy")
    fieldnames.append(f"WS{i}_Downtime")

with open(CSV_FILENAME, mode="w", newline="") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()

    # Run multiple simulation runs
    for run in range(1, NUM_RUNS + 1):
        env = simpy.Environment()
        factory = Factory(env)
        env.run(until=SIM_TIME)
        total_time = env.now

        if factory.accident_occurred:
            # Mark all fields for this run as "accident"
            row = {field: "accident" for field in fieldnames}
            row["Run"] = run
        else:
            total_completed = factory.stats.completed
            total_rejected = factory.stats.rejected
            total_products = total_completed + total_rejected
            avg_waiting = factory.stats.total_waiting_time / total_products if total_products > 0 else 0
            faulty_rate = (total_rejected / total_products * 100) if total_products > 0 else 0
            supplier_occupancy = factory.stats.supplier_usage_time / (3 * total_time) * 100

            row = {
                "Run": run,
                "TotalCompleted": total_completed,
                "TotalRejected": total_rejected,
                "TotalProducts": total_products,
                "AvgWaitingTime": round(avg_waiting, 2),
                "FaultyRate": round(faulty_rate, 2),
                "SupplierOccupancy": round(supplier_occupancy, 2)
            }

            for idx, ws in enumerate(factory.workstations):
                occupancy = ws.stats.busy_time / total_time * 100
                downtime = ws.stats.downtime
                row[f"WS{idx}_Occupancy"] = round(occupancy, 2)
                row[f"WS{idx}_Downtime"] = round(downtime, 2)

        writer.writerow(row)

print(f"Data preparation complete. Results have been saved to '{CSV_FILENAME}'.")
