document.addEventListener("DOMContentLoaded", function () {
  // =============================================
  // 1. CONSTANTS AND SETUP
  // =============================================
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  let currentRange = "daily";

  // =============================================
  // 2. MAIN CHART - PRODUCTION OVER TIME
  // =============================================
  const svgContainer = d3.select("body").append("div")
    .attr("class", "dashboard");

  // Create container for production chart
  const productionContainer = svgContainer.append("div")
    .attr("class", "chart-container")
    .style("margin-bottom", "30px");

  const svg = productionContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Production chart title
  chart.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-family", "'Segoe UI', sans-serif")
    .style("font-size", "24px")
    .style("fill", "#007bff")
    .text("Completed Products Over Time");

  // Scales and axes for production chart
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  const xAxisGroup = chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`);

  const yAxisGroup = chart.append("g")
    .attr("class", "axis");

  // Axis labels
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Time range");

  chart.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Total products");

  // =============================================
  // 3. OCCUPANCY PER WORKSTATION CHART (Bar Chart)
  // =============================================
  const occupancyContainer = svgContainer.append("div")
    .attr("class", "chart-container");

  const occupancySvg = occupancyContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const occupancyChart = occupancySvg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // =============================================
  // 4. AVERAGE PRODUCTION TIME PER WORKSTATION
  // =============================================
  const prodTimeContainer = svgContainer.append("div")
    .attr("class", "chart-container")
    .style("margin-bottom", "30px");

  const prodTimeSvg = prodTimeContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const prodTimeChart = prodTimeSvg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // =============================================
  // 5. PRODUCTION REJECTION CHART (New)
  // =============================================
  const rejectionContainer = svgContainer.append("div")
    .attr("class", "chart-container")
    .style("margin-bottom", "30px");

  const rejectionSvg = rejectionContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const rejectionChart = rejectionSvg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);


  // =============================================
  // 6. DOWNTIME PER WORKSTATION CHART
  // =============================================
  const downtimeContainer = svgContainer.append("div")
  .attr("class", "chart-container")
  .style("margin-bottom", "30px");

  const downtimeSvg = downtimeContainer.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

  const downtimeChart = downtimeSvg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // =============================================
  // 7. COMPARISON CHART - COMPLETED VS REJECTED
  // =============================================
  const comparisonContainer = svgContainer.append("div")
  .attr("class", "chart-container")
  .style("margin-bottom", "30px");

  const comparisonSvg = comparisonContainer.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

  const comparisonChart = comparisonSvg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // =============================================
  // 8. EFFICIENCY OVER TIME CHART
  // =============================================
  const efficiencyContainer = svgContainer.append("div")
  .attr("class", "chart-container fade-in")
  .style("margin-bottom", "30px");

  const efficiencySvg = efficiencyContainer.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

  const efficiencyChart = efficiencySvg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // =============================================
  // 9. OVERALL EFFICIENCY PER WORKSTATION (HORIZONTAL BAR CHART)
  // =============================================
  const efficiencyBarContainer = svgContainer.append("div")
  .attr("class", "chart-container");

  const efficiencyBarSvg = efficiencyBarContainer.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

  const efficiencyBarChart = efficiencyBarSvg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);




  // =============================================
  // 10. DATA LOADING AND PROCESSING
  // =============================================
  d3.csv("data/simulation_data.csv").then(function (data) {
    // Process data for all charts
    data.forEach(d => {
      d.run = +d.Run;
      d.total_products = isNaN(+d.TotalCompleted) ? null : +d.TotalCompleted;
      d.total_rejected = +d.TotalRejected;
      d.faulty_rate = +d.FaultyRate;
      for (let i = 0; i < 6; i++) {
        d[`ws${i}_occupancy`] = +d[`WS${i}_Occupancy`];
        d[`ws${i}_downtime`] = +d[`WS${i}_Downtime`];
      }
    });

    // =============================================
    // 11. CHART UPDATE FUNCTIONS
    // =============================================
    function aggregateData(range) {
      if (range === "daily") return data;
    
      const groupSize = range === "weekly" ? 7 : 30;
      const grouped = [];
      for (let i = 0; i < data.length; i += groupSize) {
        const group = data.slice(i, i + groupSize);
        const avgProducts = d3.mean(group, d => d.total_products);
        const avgOccupancy = {};
    
        for (let j = 0; j < 6; j++) {
          avgOccupancy[`ws${j}_occupancy`] = d3.mean(group, d => d[`ws${j}_occupancy`]);
        }
    
        grouped.push({
          run: i / groupSize + 1,
          total_products: avgProducts,
          ...avgOccupancy
        });
      }
      return grouped;
    }

    function initializeRejectionChart() {
      // Use only daily data (first 365 days)
      const dailyData = data.filter(d => d.run <= 365 && d.total_rejected !== "accident");
      
      // Create 25-unit intervals
      const intervalSize = 25;
      const intervals = [];
      for (let i = 25; i <= 365; i += intervalSize) {
        intervals.push({
          start: i - intervalSize + 1,
          end: i,
          run: i
        });
      }
    
      const intervalData = intervals.map(interval => {
        const dataInRange = dailyData.filter(d => 
          d.run >= interval.start && d.run <= interval.end
        );
        
        return {
          run: interval.run,
          total_rejected: d3.sum(dataInRange, d => d.total_rejected),
          faulty_rate: d3.mean(dataInRange, d => d.faulty_rate),
          count: dataInRange.length
        };
      }).filter(d => d.count > 0);
    
      // Create scales
      const x = d3.scaleBand()
        .domain(intervalData.map(d => d.run))
        .range([0, width])
        .padding(0.2);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(intervalData, d => d.total_rejected) * 1.1])
        .range([height, 0]);
    
      // Add chart title
      rejectionChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Daily Product Rejects");
    
      // Add bars
      rejectionChart.selectAll(".reject-bar")
        .data(intervalData)
        .enter()
        .append("rect")
        .attr("class", "reject-bar")
        .attr("x", d => x(d.run))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.total_rejected))
        .attr("height", d => height - y(d.total_rejected))
        .attr("fill", "#e15759")
        .attr("rx", 3);
    
      // Add percentage labels
      rejectionChart.selectAll(".percentage-label")
        .data(intervalData)
        .enter()
        .append("text")
        .attr("class", "percentage-label")
        .attr("x", d => x(d.run) + x.bandwidth()/2)
        .attr("y", d => y(d.total_rejected) - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(d => `${d.faulty_rate.toFixed(1)}%`);
    
      // Add x-axis
      rejectionChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d));
    
      // Add y-axis
      rejectionChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
    
      // Add axis labels
      rejectionChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Production Day Interval (25 days)");
    
      rejectionChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Rejects");
    }

    function initializeComparisonChart() {
      comparisonChart.selectAll("*").remove();
    
      const filteredData = data.filter(d => d.total_products !== null && d.total_rejected !== "accident");
    
      // Ejes
      const x0 = d3.scaleBand()
        .domain(filteredData.map(d => d.run))
        .range([0, width])
        .padding(0.2);
    
      const x1 = d3.scaleBand()
        .domain(["Completed", "Rejected"])
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.total_products) * 1.1])
        .range([height, 0]);
    
      // Ejes
      comparisonChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x0).tickValues(x0.domain().filter(d => d % 30 === 0)).tickFormat(d3.format("d")));
    
      comparisonChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
    
      // Título
      comparisonChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Completed vs Rejected Products");
    
      // Etiquetas
      comparisonChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .text("Day");
    
      comparisonChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Number of Products");
    
      // Colores por categoría
      const color = d3.scaleOrdinal()
        .domain(["Completed", "Rejected"])
        .range(["steelblue", "#e15759"]);
    
      // Estructurar los datos para agrupado
      const groupedData = filteredData.map(d => ({
        run: d.run,
        values: [
          { key: "Completed", value: d.total_products },
          { key: "Rejected", value: d.total_rejected }
        ]
      }));
    
      // Dibujar las barras
      comparisonChart.selectAll(".group")
        .data(groupedData)
        .enter()
        .append("g")
        .attr("class", "group")
        .attr("transform", d => `translate(${x0(d.run)}, 0)`)
        .selectAll("rect")
        .data(d => d.values)
        .enter()
        .append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key))
        .attr("rx", 2);
    
      // Leyenda
      const legend = comparisonChart.append("g")
        .attr("transform", `translate(${width - 160}, 10)`);
    
      legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "steelblue");
    
      legend.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("alignment-baseline", "middle")
        .style("font-size", "12px")
        .text("Completed");
    
      legend.append("rect")
        .attr("x", 0)
        .attr("y", 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "#e15759");
    
      legend.append("text")
        .attr("x", 18)
        .attr("y", 30)
        .attr("alignment-baseline", "middle")
        .style("font-size", "12px")
        .text("Rejected");
    }

    function updateEfficiencyPerWorkstationChart(data) {
      efficiencyBarChart.selectAll("*").remove();
    
      efficiencyBarChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Overall Efficiency per Workstation");
    
      const efficiencyBarData = [];
    
      for (let i = 0; i < 6; i++) {
        const busyTime = d3.sum(data, d => (d[`ws${i}_occupancy`] / 100) * 5000);
        const downTime = d3.sum(data, d => d[`ws${i}_downtime`]);
        const eff = busyTime + downTime > 0 ? busyTime / (busyTime + downTime) : 0;
        efficiencyBarData.push({ workstation: `WS${i}`, efficiency: eff });
      }
    
      const xBarEff = d3.scaleLinear()
        .domain([0.9, 1])
        .range([0, width]);
    
      const yBarEff = d3.scaleBand()
        .domain(efficiencyBarData.map(d => d.workstation))
        .range([0, height])
        .padding(0.2);
    
      efficiencyBarChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yBarEff));
    
      efficiencyBarChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xBarEff).tickFormat(d3.format(".0%")));
    
      efficiencyBarChart.selectAll(".bar")
        .data(efficiencyBarData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => yBarEff(d.workstation))
        .attr("height", yBarEff.bandwidth())
        .attr("x", 0)
        .attr("width", d => xBarEff(d.efficiency))
        .attr("fill", "#F89880");
    
      efficiencyBarChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Efficiency (%)");
    }
    

    function updateEfficiencyChart(data) {
      efficiencyChart.selectAll("*").remove();
    
      // Chart Title
      efficiencyChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Monthly Efficiency");
    
      // Group into 12 months (approx. every 30 days)
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
    
      const grouped = [];
      for (let i = 0; i < 12; i++) {
        const start = i * 30;
        const group = data.slice(start, start + 30);
        const completed = d3.sum(group, d => d.total_products ?? 0);
        const rejected = d3.sum(group, d => d.total_rejected ?? 0);
        const efficiency = (completed + rejected) > 0 ? completed / (completed + rejected) : null;
        grouped.push({ month: months[i], efficiency });
      }
    
      // Scales - Modified y-axis domain
      const x = d3.scaleBand()
        .domain(months)
        .range([0, width])
        .padding(0.2);
    
      // Set y-axis from 0.94 to 0.96 (94% to 96%)
      const y = d3.scaleLinear()
        .domain([0.94, 0.96])  // Changed from [0.9, 1]
        .range([height, 0]);
    
      // Axes
      efficiencyChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
    
      // Custom y-axis with 0.2% (0.002) intervals
      efficiencyChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y)
          .tickValues(d3.range(0.94, 0.9601, 0.002))  // 94% to 96% in 0.2% steps
          .tickFormat(d3.format(".1%")));  // Format as percentage with 1 decimal
    
      // Axis Labels
      efficiencyChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Month");
    
      efficiencyChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Efficiency");
    
      // Bars
      efficiencyChart.selectAll(".bar")
        .data(grouped)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.month))
        .attr("y", d => y(d.efficiency))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.efficiency))
        .attr("fill", "#800080")
        .attr("rx", 3);
    
      // Percentage Labels
      efficiencyChart.selectAll(".eff-label")
        .data(grouped)
        .enter()
        .append("text")
        .attr("class", "eff-label")
        .attr("x", d => x(d.month) + x.bandwidth() / 2)
        .attr("y", d => y(d.efficiency) - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d.efficiency ? `${(d.efficiency * 100).toFixed(1)}%` : "");
    }
    

    function updateDowntimeChart(data) {
      downtimeChart.selectAll("*").remove();
    
      downtimeChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Average Downtime per Workstation");
    
      const avgDowntimes = [];
      for (let i = 0; i < 6; i++) {
        const mean = d3.mean(data.filter(d => !isNaN(d[`ws${i}_downtime`])), d => d[`ws${i}_downtime`]);
        avgDowntimes.push({ workstation: `WS${i}`, downtime: mean });
      }
    
      const xBar = d3.scaleBand()
        .domain(avgDowntimes.map(d => d.workstation))
        .range([0, width])
        .padding(0.2);
    
      const yBar = d3.scaleLinear()
        .domain([0, d3.max(avgDowntimes, d => d.downtime)])
        .range([height, 0]);
    
      downtimeChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xBar));
    
      downtimeChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yBar));
    
      downtimeChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Workstations");
    
      downtimeChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Downtime (units)");
    
      downtimeChart.selectAll(".bar")
        .data(avgDowntimes)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xBar(d.workstation))
        .attr("width", xBar.bandwidth())
        .attr("y", d => yBar(d.downtime))
        .attr("height", d => height - yBar(d.downtime))
        .attr("fill", "#ffc107");
    }
    
    
    function updateProductionChart(filteredData, range) {
      const xDomain = range === "daily" ? [1, 365] : d3.extent(filteredData, d => d.run);
      x.domain(xDomain);
      y.domain([1120, 1200]);

      const xAxis = d3.axisBottom(x).ticks(12).tickFormat(d3.format("d"));
      const yAxis = d3.axisLeft(y);

      xAxisGroup.transition().duration(750).call(xAxis);
      yAxisGroup.transition().duration(750).call(yAxis);

      const line = d3.line()
        .defined(d => d.total_products !== null)
        .x(d => x(d.run))
        .y(d => y(d.total_products))
        .curve(d3.curveMonotoneX);

      const path = chart.selectAll(".line-path")
        .data([filteredData]);

      path.enter()
        .append("path")
        .attr("class", "line-path")
        .merge(path)
        .transition()
        .duration(1000)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);
    }

    function updateOccupancyChart(data) {
      occupancyChart.selectAll("*").remove();

      occupancyChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Occupancy per Workstation");

      const avgOccupancies = [];
      for (let i = 0; i < 6; i++) {
        const mean = d3.mean(data.filter(d => !isNaN(d[`ws${i}_occupancy`])), d => d[`ws${i}_occupancy`]);
        avgOccupancies.push({ workstation: `WS${i}`, occupancy: mean });
      }

      const xBar = d3.scaleBand()
        .domain(avgOccupancies.map(d => d.workstation))
        .range([0, width])
        .padding(0.2);

      const yBar = d3.scaleLinear()
        .domain([40, 100])
        .range([height, 0]);

      occupancyChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xBar));

      occupancyChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yBar));

      occupancyChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Workstations");

      occupancyChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Occupancy (%)");

      occupancyChart.selectAll(".bar")
        .data(avgOccupancies)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xBar(d.workstation))
        .attr("width", xBar.bandwidth())
        .attr("y", d => yBar(d.occupancy))
        .attr("height", d => height - yBar(d.occupancy))
        .attr("fill", "#007bff");
    }

    function updateProdTimeChart(data) {
      prodTimeChart.selectAll("*").remove();

      prodTimeChart.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-family", "'Segoe UI', sans-serif")
        .style("font-size", "24px")
        .style("fill", "#007bff")
        .text("Average Production Time per Workstation");

      const workstationTimes = [];
      for (let i = 0; i < 6; i++) {
        const validData = data.filter(d => !isNaN(d[`ws${i}_occupancy`])).filter(d => d.total_products > 0);
        const avgTime = d3.mean(validData, d => {
          const totalTime = 5000;
          return ((d[`ws${i}_occupancy`] / 100) * totalTime) / d.total_products;
        });
        workstationTimes.push({ workstation: `WS${i}`, time: avgTime || 0 });
      }

      const xProdTime = d3.scaleBand()
        .domain(workstationTimes.map(d => d.workstation))
        .range([0, width])
        .padding(0.2);

      const yProdTime = d3.scaleLinear()
        .domain([0, d3.max(workstationTimes, d => d.time)])
        .nice()
        .range([height, 0]);

      prodTimeChart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xProdTime));

      prodTimeChart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yProdTime));

      prodTimeChart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Workstations");

      prodTimeChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Time per Product (minutes)");

      prodTimeChart.selectAll(".bar")
        .data(workstationTimes)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xProdTime(d.workstation))
        .attr("width", xProdTime.bandwidth())
        .attr("y", d => yProdTime(d.time))
        .attr("height", d => height - yProdTime(d.time))
        .attr("fill", "#28a745");
    }

    function redraw(range) {
      const newData = aggregateData(range);
      updateProductionChart(newData, range);
      updateOccupancyChart(data);
      updateProdTimeChart(data);
      updateDowntimeChart(data);
      updateEfficiencyChart(data);
      updateEfficiencyPerWorkstationChart(data);



      
    }

    // =============================================
    // 12. KPI PANEL CREATION
    // =============================================
    function renderKPIModal(data) {
      // Calculations
      const totalDays = data.length;
      const totalCompleted = d3.sum(data, d => d.total_products);
      const totalRejected = d3.sum(data, d => d.total_rejected);
      const avgDailyProduction = totalCompleted / totalDays;
      const rejectionRate = (totalRejected / (totalCompleted + totalRejected)) * 100;
    
      let maxDowntime = 0;
      let worstStation = "";
      for (let i = 0; i < 6; i++) {
        const avg = d3.mean(data, d => d[`ws${i}_downtime`]);
        if (avg > maxDowntime) {
          maxDowntime = avg;
          worstStation = `WS${i}`;
        }
      }
    
      const efficiency = (totalCompleted / (totalDays * 1200)) * 100;
    
      // Create overlay
      const overlay = d3.select("body")
        .append("div")
        .attr("id", "kpi-overlay")
        .style("display", "none");
    
      // Create modal container (centered)
      const modal = overlay.append("div")
        .attr("class", "kpi-modal");
    
      // Add close button (inside modal)
      modal.append("div")
        .attr("class", "kpi-close")
        .html("&times;")
        .on("click", () => overlay.style("display", "none"));
    
      // Add title (centered)
      modal.append("h3")
        .attr("class", "kpi-title")
        .text("Production KPIs");
    
      // Create KPI container (centered within modal)
      const kpiContainer = modal.append("div")
        .attr("class", "kpi-container");
    
      const kpis = [
        { title: "📦 Avg Daily Output", value: `${avgDailyProduction.toFixed(2)} units` },
        { title: "❌ Rejection Rate", value: `${rejectionRate.toFixed(2)}%` },
        { title: "🛠️ Most Downtime", value: worstStation },
        { title: "⚙️ Efficiency", value: `${efficiency.toFixed(2)}%` }
      ];
    
      // Add KPI boxes
      kpiContainer.selectAll("div.kpi-box")
        .data(kpis)
        .enter()
        .append("div")
        .attr("class", "kpi-box")
        .html(d => `<h4>${d.title}</h4><p>${d.value}</p>`);
    
      // Show KPI button
      d3.select("body")
        .append("button")
        .attr("id", "show-kpis-btn")
        .text("Show KPIs")
        .on("click", () => overlay.style("display", "flex"));
    }


    // =============================================
    // 13. CONTROLS AND INTERACTIONS
    // =============================================
    const buttonGroup = svgContainer.append("div")
      .style("position", "absolute")
      .style("top", "14%")
      .style("left", "32%");

    ["daily", "weekly", "monthly"].forEach(label => {
      buttonGroup.append("button")
        .text(label.charAt(0).toUpperCase() + label.slice(1))
        .attr("class", "btn btn-sm btn-outline-primary m-1")
        .on("click", () => {
          currentRange = label;
          redraw(label);
        });
    });

    // =============================================
    // 14. DARK MODE TOGGLE
    // =============================================
    const darkModeBtn = d3.select("body")
      .append("button")
      .attr("id", "dark-mode-btn")
      .style("position", "fixed")
      .style("bottom", "20px")
      .style("right", "20px")
      .style("width", "50px")
      .style("height", "50px")
      .style("border-radius", "50%")
      .style("font-size", "24px")
      .style("text-align", "center")
      .style("line-height", "50px")
      .style("background-color", "#343a40")
      .style("color", "#fff")
      .style("border", "none")
      .style("cursor", "pointer")
      .text("🌙");

    darkModeBtn.on("click", () => {
      const isDark = d3.select("body").classed("dark-mode");
      d3.select("body").classed("dark-mode", !isDark);
      darkModeBtn.text(isDark ? "🌙" : "☀️");
      redraw(currentRange);
    });

    // =============================================
    // 15. INITIAL RENDER
    // =============================================
    redraw(currentRange);
    renderKPIModal(data);
    initializeRejectionChart();
    initializeComparisonChart();
  });
});