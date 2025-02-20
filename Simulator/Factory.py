import random
import simpy
from dataclasses import dataclass

# ------------------------------
# Dataclasses for storing statistics
# ------------------------------
@dataclass
class WorkstationStats:
    busy_time: float = 0.0  # Total time the workstation was processing
    downtime: float = 0.0  # Total time the workstation was under repair
    failures: int = 0  # Number of failures
    total_repair_time: float = 0.0  # Cumulative repair time

@dataclass
class FactoryStats:
    completed: int = 0  # Successfully completed products
    rejected: int = 0  # Rejected products
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
        self.repair_mean = repair_mean  # Average repair time
        self.resupply_devices = resupply_devices  # Shared supplier resource
        self.stats = WorkstationStats()
        self.product_counter = 0  # Counter to track when to check for failures

    def resupply(self, factory_stats) -> simpy.Process:
        """Resupply the bin when empty."""
        with self.resupply_devices.request() as req:
            start_time = self.env.now
            yield req  # Wait for a resupply device
            yield self.env.timeout(abs(random.normalvariate(2, 0.5)))  # Resupply time
            self.bin.put(25)  # Refill bin
            factory_stats.supplier_usage_time += self.env.now - start_time  # Track supplier usage

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
        self.waiting_time = 0.0  # Track total waiting time

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
            self.env.process(workstation.resupply(factory_stats))  # Trigger resupply if empty

        processing_time = abs(random.normalvariate(4, 1))  # Generate processing time
        workstation.stats.busy_time += processing_time  # Track busy time
        yield self.env.timeout(processing_time)
        workstation.resource.release(request)  # Release the workstation

        workstation.product_counter += 1
        if workstation.product_counter >= 5:  # Check for failure condition
            workstation.product_counter = 0
            if random.random() < workstation.failure_prob:
                self.env.process(workstation.repair())

    def process(self, factory) -> simpy.Process:
        """Process the product through all required workstations."""
        try:
            for i in range(3):  # First 3 fixed workstations
                yield from self.process_station(factory.workstations[i], factory.stats)

            chosen_station = random.choice([factory.workstations[3], factory.workstations[4]])  # Random station
            yield from self.process_station(chosen_station, factory.stats)

            yield from self.process_station(factory.workstations[5], factory.stats)  # Final workstation

            if random.random() < 0.05:  # 5% chance of rejection
                factory.stats.rejected += 1
            else:
                factory.stats.completed += 1

        except simpy.Interrupt:
            print(f"Production halted due to accident at {self.env.now}")
            self.env.exit()  # Stop simulation

# ------------------------------
# Factory Class
# ------------------------------
class Factory:
    def __init__(self, env: simpy.Environment):
        self.env = env
        self.resupply_devices = simpy.Resource(env, capacity=3)  # Shared supplier resource
        self.workstations = [
            Workstation(env, 0, 0.02, 3, self.resupply_devices), #Workstations with their respective ID, rejection rate and suppliers
            Workstation(env, 1, 0.01, 3, self.resupply_devices),
            Workstation(env, 2, 0.05, 3, self.resupply_devices),
            Workstation(env, 3, 0.15, 3, self.resupply_devices),
            Workstation(env, 4, 0.07, 3, self.resupply_devices),
            Workstation(env, 5, 0.06, 3, self.resupply_devices),
        ]
        self.stats = FactoryStats()
        self.production_process = env.process(self.generate_products())  # Start production
        env.process(self.accident())  # Start accident monitoring

    def generate_products(self) -> simpy.Process:
        """Continuously generate products."""
        product_id = 1
        while True:
            product = Product(product_id, self.env)
            self.env.process(product.process(self))
            product_id += 1
            yield self.env.timeout(0.5)  # Delay before next product

    def accident(self) -> simpy.Process:
        """Randomly trigger an accident that stops production."""
        while True:
            yield self.env.timeout(100)
            if random.random() < 0.0001:  # Very low probability of accident
                print(f"Accident at {self.env.now} - Production halted!")
                self.env.exit()  # Stop the simulation


env = simpy.Environment()
factory = Factory(env)
env.run(until=5000)  # Run the simulation for 5000 time units

# ------------------------------
# Output Results
# ------------------------------
print(f"Total production: {factory.stats.completed}")
print(f"Rejected products: {factory.stats.rejected}")

total_time = env.now
for i, ws in enumerate(factory.workstations):
    occupancy_rate = ws.stats.busy_time / total_time
    print(f"Station {i} occupancy: {occupancy_rate:.2%}")

for i, ws in enumerate(factory.workstations):
    print(f"Station {i} downtime: {ws.stats.downtime:.2f}")

supplier_occupancy = factory.stats.supplier_usage_time / (3 * total_time)
print(f"Supplier occupancy: {supplier_occupancy:.2%}")

if factory.stats.completed + factory.stats.rejected > 0:
    avg_delay = factory.stats.total_waiting_time / (factory.stats.completed + factory.stats.rejected)
    print(f"Average bottleneck delay: {avg_delay:.2f}")

faulty_rate = factory.stats.rejected / (factory.stats.completed + factory.stats.rejected) if (factory.stats.completed + factory.stats.rejected) > 0 else 0
print(f"Faulty product rate: {faulty_rate:.2%}")
