// Compact padding so the slice radius (r) is as large as possible inside the
// 700×700 logical canvas. Right padding is a bit larger because the arrow sits
// to the right of the wheel.
var padding = { top: 10, right: 25, bottom: 10, left: 5 },
  w = 700 - padding.left - padding.right,
  h = 700 - padding.top - padding.bottom,
  r = Math.min(w, h) / 2,
  rotation = 0,
  oldrotation = 0,
  picked = 100000,
  oldpick = localStorage.getItem("oldpick")
    ? JSON.parse(localStorage.getItem("oldpick"))
    : [],
  theme = localStorage.getItem("theme") || "dental",
  // Use a more professional color palette
  colorRange = [
    "#4285F4",
    "#EA4335",
    "#FBBC05",
    "#34A853", // Google colors
    "#5E35B1",
    "#1E88E5",
    "#039BE5",
    "#00ACC1",
    "#43A047",
    "#7CB342",
    "#C0CA33",
    "#FDD835",
    "#FFB300",
    "#FB8C00",
    "#F4511E",
    "#6D4C41",
    "#757575",
    "#546E7A",
    "#D81B60",
    "#8E24AA",
  ];

// Vegas roulette palette: green for index 0 (the house zero),
// then red/black alternating.
function getColor(i) {
  if (theme === "vegas") {
    if (i === 0) return "#127c2c";
    return i % 2 === 1 ? "#c8102e" : "#1a1a1a";
  }
  return colorRange[i % colorRange.length];
}

// Initial (unused) text color must contrast with the slice background:
// Vegas slices are dark, so white reads; Dental slices are bright, so black reads.
function getInitialTextColor() {
  return theme === "vegas" ? "#ffffff" : "black";
}

// Sync theme dropdown with the active theme so user sees the current selection.
document.getElementById("theme").value = theme;

var data = [];
if (localStorage.getItem("numberOfTables") !== null) {
  let numberOfTables = parseInt(localStorage.getItem("numberOfTables"));
  document.getElementById("numberOfTables").value = numberOfTables;
  for (let i = 0; i < numberOfTables; i++) {
    data.push({
      label: "Table " + (i + 1),
      value: i + 1,
      question: "Table " + (i + 1),
    });
  }

  // Filter out any previously selected tables that are now invalid (greater than current table count)
  if (oldpick.length > 0) {
    const validOldPick = oldpick.filter((index) => index < numberOfTables);
    if (validOldPick.length !== oldpick.length) {
      console.log(
        "Removed invalid table selections:",
        oldpick.length - validOldPick.length
      );
      oldpick = validOldPick;
      localStorage.setItem("oldpick", JSON.stringify(oldpick));
    }
  }
} else {
  // Default to 10 tables if no value is set
  const defaultTables = 10;
  localStorage.setItem("numberOfTables", defaultTables.toString());
  document.getElementById("numberOfTables").value = defaultTables;
  for (let i = 0; i < defaultTables; i++) {
    data.push({
      label: "Table " + (i + 1),
      value: i + 1,
      question: "Table " + (i + 1),
    });
  }
}

// Tight viewBox: hug the wheel background circle on three sides and extend just
// past the arrow tip on the right. Avoids the dead margin a 700×700 square box
// leaves around a wheel that doesn't fill it, so the rendered wheel is bigger.
var wheelCx = w / 2 + padding.left;
var wheelCy = h / 2 + padding.top;
var bgRadius = r + 5; // matches the wheel background circle below
var arrowTipX = w + padding.left + padding.right + 15; // matches arrow translate
var viewBoxX = wheelCx - bgRadius;
var viewBoxY = wheelCy - bgRadius;
var viewBoxWidth = arrowTipX - viewBoxX + 5;
var viewBoxHeight = bgRadius * 2;

var svg = d3
  .select("#chart")
  .append("svg")
  .data([data])
  .attr(
    "viewBox",
    viewBoxX + " " + viewBoxY + " " + viewBoxWidth + " " + viewBoxHeight
  )
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "100%")
  .style("max-width", "100%")
  .style("max-height", "100%")
  .style("overflow", "visible");

