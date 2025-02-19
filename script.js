// ✅ Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoicGF0d2QwNSIsImEiOiJjbTZ2bGVhajIwMTlvMnFwc2owa3BxZHRoIn0.moDNfqMUolnHphdwsIF87w';

// ✅ Include Turf.js
const turf = window.turf || {};
if (!turf.point) {
    const turfScript = document.createElement('script');
    turfScript.src = "https://unpkg.com/@turf/turf@6/turf.min.js";
    turfScript.onload = () => console.log("Turf.js loaded successfully.");
    document.head.appendChild(turfScript);
}
// ✅ Initialize Map
const map = new mapboxgl.Map({
    container: 'map',
    style:'mapbox://styles/mapbox/satellite-streets-v12',
    center: [-84.46,39.37],
    zoom: 14
  });
  
  // ✅ Add Map Controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl());
  map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
  }));
  
  // ✅ Global Variables
  let analysisMode = "polygon"; // Default mode
  let isDrawing = false;
  let drawnPolygon = null;
  
  // ✅ Event listener to switch analysis mode (Isochrone vs. Polygon)
  document.querySelectorAll('input[name="analysis-mode"]').forEach(input => {
    input.addEventListener('change', (event) => {
        analysisMode = event.target.value;
        console.log("Analysis mode switched to:", analysisMode);

        if (analysisMode === "isochrone") {
            clearPolygon();  // Remove drawn polygons when switching to isochrone mode
        } else if (analysisMode === "polygon") {
            console.log("Switching to polygon mode. Clearing any existing isochrone...");
            clearIsochrone(); // Ensure the isochrone is removed when switching to polygon mode
        }
    });
});
  

// ✅ Add Event Listener for Mode Selection
document.querySelectorAll('.isochrone-button').forEach(button => {
    button.addEventListener('click', () => {
        if (analysisMode !== "isochrone") return; // Prevent use if in polygon mode

        document.querySelectorAll('.isochrone-button').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedDistance = parseInt(button.id.split('-')[1]);
    });

});
// ✅ Load LakotaSchools.geojson
let lakotaSchoolsData = [];

fetch('LakotaSchools.geojson')
    .then(response => response.json())
    .then(lakotaGeojson => {
        if (!lakotaGeojson || !lakotaGeojson.features) {
            console.error("Invalid LakotaSchools GeoJSON data");
            return;
        }

        lakotaSchoolsData = lakotaGeojson.features;

        // ✅ Populate Dropdown
        const dropdown = document.getElementById('schoolDropdown');
        lakotaSchoolsData.forEach(feature => {
            const schoolName = feature.properties['School Name'];
            if (schoolName) {
                const option = document.createElement('option');
                option.value = schoolName;
                option.textContent = schoolName;
                dropdown.appendChild(option);
            }
        });

        console.log("LakotaSchools.geojson loaded successfully.");
    })
    .catch(error => console.error('Error loading LakotaSchools.geojson:', error));

