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
  const svgContainer = d3.select("#chart-area")
    .style("position", "relative");

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
  // 6. DATA LOADING AND PROCESSING
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
    // 7. CHART UPDATE FUNCTIONS
    // =============================================
    function aggregateData(range) {
      if (range === "daily") return data;

      const groupSize = range === "weekly" ? 7 : 30;
      const grouped = [];
      for (let i = 0; i < data.length; i += groupSize) {
        const group = data.slice(i, i + groupSize);
        const avgProducts = d3.mean(group, d => d.total_products);
        const sumRejected = d3.sum(group, d => d.total_rejected);
        const avgFaultyRate = d3.mean(group, d => d.faulty_rate);
        const avgOccupancy = {};

        for (let j = 0; j < 6; j++) {
          avgOccupancy[`ws${j}_occupancy`] = d3.mean(group, d => d[`ws${j}_occupancy`]);
        }

        grouped.push({
          run: i / groupSize + 1,
          total_products: avgProducts,
          total_rejected: sumRejected,
          faulty_rate: avgFaultyRate,
          ...avgOccupancy
        });
      }
      return grouped;
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

    function updateRejectionChart(filteredData, range) {
      rejectionChart.selectAll("*").remove();
    
      // First filter out any invalid/accident data
      const validData = filteredData.filter(d => d.total_rejected !== "accident");
    
      // Create 25-unit intervals
      const intervalSize = 25;
      const minRun = d3.min(validData, d => d.run);
      const maxRun = d3.max(validData, d => d.run);
      
      // Generate all possible 25-unit intervals
      const intervals = [];
      for (let i = 25; i <= maxRun + intervalSize; i += intervalSize) {
        if (i >= minRun) {
          intervals.push({
            start: i - intervalSize + 1,
            end: i,
            run: i // Use the end point as the label
          });
        }
      }
    
      // Aggregate data into intervals
      const intervalData = intervals.map(interval => {
        const dataInRange = validData.filter(d => 
          d.run >= interval.start && d.run <= interval.end
        );
        
        return {
          run: interval.run,
          total_rejected: d3.sum(dataInRange, d => d.total_rejected),
          faulty_rate: d3.mean(dataInRange, d => d.faulty_rate),
          count: dataInRange.length
        };
      }).filter(d => d.count > 0); // Only show intervals with data
    
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
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Production Rejects");
    
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
        .text("Production Run Interval (25 units)");
    
      rejectionChart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Rejects");
    }

    function redraw(range) {
      const newData = aggregateData(range);
      updateProductionChart(newData, range);
      updateOccupancyChart(data);
      updateProdTimeChart(data);
      updateRejectionChart(newData);
    }

    // =============================================
    // 8. CONTROLS AND INTERACTIONS
    // =============================================
    const buttonGroup = svgContainer.append("div")
      .style("position", "absolute")
      .style("top", "20px")
      .style("right", "110px");

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
    // 9. DARK MODE TOGGLE
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
    // 10. INITIAL RENDER
    // =============================================
    redraw(currentRange);
  });
});