// Radial gradient used to "deactivate" picked slices in the Vegas theme:
// grey for the inner 85% of the radius, fading to gold at the outer rim.
// Defined in user-space coords so the gradient is centered at the wheel center.
var defs = svg.append("defs");
var usedGradient = defs
  .append("radialGradient")
  .attr("id", "used-gradient")
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("r", r)
  .attr("gradientUnits", "userSpaceOnUse");
usedGradient.append("stop").attr("offset", "0%").attr("stop-color", "#4a4a4a");
usedGradient.append("stop").attr("offset", "85%").attr("stop-color", "#4a4a4a");
usedGradient.append("stop").attr("offset", "100%").attr("stop-color", "#8c7530");

var container = svg
  .append("g")
  .attr("class", "chartholder")
  .attr(
    "transform",
    "translate(" + (w / 2 + padding.left) + "," + (h / 2 + padding.top) + ")"
  );

// Add a background circle
container
  .append("circle")
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("r", r + 5)
  .style("fill", theme === "vegas" ? "#0a0a0a" : "#f5f5f5")
  .style("stroke", theme === "vegas" ? "#d4af37" : "#e0e0e0")
  .style("stroke-width", theme === "vegas" ? "5px" : "3px");

var vis = container.append("g");

var pie = d3.layout
  .pie()
  .sort(null)
  .value(function (d) {
    return 1;
  });

// Declare an arc generator function with rounded corners
var arc = d3.svg.arc().outerRadius(r).innerRadius(0).padAngle(0.002); // Minimal padding between segments

// Select paths, use arc generator to draw
var arcs = vis
  .selectAll("g.slice")
  .data(pie)
  .enter()
  .append("g")
  .attr("class", "slice");

arcs
  .append("path")
  .attr("fill", function (d, i) {
    return getColor(i);
  })
  .attr("d", function (d) {
    return arc(d);
  })
  .style("stroke", "black")
  .style("stroke-width", "0.5px");

// Determine font size based on number of tables
var tableFontSize = data.length > 75 ? "12px" : "16px"; // 25% reduction for more than 75 tables

// Shared radial transform so the plaque rect and number text sit at the same
// point along each slice. Used by both the rect and text below.
function slicePlaqueTransform(d) {
  d.innerRadius = 0;
  d.outerRadius = r;
  d.angle = (d.startAngle + d.endAngle) / 2;
  return (
    "rotate(" +
    ((d.angle * 180) / Math.PI - 90) +
    ")translate(" +
    (d.outerRadius - 40) +
    ")"
  );
}

// Vegas theme: draw a roulette-table-style number plaque (white-outlined cell)
// behind each slice's number. Drawn before the text so the text renders on top.
if (theme === "vegas") {
  var plaqueWidth = data.length > 75 ? 22 : 32;
  var plaqueHeight = data.length > 75 ? 16 : 22;
  arcs
    .append("rect")
    .attr("class", "number-plaque")
    .attr("transform", slicePlaqueTransform)
    .attr("x", -plaqueWidth / 2)
    .attr("y", -plaqueHeight / 2)
    .attr("width", plaqueWidth)
    .attr("height", plaqueHeight)
    .attr("rx", 2)
    .style("fill", function (d, i) {
      return getColor(i);
    })
    .style("stroke", "#ffffff")
    .style("stroke-width", "1.5px");
}

// Add the text
arcs
  .append("text")
  .attr("transform", slicePlaqueTransform)
  .attr("text-anchor", "middle")
  .attr("alignment-baseline", "middle")
  .attr("dy", ".15em") // Adjust vertical position (1px from bottom)
  .style("font-size", tableFontSize) // Dynamic font size based on table count
  .style("fill", getInitialTextColor()) // Initial color depends on theme (dark slices need white text)
  .style("opacity", "1") // Explicitly set the initial text opacity
  .text(function (d, i) {
    // Vegas shows just the number, roulette-table style; dental keeps "Table N".
    return theme === "vegas" ? String(i + 1) : data[i].label;
  });