// ✅ Zoom to Selected School
function zoomToSchool() {
    const selectedSchool = document.getElementById('schoolDropdown').value;
    console.log("Selected school:", selectedSchool);

    if (!lakotaSchoolsData || lakotaSchoolsData.length === 0) {
        console.error("No school data available.");
        return;
    }

    const schoolFeature = lakotaSchoolsData.find(
        feature => feature.properties['School Name'].trim() === selectedSchool.trim()
    );

    if (schoolFeature) {
        const coordinates = [
            parseFloat(schoolFeature.geometry.coordinates[0]),
            parseFloat(schoolFeature.geometry.coordinates[1])
        ];

        console.log("Setting center to coordinates:", coordinates);

        map.setCenter(coordinates);
        map.setZoom(14);
    } else {
        console.warn("Selected school not found in GeoJSON data.");
    }
}



  map.on('load', () => {

    // Add Parcel Tileset Source
    map.addSource('Heritage-tileset', {
        type: 'raster',  // 🔄 Change from "vector" to "raster"
        url: 'mapbox://patwd05.4q42tzqh', // ✅ Your correct tileset ID
        tileSize: 256 // Adjust based on your tileset resolution
    });
    
    map.addLayer({
        id: 'Heritage-layer',
        type: 'raster',  // 🔄 Change from "fill" to "raster"
        source: 'Heritage-tileset',
        paint: {
            'raster-opacity': 1 // Adjust opacity if needed
        }
    });
    // ✅ Load and display LakotaSchools.geojson
// ✅ Global variable for storing school data
let lakotaSchoolsData = [];

// ✅ Load and display LakotaSchools.geojson
fetch('LakotaSchools.geojson')
    .then(response => response.json())
    .then(lakotaGeojson => {
        if (!lakotaGeojson || !lakotaGeojson.features) {
            console.error("Invalid LakotaSchools GeoJSON data");
            return;
        }

        // ✅ Store the school data globally for dropdown use
        lakotaSchoolsData = lakotaGeojson.features;

        // ✅ Populate the dropdown
        const dropdown = document.getElementById('schoolDropdown');
        lakotaSchoolsData.forEach(feature => {
            const schoolName = feature.properties['School Name'];
            if (schoolName) {
                const option = document.createElement('option');
                option.value = schoolName;
                option.textContent = schoolName;
                dropdown.appendChild(option);
            }
        });

        // ✅ Add Lakota Schools Source
        map.addSource('lakota-schools', {
            type: 'geojson',
            data: lakotaGeojson
        });

        // ✅ Add Lakota Schools Layer (Points)
        map.addLayer({
            id: 'lakota-schools-layer',
            type: 'circle',
            source: 'lakota-schools',
            paint: {
                'circle-radius': 8,
                'circle-color': '#1E90FF',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
            }
        });

        // ✅ Display School Name on Hover
        let popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

        map.on('mouseenter', 'lakota-schools-layer', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const coordinates = e.features[0].geometry.coordinates.slice();
            const schoolName = e.features[0].properties['School Name'] || "School";
            popup.setLngLat(coordinates).setHTML(`<strong>${schoolName}</strong>`).addTo(map);
        });

        map.on('mouseleave', 'lakota-schools-layer', () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
        });

        console.log("LakotaSchools.geojson loaded successfully.");
    })
    .catch(error => console.error('Error loading LakotaSchools.geojson:', error))


    // ✅ Load and Convert Test.geojson Polygons to Centroid Points
fetch('Test.geojson')
.then(response => response.json())
.then(testGeojson => {
    if (!testGeojson || !testGeojson.features) {
        console.error("Invalid GeoJSON data");
        return;
    }

    // Convert polygons to centroid points
    const centroidGeojson = {
        type: "FeatureCollection",
        features: testGeojson.features.map(feature => {
            if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
                const centroid = turf.centroid(feature);
                return {
                    type: "Feature",
                    geometry: centroid.geometry,
                    properties: feature.properties // Keep original properties
                };
            }
            return feature; // Keep non-polygon features as they are
        })
    };

    // ✅ Add centroids to map
    map.addSource('test-centroids', {
        type: 'geojson',
        data: centroidGeojson
    });

    map.addLayer({
        id: 'test-centroids-layer',
        type: 'circle', // Use circle for points
        source: 'test-centroids',
        paint: {
            'circle-radius': 0, // Adjust size
            'circle-color': '#ff6600', // Orange color
            'circle-stroke-width': 0,
            'circle-stroke-color': '#ffffff' // White stroke for visibility
        }
    }, 'Heritage-layer'); // Ensure it's below Heritage-layer
})
.catch(error => console.error('Error loading Test.geojson:', error));

});

