import random
import simpy
from dataclasses import dataclass #Import dataclasses to make the job easier when answering the final questions

# ------------------------------
# Dataclasses for each class
# ------------------------------
@dataclass
class WorkstationStats:
    busy_time: float = 0.0
    downtime: float = 0.0
    failures: int = 0
    total_repair_time: float = 0.0

@dataclass
class SupplierStats:
    total_usage_time: float = 0.0

@dataclass
class FactoryStats:
    completed: int = 0
    rejected: int = 0
    total_waiting_time: float = 0.0

# ------------------------------
# Workstation Class
# ------------------------------
class Workstation:
    def __init__(self, env: simpy.Environment, station_id, failure_prob, repair_mean, resupply_devices):
        self.env = env
        self.id = station_id
        self.resource = simpy.Resource(env, capacity=1) #One product at a time!
        self.bin = simpy.Container(env, init=25, capacity=25) #Bin capacity
        self.failure_prob = failure_prob
        self.repair_mean = repair_mean
        self.resupply_devices = resupply_devices
        self.stats = WorkstationStats()
        self.product_counter = 0

    def resupply(self) -> simpy.Process:
        """Resupply the bin when empty."""
        with self.resupply_devices.request() as req:
            start_time = self.env.now
            yield req
            yield self.env.timeout(abs(random.normalvariate(2, 0.5)))
            self.bin.put(25)  # Refill the bin
            SupplierStats.total_usage_time += self.env.now - start_time

    def repair(self) -> simpy.Process:
        """Repair the workstation."""
        repair_time = random.expovariate(1 / self.repair_mean)
        self.stats.downtime += repair_time #How much time the workstation is down depending on the repair time
        self.stats.failures += 1 #Add to failures
        self.stats.total_repair_time += repair_time
        yield self.env.timeout(repair_time)

# ------------------------------
# Product Class
# ------------------------------
class Product:
    def __init__(self, product_id, env: simpy.Environment):
        self.id = product_id
        self.env = env
        self.start_time = env.now
        self.waiting_time = 0.0

    def process_station(self, workstation) -> simpy.Process:
        """Process a product through a workstation."""
        request = workstation.resource.request()
        queue_start = self.env.now
        yield request
        current_wait = self.env.now - queue_start
        self.waiting_time += current_wait
        FactoryStats.total_waiting_time += current_wait 

        # Request 1 unit from the bin (wait if empty)
        yield workstation.bin.get(1)

        # Trigger resupply if bin is empty AFTER taking 1 unit
        if workstation.bin.level == 0:
            self.env.process(workstation.resupply())

        # Process the product
        processing_time = abs(random.normalvariate(4, 1))
        workstation.stats.busy_time += processing_time
        yield self.env.timeout(processing_time)
        workstation.resource.release(request)

        # Check for failures every 5 products
        workstation.product_counter += 1
        if workstation.product_counter >= 5:
            workstation.product_counter = 0
            if random.random() < workstation.failure_prob:
                self.env.process(workstation.repair())

    def process(self, factory) -> simpy.Process:
        """Process the product through all 6 stations."""
        try:
            # Stations 1-3 (sequential)
            for i in range(3):
                yield from self.process_station(factory.workstations[i])

            # Stations 4 and 5 (interchangeable)
            for station in [factory.workstations[3], factory.workstations[4]]:
                yield from self.process_station(station)

            # Station 6 (final)
            yield from self.process_station(factory.workstations[5])

            # Quality check (5% rejection)
            if random.random() < 0.05:
                factory.stats.rejected += 1
            else:
                factory.stats.completed += 1

        except simpy.Interrupt:
            print(f"Production halted due to accident at {self.env.now}")

# ------------------------------
# Factory Class
# ------------------------------
class Factory:
    def __init__(self, env: simpy.Environment):
        self.env = env
        self.resupply_devices = simpy.Resource(env, capacity=3)
        self.workstations = [
            Workstation(env, 0, 0.02, 3, self.resupply_devices), #The 6 workstations with their ID, failure probability and the number of resuppliers
            Workstation(env, 1, 0.01, 3, self.resupply_devices),
            Workstation(env, 2, 0.05, 3, self.resupply_devices),
            Workstation(env, 3, 0.15, 3, self.resupply_devices),
            Workstation(env, 4, 0.07, 3, self.resupply_devices),
            Workstation(env, 5, 0.06, 3, self.resupply_devices),
        ]
        self.stats = FactoryStats() #Stats for the factory
        self.production_process = env.process(self.generate_products())
        env.process(self.accident()) #Accident

    def generate_products(self) -> simpy.Process:
        """Generate products with a small delay between them."""
        product_id = 1
        while True:
            product = Product(product_id, self.env)
            self.env.process(product.process(self))
            product_id += 1
            yield self.env.timeout(0.5)  # Add a delay between product generations

    def accident(self) -> simpy.Process:
        """Trigger a facility-stopping accident with 0.01% daily probability."""
        while True:
            yield self.env.timeout(10)
            if random.random() < 0.0001: #0.01% chance of an accident happening with each product
                print(f"Accident at {self.env.now} - Production halted!")
                self.production_process.interrupt()
                break


env = simpy.Environment()
factory = Factory(env)
env.run(until=5000)


# 1. Final production after 5000 time units
print(f"Total production: {factory.stats.completed}")
print(f"Rejected products: {factory.stats.rejected}")

# 2. Occupancy rate of each workstation
total_time = env.now
for i, ws in enumerate(factory.workstations):
    occupancy_rate = ws.stats.busy_time / total_time
    print(f"Station {i} occupancy: {occupancy_rate:.2%}")

# 3. Downtime per workstation
for i, ws in enumerate(factory.workstations):
    print(f"Station {i} downtime: {ws.stats.downtime:.2f}")

# 4. Supplier occupancy rate
supplier_occupancy = SupplierStats.total_usage_time / (3 * total_time)
print(f"Supplier occupancy: {supplier_occupancy:.2%}")

# 5. Average fixing time
total_repair_time = sum(ws.stats.total_repair_time for ws in factory.workstations)
total_failures = sum(ws.stats.failures for ws in factory.workstations)
avg_fix_time = total_repair_time / total_failures if total_failures > 0 else 0
print(f"Average fixing time: {avg_fix_time:.2f}")

# 6. Average delay due to bottlenecks
avg_delay = factory.stats.total_waiting_time / (factory.stats.completed + factory.stats.rejected)
print(f"Average bottleneck delay: {avg_delay:.2f}")

# 7. Faulty product rate
faulty_rate = factory.stats.rejected / (factory.stats.completed + factory.stats.rejected)
print(f"Faulty product rate: {faulty_rate:.2%}")