// Mark previously picked slices as used
oldpick.forEach(function (picked) {
  // Change the slice background. Vegas uses a lighter gray so it contrasts
  // against the unpicked black roulette slices.
  d3.select(".slice:nth-child(" + (picked + 1) + ") path")
    .attr("fill", theme === "vegas" ? "url(#used-gradient)" : "#1A1A1A")
    .style("opacity", "1");

  // Vegas: dim the roulette plaque so the picked tile reads as "used".
  if (theme === "vegas") {
    d3.select(".slice:nth-child(" + (picked + 1) + ") rect.number-plaque")
      .style("fill", "#3a3a3a")
      .style("stroke", "#d4af37");
  }

  // Change the text style for better visibility on dark background
  const textElement = d3
    .select(".slice:nth-child(" + (picked + 1) + ") text")
    .node();
  if (textElement) {
    // Use a brighter white with higher opacity
    textElement.style.fill = "#ffffff";
    textElement.style.opacity = "0.6";
    // Add a stronger glow effect
    textElement.style.filter =
      "drop-shadow(0px 0px 2px rgba(255, 255, 255, 0.9))";
    // Add stroke for better visibility
    textElement.style.stroke = "white";
    textElement.style.strokeWidth = "0.5px";
  }
});

// Function to update the history chips display
function updateHistoryChips() {
  const historyChipsContainer = document.getElementById("history-chips");
  historyChipsContainer.innerHTML = "";

  // Create a copy of the oldpick array to reverse without modifying the original
  const historyItems = [...oldpick].reverse();

  // Add chips for each selected table in reverse order (newest first)
  historyItems.forEach(function (pickedIndex, index) {
    // Skip any invalid indices
    if (pickedIndex >= data.length) {
      console.log("Skipping invalid table index:", pickedIndex);
      return;
    }

    const chip = document.createElement("div");
    chip.className = "history-chip";

    // Set the background color to match the wheel slice
    chip.style.backgroundColor = getColor(pickedIndex);

    // Add table label text
    const label = document.createElement("span");
    label.textContent = data[pickedIndex].label;
    chip.appendChild(label);

    // Add remove button (X)
    const removeBtn = document.createElement("span");
    removeBtn.className = "chip-remove";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("data-index", pickedIndex);
    removeBtn.setAttribute("title", "Remove this table from history");

    // Add click event to remove this table from history with confirmation
    removeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      // Show confirmation dialog before removing
      const confirmRemove = confirm(
        `Are you sure you want to remove ${data[pickedIndex].label} from the selection history?`
      );
      if (confirmRemove) {
        removeTableFromHistory(pickedIndex);
      }
    });

    chip.appendChild(removeBtn);
    historyChipsContainer.appendChild(chip);
  });
}