// ✅ Helper Functions to Re-add Layers After Style Change
function addHeritageLayer() {
    if (!map.getSource('Heritage-tileset')) {
        map.addSource('Heritage-tileset', {
            type: 'raster',
            url: 'mapbox://patwd05.4q42tzqh',
            tileSize: 256
        });

        map.addLayer({
            id: 'Heritage-layer',
            type: 'raster',
            source: 'Heritage-tileset',
            paint: { 'raster-opacity': 1 }
        });
    }
}

function addTestCentroidLayer() {
    if (!map.getSource('test-centroids')) return;

    map.addLayer({
        id: 'test-centroids-layer',
        type: 'circle',
        source: 'test-centroids',
        paint: {
            'circle-radius': 6,
            'circle-color': '#ff6600',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });
}

function addIsochroneLayer() {
    if (map.getSource('isochrone')) {
        map.addLayer({
            id: 'isochrone-layer',
            type: 'fill',
            source: 'isochrone',
            paint: {
                'fill-color': '#007cbf',
                'fill-opacity': 0.5
            }
        });
    }
}

function addPolygonLayer() {
    if (map.getSource('drawn-polygon')) {
        map.addLayer({
            id: 'drawn-polygon-layer',
            type: 'fill',
            source: 'drawn-polygon',
            paint: {
                'fill-color': '#FF5733',
                'fill-opacity': 0.5
            }
        });
    }
}

// ✅ Basemap Toggle – Now Re-adds Layers After Switching Styles
document.querySelectorAll('input[name="basemap"]').forEach(input => {
    input.addEventListener('change', (event) => {
        const style = event.target.value === 'satellite' 
            ? 'mapbox://styles/mapbox/satellite-streets-v11' 
            : 'mapbox://styles/mapbox/light-v11';

        map.setStyle(style);

        // ✅ Re-add layers after style reloads
        map.once('style.load', () => {
            addHeritageLayer();
            addTestCentroidLayer();
            addIsochroneLayer();
            addPolygonLayer();

            // ✅ Re-attach event listeners for isochrone and polygon updates
            map.on("dblclick", () => {
                if (analysisMode === "isochrone") {
                    summarizePopulation();  // Ensure isochrone updates the charts
                }
            });

            map.on("contextmenu", () => {
                if (analysisMode === "polygon") {
                    summarizePopulation();  // Ensure polygon updates the charts
                }
            });

            document.getElementById("clear-polygon").addEventListener("click", () => {
                summarizePopulation();  // Ensure clearing the polygon resets charts
            });

            console.log("Chart update events re-attached after style change.");
        });
    });
});

// ✅ Global Variables
let selectedDistance = 1600; // Default 1 mi (1600m)

// ✅ Event Listener for Isochrone Buttons
document.querySelectorAll('.isochrone-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.isochrone-button').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        // ✅ Set distance based on button clicked
        selectedDistance = parseInt(button.id.split('-')[1]); // Extract 1600, 3200, or 8000
    });
});

// ✅ Mapbox Isochrone API Token
const mapboxIsochroneToken = 'pk.eyJ1IjoicGF0d2QwNSIsImEiOiJjbTZ2bGVhajIwMTlvMnFwc2owa3BxZHRoIn0.moDNfqMUolnHphdwsIF87w'; // Use your existing token

// ✅ Function to Fetch Walk Isochrone Based on Distance (Meters)
async function fetchIsochrone(center) {
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving/${center[0]},${center[1]}?contours_meters=${selectedDistance}&polygons=true&access_token=${mapboxIsochroneToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data || !data.features) {
            console.error("Invalid Isochrone Data");
            return;
        }

        // ✅ Remove old isochrone if it exists
        if (map.getSource('isochrone')) {
            map.getSource('isochrone').setData(data);
        } else {
            map.addSource('isochrone', {
                type: 'geojson',
                data: data
            });

            map.addLayer({
                id: 'isochrone-layer',
                type: 'fill',
                source: 'isochrone',
                paint: {
                    'fill-color': '#007cbf',
                    'fill-opacity': 0.3
                }
            });
        }

        // ✅ Call summarizePopulation after generating the isochrone
        summarizePopulation();
    } catch (error) {
        console.error("Error fetching isochrone:", error);
    }
}
// ✅ Ensure population data is updated when a polygon is completed
map.on("contextmenu", () => {
    if (analysisMode === "polygon") {
        summarizePopulation();  // Updates filtered points and recalculates the dataset
    }
});

