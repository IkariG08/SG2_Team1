document.addEventListener("DOMContentLoaded", function () {
  // Set up dimensions and margins
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  // Create SVG container
  const svgContainer = d3.select("#chart-area")
    .style("position", "relative");

  const svg = svgContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  // Create chart group
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Add title
  const title = chart.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-family", "'Segoe UI', sans-serif")
    .style("font-size", "24px")
    .style("fill", "#007bff")
    .text("Dashboard for Manufacturing Facility");

  // Set up scales
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  // Create axis groups with 'axis' class for styling
  const xAxisGroup = chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`);

  const yAxisGroup = chart.append("g")
    .attr("class", "axis");

  // Add axis labels
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

  let currentRange = "daily";

  // Load and process data
  d3.csv("data/simulation_data.csv").then(function (data) {
    data.forEach(d => {
      d.run = +d.Run;
      d.total_products = isNaN(+d.TotalCompleted) ? null : +d.TotalCompleted;
    });

    // Data aggregation function
    function aggregateData(range) {
      if (range === "daily") return data;

      const groupSize = range === "weekly" ? 7 : 30;
      const grouped = [];
      for (let i = 0; i < data.length; i += groupSize) {
        const group = data.slice(i, i + groupSize);
        const avgProducts = d3.mean(group, d => d.total_products);
        grouped.push({ run: i / groupSize + 1, total_products: avgProducts });
      }
      return grouped;
    }

    // Update chart function
    function update(filteredData, range) {
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

    // Redraw function
    function redraw(range) {
      const newData = aggregateData(range);
      update(newData, range);
    }

    // Initial draw
    redraw(currentRange);

    // Create range selector buttons
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

    // Create dark mode toggle button
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

    // Dark mode toggle handler
    darkModeBtn.on("click", () => {
      const isDark = d3.select("body").classed("dark-mode");
      d3.select("body").classed("dark-mode", !isDark);
      darkModeBtn.text(isDark ? "🌙" : "☀️");
      
      // Redraw to update axis colors
      redraw(currentRange);
    });
  });
});