// Function to remove a table from history
function removeTableFromHistory(tableIndex) {
  // Skip if the index is invalid
  if (tableIndex >= data.length) {
    console.log("Cannot remove invalid table index:", tableIndex);
    return;
  }

  // Find the index in oldpick array (may be different from the table number)
  const indexInOldPick = oldpick.indexOf(tableIndex);

  if (indexInOldPick !== -1) {
    // Check if we're removing the most recently selected table BEFORE we modify the array
    const currentLastTable = oldpick[oldpick.length - 1];
    const wasLastTable = tableIndex === currentLastTable;
    console.log(
      "Removing table:",
      tableIndex + 1,
      "Was last selected:",
      wasLastTable
    );

    // Remove from oldpick array
    oldpick.splice(indexInOldPick, 1);

    // Save updated oldpick to localStorage
    localStorage.setItem("oldpick", JSON.stringify(oldpick));

    // Reset the color of the wheel slice for this table
    d3.select(".slice:nth-child(" + (tableIndex + 1) + ") path")
      .attr("fill", function () {
        return getColor(tableIndex);
      })
      .style("opacity", "1");

    // Vegas: restore the roulette plaque to its original cell color + white border.
    if (theme === "vegas") {
      d3.select(".slice:nth-child(" + (tableIndex + 1) + ") rect.number-plaque")
        .style("fill", getColor(tableIndex))
        .style("stroke", "#ffffff");
    }

    // Reset the text color and opacity - more direct styling approach
    const textElement = d3
      .select(".slice:nth-child(" + (tableIndex + 1) + ") text")
      .node();
    if (textElement) {
      textElement.style.fill = getInitialTextColor();
      textElement.style.opacity = "1";
      textElement.style.textShadow = "none"; // Remove any text shadow
      textElement.style.filter = "none"; // Remove filter
      textElement.style.stroke = "none"; // Remove stroke
      textElement.style.strokeWidth = "0"; // Reset stroke width
      console.log("Reset text style for slice:", tableIndex + 1);
    } else {
      console.log(
        "Text element not found when resetting slice:",
        tableIndex + 1
      );
    }

    // Update the history chips display
    updateHistoryChips();

    // Check if we need to re-enable the spin button
    // If all tables were previously selected but now one is available
    if (oldpick.length < data.length) {
      // Change button text back to "SPIN"
      d3.select(".spin-button").text("SPIN");
      // Re-attach the click handler to make the wheel spinnable again
      container.on("click", spin);
      console.log("Re-enabled spin button after table removal");
    }

    // If we removed the last selected table, update the question display
    if (oldpick.length > 0) {
      const lastPicked = oldpick[oldpick.length - 1];
      // Check if lastPicked is valid
      if (lastPicked < data.length) {
        // Update the question text
        d3.select("#question h1").text(data[lastPicked].question);

        // If we removed the most recent selection, rotate wheel to show the previous selection
        if (wasLastTable) {
          console.log(
            "Rotating wheel to show the previous selection:",
            data[lastPicked].label
          );
          // Calculate rotation to position the new last picked table at the arrow
          var ps = 360 / data.length;
          var newRotation = (data.length - lastPicked) * ps;

          // Add the arrow adjustment (same as in spin function)
          newRotation += 90 - Math.round(ps / 2);

          // Apply rotation to the wheel with a smooth transition
          vis
            .transition()
            .duration(1000)
            .attrTween("transform", function () {
              return function (t) {
                return (
                  "rotate(" + (t * newRotation + (1 - t) * oldrotation) + ")"
                );
              };
            })
            .each("end", function () {
              oldrotation = newRotation;
              // Save the new rotation
              localStorage.setItem("wheelRotation", newRotation);
            });

          console.log(
            "Rotated wheel to show previous selection:",
            data[lastPicked].label
          );
        }
      } else {
        d3.select("#question h1").text("");
      }
    } else {
      d3.select("#question h1").text("");
    }
  }
}

// Call this function on page load and after each spin
// Add after displaying the last selected table
if (oldpick.length > 0) {
  const lastPicked = oldpick[oldpick.length - 1];

  // Make sure lastPicked is valid before using it
  if (lastPicked < data.length) {
    d3.select("#question h1").text(data[lastPicked].question);

    // Calculate the current rotation needed based on table count
    var ps = 360 / data.length;
    var lastRotation;

    // Always calculate the correct rotation based on current table count
    lastRotation = (data.length - lastPicked) * ps; // Calculate angle needed to position the slice at the arrow

    // Add arrow adjustment as in spin function
    lastRotation += 90 - Math.round(ps / 2);

    // Update the saved rotation value with the recalculated one
    localStorage.setItem("wheelRotation", lastRotation);

    // Apply rotation to the wheel
    vis.attr("transform", "rotate(" + lastRotation + ")");
    oldrotation = lastRotation; // Save as the current rotation

    console.log("Restored wheel position to show table " + (lastPicked + 1));
  } else {
    d3.select("#question h1").text("");
    // Remove invalid last picked
    oldpick.pop();
    localStorage.setItem("oldpick", JSON.stringify(oldpick));
  }

  updateHistoryChips(); // Update history chips on page load
}