// ✅ Ensure population data is updated when an isochrone is generated
map.on("dblclick", () => {
    if (analysisMode === "isochrone") {
        summarizePopulation();  // Triggers recalculation based on the isochrone
    }
});

// ✅ Ensure population data is reset when clearing the polygon
document.getElementById("clear-polygon").addEventListener("click", () => {
    summarizePopulation();  // Resets the data when clearing a polygon
});

// ✅ Keep isochrone generation on double-click
map.on('dblclick', (event) => {
    if (analysisMode === "isochrone") {
        const center = [event.lngLat.lng, event.lngLat.lat];
        fetchIsochrone(center);
    }
});

// ✅ Start polygon drawing on a single click
map.on('click', (event) => {
    if (analysisMode === "polygon" && !isDrawing) {
        startDrawingPolygon();
    }
});


// ✅ Polygon Drawing

function startDrawingPolygon() {
    if (!isDrawing) {
        isDrawing = true;
        drawnPolygon = {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[]] },
            properties: {}
        };

        console.log("Polygon drawing started! Click to add points, right-click to finish.");

        map.on('click', addPolygonPoint);  // ✅ Listen for single clicks
        map.on('contextmenu', completePolygon);
    }
}


function addPolygonPoint(event) {
    if (drawnPolygon) {
        const newPoint = [event.lngLat.lng, event.lngLat.lat];
        drawnPolygon.geometry.coordinates[0].push(newPoint);

        console.log("Point added:", newPoint);

        // ✅ Add a visible point marker on each click
        map.addLayer({
            id: `point-${drawnPolygon.geometry.coordinates[0].length}`,
            type: 'circle',
            source: {
                type: 'geojson',
                data: {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: newPoint }
                }
            },
            paint: {
                'circle-radius': 6,  // 🔴 Make point bigger
                'circle-color': '#FF0000',  // 🔴 Red color
                'circle-stroke-width': 1,
                'circle-stroke-color': '#FFFFFF'
            }
        });

        if (map.getSource('drawn-polygon')) {
            map.getSource('drawn-polygon').setData(drawnPolygon);
        } else {
            console.log("Adding new polygon source");
            map.addSource('drawn-polygon', { type: "geojson", data: drawnPolygon });
            map.addLayer({
                id: 'drawn-polygon-layer',
                type: 'fill',
                source: 'drawn-polygon',
                paint: { 'fill-color': '#FF5733', 'fill-opacity': 0.3 }
            });
        }
    }
}

function completePolygon(event) {
    map.off('click', addPolygonPoint);
    map.off('contextmenu', completePolygon);

    if (drawnPolygon.geometry.coordinates[0].length > 2) {
        drawnPolygon.geometry.coordinates[0].push(drawnPolygon.geometry.coordinates[0][0]); // Close the polygon
        map.getSource('drawn-polygon').setData(drawnPolygon);
    }

    isDrawing = false;
}