// Set initial click handler conditionally based on whether all tables are selected
if (oldpick.length === data.length) {
  console.log("All tables already selected on page load");
  // Change button text to "RESET"
  d3.select(".spin-button").text("RESET");
  // Set click handler to resetWheel
  container.on("click", resetWheel);
} else {
  // Normal case - tables are available to select
  container.on("click", spin);
}

function spin(d) {
  container.on("click", null);

  //all slices have been seen, all done
  console.log("OldPick: " + oldpick.length, "Data length: " + data.length);
  if (oldpick.length == data.length) {
    console.log("done");
    // Change button text to "RESET"
    d3.select(".spin-button").text("RESET");
    // Change cursor style to indicate it's clickable
    container.style("cursor", "pointer");
    // Change click handler to resetWheel instead of spin
    container.on("click", resetWheel);
    return;
  }

  // Find available indices that haven't been picked yet
  const availableIndices = [];
  for (let i = 0; i < data.length; i++) {
    if (oldpick.indexOf(i) === -1) {
      availableIndices.push(i);
    }
  }

  // Randomly select from available indices
  const randomIndex = Math.floor(Math.random() * availableIndices.length);
  picked = availableIndices[randomIndex];

  // Calculate rotation to land on the picked slice
  var ps = 360 / data.length;
  rotation = (data.length - picked) * ps + 360 * 3; // Multiple full rotations + landing position

  // Add to picked items
  oldpick.push(picked);
  localStorage.setItem("oldpick", JSON.stringify(oldpick));

  console.log(
    "Selected table:",
    picked + 1,
    "out of",
    availableIndices.length,
    "available tables"
  );

  rotation += 90 - Math.round(ps / 2);

  // Add a transition effect with easing for smoother spin
  vis
    .transition()
    .duration(3000)
    .attrTween("transform", rotTween)
    .ease("cubic-in-out") // Add easing function
    .each("end", function () {
      // Mark question as seen
      // Change the slice background. Vegas uses a lighter gray so it contrasts
      // against the unpicked black roulette slices.
      d3.select(".slice:nth-child(" + (picked + 1) + ") path")
        .attr("fill", theme === "vegas" ? "url(#used-gradient)" : "#1A1A1A")
        .style("opacity", "1");

      // Vegas: dim the roulette plaque so the picked tile reads as "used".
      if (theme === "vegas") {
        d3.select(".slice:nth-child(" + (picked + 1) + ") rect.number-plaque")
          .style("fill", "#3a3a3a")
          .style("stroke", "#d4af37");
      }

      // Change the text style for better visibility on dark background
      const textElement = d3
        .select(".slice:nth-child(" + (picked + 1) + ") text")
        .node();
      if (textElement) {
        // Use a brighter white with higher opacity
        textElement.style.fill = "#ffffff";
        textElement.style.opacity = "0.6";
        // Add a stronger glow effect
        textElement.style.filter =
          "drop-shadow(0px 0px 2px rgba(255, 255, 255, 0.9))";
        // Add stroke for better visibility
        textElement.style.stroke = "white";
        textElement.style.strokeWidth = "0.5px";
        console.log("Updated text style for picked slice:", picked + 1);
      } else {
        console.log("Text element not found for slice:", picked + 1);
      }

      // Populate question with a fade effect
      d3.select("#question h1")
        .style("opacity", 0)
        .text(data[picked].question)
        .transition()
        .duration(500)
        .style("opacity", 1);

      oldrotation = rotation;

      // Save the final rotation position in localStorage
      localStorage.setItem("wheelRotation", rotation);

      // Get the result value from object "data"
      console.log(data[picked].value);

      // Update history chips
      updateHistoryChips();

      // Check if this was the last available table
      if (oldpick.length === data.length) {
        console.log("All tables now selected, changing button to RESET");
        // Change button text to "RESET"
        d3.select(".spin-button").text("RESET");
        // Change click handler to resetWheel
        container.on("click", resetWheel);
      } else {
        // Allow spinning again
        container.on("click", spin);
      }
    });
}