function resetDrawingMode() {
    if (drawnPolygon && map.getSource('drawn-polygon')) {
        map.removeLayer('drawn-polygon-layer');
        map.removeSource('drawn-polygon');
    }
    drawnPolygon = null;
    isDrawing = false;
    map.off('click', addPolygonPoint);
    map.off('contextmenu', completePolygon);
}
   // ✅ Remove polygons

   function clearPolygon() {
    // ✅ Remove polygon layer if it exists
    if (map.getSource('drawn-polygon')) {
        map.removeLayer('drawn-polygon-layer');
        map.removeSource('drawn-polygon');
    }

    // ✅ Remove all point markers
    if (drawnPolygon && drawnPolygon.geometry.coordinates[0].length > 0) {
        drawnPolygon.geometry.coordinates[0].forEach((_, index) => {
            const pointLayerId = `point-${index + 1}`;
            if (map.getLayer(pointLayerId)) {
                map.removeLayer(pointLayerId);
                map.removeSource(pointLayerId);
            }
        });
    }

    // ✅ Reset drawing state properly
    drawnPolygon = null;
    isDrawing = false;

    // ✅ Re-enable event listeners so a new polygon can be created
    map.off('click', addPolygonPoint);
    map.off('contextmenu', completePolygon);

    console.log("Polygon cleared and ready for new drawing.");
}

function clearPolygon() {
    if (map.getLayer('drawn-polygon-layer')) {
        map.removeLayer('drawn-polygon-layer');
    }
    if (map.getSource('drawn-polygon')) {
        map.removeSource('drawn-polygon');
    }

    // Remove all point markers associated with the polygon
    if (drawnPolygon && drawnPolygon.geometry.coordinates[0].length > 0) {
        drawnPolygon.geometry.coordinates[0].forEach((_, index) => {
            const pointLayerId = `point-${index + 1}`;
            if (map.getLayer(pointLayerId)) {
                map.removeLayer(pointLayerId);
            }
            if (map.getSource(pointLayerId)) {
                map.removeSource(pointLayerId);
            }
        });
    }

    // Reset drawing state
    drawnPolygon = null;
    isDrawing = false;

    console.log("Polygon cleared.");
}

function clearIsochrone() {
    if (map.getLayer('isochrone-layer')) {
        map.removeLayer('isochrone-layer');
    }
    if (map.getSource('isochrone')) {
        map.removeSource('isochrone');
    }

    console.log("Isochrone cleared.");
}

document.getElementById('clear-polygon').addEventListener('click', () => {
    clearPolygon();
});

 // Sum in shape
 // Load Chart.js if not already included
const chartScript = document.createElement('script');
chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
document.head.appendChild(chartScript);

let filteredCentroids = []; // Store points inside the polygon or isochrone

function summarizePopulation() {
    if (!map.getSource('test-centroids')) {
        console.error("Centroids data source not found.");
        return;
    }

    const centroidData = map.getSource('test-centroids')._data;
    let totalPopulation = 0;
    let racePopulation = {
        "White": 0, "Black": 0, "Native American": 0,
        "Asian": 0, "Hispanic/Latino": 0,
        "Other": 0, "Two or More Races": 0
    };

    filteredCentroids = []; // Reset before refilling

    let selectedArea = analysisMode === "polygon" ? drawnPolygon : map.getSource('isochrone')?._data;

    if (!selectedArea) {
        console.error("No valid area selected.");
        return;
    }

    centroidData.features.forEach(feature => {
        let isInside = false;
        if (analysisMode === "polygon") {
            isInside = turf.booleanPointInPolygon(feature, selectedArea);
        } else if (analysisMode === "isochrone") {
            for (let isoFeature of selectedArea.features) {
                if (turf.booleanPointInPolygon(feature, isoFeature)) {
                    isInside = true;
                    break;
                }
            }
        }

        if (isInside) {
            let pop = feature.properties["Total_Pop"] || 0;
            totalPopulation += pop;
            racePopulation["White"] += feature.properties["White_Pop"] || 0;
            racePopulation["Black"] += feature.properties["Black_Pop"] || 0;
            racePopulation["Native American"] += feature.properties["NA_Pop"] || 0;
            racePopulation["Asian"] += feature.properties["Asian_Pop"] || 0;
            racePopulation["Hispanic/Latino"] += feature.properties["HI_Pop"] || 0;
            racePopulation["Other"] += feature.properties["Other_Pop"] || 0;
            racePopulation["Two or More Races"] += feature.properties["TwoMore_Pop"] || 0;

            filteredCentroids.push(feature); // Store the filtered points for reuse
        }

        // ✅ Ensure `summarizePopulation()` updates before displaying the chart
        function updatePopulationData() {
            summarizePopulation();
        }
    });

    displayPopulationSummary(totalPopulation, racePopulation);

    // ✅ Ensure the chart updates *only* after filtering is done
    setTimeout(displayPolarChart, 500);  // Allow a slight delay for data updates
}

function generateDirectionPopulationData() {
    if (!filteredCentroids.length) {
        console.warn("No filtered centroids available for direction processing.");
        return Array(8).fill(0);  // Return empty values for chart
    }

    let directionTotals = { "N": 0, "NE": 0, "E": 0, "SE": 0, "S": 0, "SW": 0, "W": 0, "NW": 0 };

    let center = null;
    if (analysisMode === "polygon" && drawnPolygon) {
        center = turf.centroid(drawnPolygon).geometry.coordinates;
    } else if (analysisMode === "isochrone" && map.getSource('isochrone')) {
        let selectedArea = map.getSource('isochrone')._data;
        if (selectedArea && selectedArea.features.length > 0) {
            center = turf.centroid(selectedArea.features[0]).geometry.coordinates;
        }
    }

    if (!center) {
        console.error("No valid center found for direction calculations.");
        return Array(8).fill(0);
    }

    filteredCentroids.forEach(feature => {
        let coords = feature.geometry.coordinates;
        let pop = feature.properties["Total_Pop"] || 0;
        let direction = getDirectionFromCoords(center, coords);
        if (directionTotals.hasOwnProperty(direction)) {
            directionTotals[direction] += pop;
        }
    });

    return Object.values(directionTotals);

   // ✅ Ensure only filtered centroids are processed
   filteredCentroids.forEach(feature => {
    let coords = feature.geometry.coordinates;
    let pop = feature.properties["Total_Pop"] || 0;
    let direction = getDirectionFromCoords(center, coords);
    if (directionTotals.hasOwnProperty(direction)) {
        directionTotals[direction] += pop;
    }
});

return Object.values(directionTotals);
}


// Display the Total Population and a Bar Chart of Race Breakdown
// ✅ Function to determine the direction based on coordinates

function getDirectionFromCoords(center, point) {
    let dx = point[0] - center[0]; // Longitude difference
    let dy = point[1] - center[1]; // Latitude difference
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert radians to degrees
    if (angle < 0) angle += 360;  // Normalize to [0, 360]
    
    // Shift the angle so that 0° corresponds to North instead of East
    angle = (angle + 90) % 360;
    

    // Convert angle to compass direction (ensuring North is at 0°)
    if (angle < 0) angle += 360; // Normalize angle to [0, 360]

    if (angle >= 337.5 || angle < 22.5) return "N";
    if (angle >= 22.5 && angle < 67.5) return "NE";
    if (angle >= 67.5 && angle < 112.5) return "E";
    if (angle >= 112.5 && angle < 157.5) return "SE";
    if (angle >= 157.5 && angle < 202.5) return "S";
    if (angle >= 202.5 && angle < 247.5) return "SW";
    if (angle >= 247.5 && angle < 292.5) return "W";
    if (angle >= 292.5 && angle < 337.5) return "NW";

    return "N"; // Default fallback
}


// ✅ Ensure `summarizePopulation()` updates before displaying the chart
function updatePopulationData() {
    summarizePopulation();
}