// Make arrow
svg
  .append("g")
  .attr(
    "transform",
    "translate(" +
      (w + padding.left + padding.right + 15) + // Move 15px further to the right
      "," +
      (h / 2 + padding.top) +
      ")"
  )
  .append("path")
  .attr("d", "M-" + r * 0.2 + ",0L0," + r * 0.1 + "L0,-" + r * 0.1 + "Z")
  .style({
    fill: "#333",
    stroke: "#ffcc00", // Yellow outline
    strokeWidth: "2px",
    filter: "drop-shadow(0px 0px 4px rgba(255, 204, 0, 0.6))", // Yellow glow
  });

// Draw spin circle
container
  .append("circle")
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("r", 60)
  .attr("class", "spinner-circle")
  .style({
    cursor: "pointer",
    filter: "drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))",
  });

// Spin text
container
  .append("text")
  .attr("x", 0)
  .attr("y", 8)
  .attr("text-anchor", "middle")
  .attr("class", "spin-button")
  .text("SPIN")
  .style({
    "font-size": "24px",
  });

function rotTween(to) {
  var i = d3.interpolate(oldrotation % 360, rotation);
  return function (t) {
    return "rotate(" + i(t) + ")";
  };
}

function getRandomNumbers() {
  var array = new Uint16Array(1000);
  var scale = d3.scale.linear().range([360, 1440]).domain([0, 100000]);
  if (
    window.hasOwnProperty("crypto") &&
    typeof window.crypto.getRandomValues === "function"
  ) {
    window.crypto.getRandomValues(array);
    console.log("works");
  } else {
    //no support for crypto, get crappy random numbers
    for (var i = 0; i < 1000; i++) {
      array[i] = Math.floor(Math.random() * 100000) + 1;
    }
  }
  return array;
}

function setTableCount() {
  const input = document.getElementById("numberOfTables").value;
  const numberOfTables = parseInt(input) || 10; // Default to 10 if input is empty or NaN
  if (numberOfTables < 1) {
    alert("Please enter a number greater than 0");
    return;
  }
  if (numberOfTables > 200) {
    alert("Maximum number of tables is 200");
    return;
  }
  localStorage.setItem("numberOfTables", numberOfTables.toString());
  location.reload();
}

function setTheme(value) {
  if (value !== "dental" && value !== "vegas") return;
  localStorage.setItem("theme", value);
  location.reload();
}

function resetWheel() {
  // Show confirmation dialog before resetting
  const confirmReset = confirm(
    "Are you sure you want to reset the wheel? This will clear all selected tables."
  );

  if (confirmReset) {
    // Store the current number of tables before clearing
    const currentTableCount = localStorage.getItem("numberOfTables") || "10";
    localStorage.removeItem("oldpick");
    localStorage.setItem("numberOfTables", currentTableCount);
    location.reload();
  }
}

// Toggle accordion for advanced settings
function toggleAccordion() {
  const btn = document.querySelector(".accordion-btn");
  const content = document.querySelector(".accordion-content");

  btn.classList.toggle("active");

  if (content.classList.contains("show")) {
    // Closing the accordion
    content.style.maxHeight = "0px";
    setTimeout(() => {
      content.classList.remove("show");
    }, 300);
  } else {
    // Opening the accordion - set explicit height based on content
    content.classList.add("show");
    content.style.maxHeight = content.scrollHeight + "px";
  }
}

// Initialize accordion state on page load
window.addEventListener("load", function () {
  const accordionContent = document.querySelector(".accordion-content");
  // Start with accordion closed
  accordionContent.style.maxHeight = "0px";

  // Make sure the button text is correct on page load
  // This must run after all DOM elements are loaded
  if (oldpick.length === data.length) {
    console.log("All tables already selected - ensuring button says RESET");
    // Change button text to "RESET"
    d3.select(".spin-button").text("RESET");
  }
});