// ✅ Function to display population summary (Place this **AFTER** generateDirectionPopulationData)
function displayPopulationSummary(totalPopulation, racePopulation) {
    const panel = document.getElementById("student-info-panel");
panel.innerHTML = `
        <div id="populationchart-container" style="display:block;">
            <h4>Population by Race (${totalPopulation})</h4> 
            <canvas id="populationChart"></canvas>
        </div>

        <div id="polarchart-container" style="display:none;">
            <h4>Population by Direction (${totalPopulation})</h4> 
            <canvas id="polarChart"></canvas>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('populationChart').getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(racePopulation),
                datasets: [{
                    label: 'Population by Race',
                    data: Object.values(racePopulation),
                    backgroundColor: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1'],
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }, 500);
}


function displayPolarChart() {
    const directionData = generateDirectionPopulationData();

    if (!directionData.some(val => val > 0)) {
        console.log("No valid data for the polar chart. Keeping it hidden.");
        return;
    }

    // Make sure the polar chart container is visible
    document.getElementById("populationchart-container").style.display = "none";
    document.getElementById("polarchart-container").style.display = "block";

    const existingChart = Chart.getChart("polarChart");
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = document.getElementById('polarChart').getContext('2d');

    new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
            datasets: [{
                label: 'Population by Direction',
                data: directionData,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#32CD32'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#000',
                    font: { weight: 'bold', size: 8 },
                    align: 'end',
                    formatter: (value, context) => context.chart.data.labels[context.dataIndex]
                }
            },
            scales: { r: { startAngle: -22.5 } }
        },
        plugins: [ChartDataLabels]
    });
}


// Attach summarizePopulation to relevant events
map.on("dblclick", () => {
    if (analysisMode === "isochrone") {
        summarizePopulation();
    }
});

document.getElementById("clear-polygon").addEventListener("click", summarizePopulation);
map.on("contextmenu", () => {
    if (analysisMode === "polygon") {
        summarizePopulation();
    }
});

// Attach to relevant events
map.on("dblclick", () => {
    if (analysisMode === "isochrone") {
        summarizePopulation();
    }
});
// Get reference to the isochrone buttons container
const isochroneButtonsContainer = document.getElementById('isochrone-buttons-container');

// Add event listener to show/hide buttons based on analysis mode
document.querySelectorAll('input[name="analysis-mode"]').forEach(input => {
    input.addEventListener('change', (event) => {
        analysisMode = event.target.value;
        console.log("Analysis mode switched to:", analysisMode);

        // Show isochrone buttons only if isochrone mode is selected
        if (analysisMode === "isochrone") {
            isochroneButtonsContainer.style.display = 'block';
            clearPolygon();  // Clear polygon when switching
        } else {
            isochroneButtonsContainer.style.display = 'none';
            clearIsochrone();  // Clear isochrone when switching
        }
    });
});
// Get reference to the Clear Boundary button container
const clearBoundaryContainer = document.getElementById('clear-boundary-container');

// Event listener to show/hide the Clear Boundary button based on analysis mode
document.querySelectorAll('input[name="analysis-mode"]').forEach(input => {
    input.addEventListener('change', (event) => {
        analysisMode = event.target.value;

        // Show Clear Boundary button only if Draw Boundary mode is selected
        if (analysisMode === "polygon") {
            clearBoundaryContainer.style.display = 'block';
            clearIsochrone();  // Clear isochrone when switching
        } else {
            clearBoundaryContainer.style.display = 'none';
            clearPolygon();  // Clear polygon when switching
        }
    });
});
// ✅ Event Listener for School Dropdown
document.addEventListener('DOMContentLoaded', () => {
document.getElementById('schoolDropdown').addEventListener('change', zoomToSchool);
});
// Chart toggle logic
document.getElementById('toggle-populationchart').addEventListener('click', () => {
    document.getElementById('populationchart-container').style.display = 'block';
    document.getElementById('polarchart-container').style.display = 'none';
    displaypopulationsummary();
});

document.getElementById('toggle-polarchart').addEventListener('click', () => {
    document.getElementById('populationchart-container').style.display = 'none';
    document.getElementById('polarchart-container').style.display = 'block';
    displayPolarChart(); // ✅ Call displayPolarChart when switching to it
});
document.getElementById("clear-polygon").addEventListener("click", summarizePopulation);
map.on("contextmenu", () => {
    if (analysisMode === "polygon") {
        summarizePopulation();
    }
});




