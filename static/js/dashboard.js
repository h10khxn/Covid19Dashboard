const API_BASE = 'http://localhost:3000';
let worldMap, currentDate, dates = [];
let currentMapData = null;

// Show/hide loading indicator
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = message ? 'block' : 'none';

    // Remove any existing close button
    const existingBtn = errorDiv.querySelector('button');
    if (existingBtn) existingBtn.remove();

    // Only add close button if there is a message
    if (message) {
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #dc3545;
        `;
        closeButton.onclick = function() {
            errorDiv.style.display = 'none';
        };
        errorDiv.appendChild(closeButton);
    }
}

// Initialize world map
async function initMap() {
    try {
        const container = document.getElementById('map-container');
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        // Clear any existing SVG
        container.innerHTML = '';

        const svg = d3.select('#map-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        const geojson = topojson.feature(world, world.objects.countries);

        // Use fitSize to show the full world
        const projection = d3.geoMercator()
            .fitSize([width, height], geojson);
        const path = d3.geoPath().projection(projection);

        // Define severity thresholds based on cases per million
        const severityThresholds = {
            low: 10000,      // 0-10,000 cases per million
            moderate: 50000, // 10,000-50,000 cases per million
            high: 100000,    // 50,000-100,000 cases per million
            veryHigh: 200000 // 100,000-200,000 cases per million
        };

        const colorScale = d3.scaleThreshold()
            .domain([
                severityThresholds.low,
                severityThresholds.moderate,
                severityThresholds.high,
                severityThresholds.veryHigh
            ])
            .range(['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']);

        // Add legend
        const legend = d3.select('#legend-container')
            .html('')
            .append('div')
            .attr('class', 'map-legend');

        legend.append('h4')
            .text('Cases per Million');

        const legendData = [
            { color: '#4CAF50', label: 'Low (< 10,000)' },
            { color: '#8BC34A', label: 'Moderate (10,000-50,000)' },
            { color: '#FFC107', label: 'High (50,000-100,000)' },
            { color: '#FF9800', label: 'Very High (100,000-200,000)' },
            { color: '#F44336', label: 'Critical (> 200,000)' }
        ];

        legend.selectAll('.legend-item')
            .data(legendData)
            .enter()
            .append('div')
            .attr('class', 'legend-item')
            .html(d => `
                <div class=\"legend-color\" style=\"background-color: ${d.color} !important\">&nbsp;</div>
                <span>${d.label}</span>
            `);

        // Create country paths
        const countries = svg.append('g')
            .selectAll('path')
            .data(geojson.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', path)
            .attr('id', d => d.id);

        // Add click events
        countries
            .on('click', function(event, d) {
                event.stopPropagation();
                
                console.log('Map click event:', {
                    countryId: d.id,
                    countryName: d.properties.name,
                    currentMapData: currentMapData
                });
                
                // Reset all countries to default style
                d3.selectAll('.country')
                    .style('stroke', '#fff')
                    .style('stroke-width', 0.5);
                
                // Highlight clicked country
                d3.select(this)
                    .style('stroke', '#000')
                    .style('stroke-width', 2);
                
                // Get country data using the country name
                const countryData = currentMapData?.countries.find(c => {
                    // Normalize both strings for comparison
                    const normalizedMapName = d.properties.name.toLowerCase().trim();
                    const normalizedDataName = c.country.toLowerCase().trim();
                    
                    // Handle common country name variations
                    const nameVariations = {
                        'united states': ['usa', 'united states of america', 'u.s.a.', 'u.s.a'],
                        'united kingdom': ['uk', 'great britain', 'britain', 'u.k.', 'u.k'],
                        'russian federation': ['russia'],
                        'czech republic': ['czechia'],
                        'republic of korea': ['south korea', 'korea'],
                        'democratic people\'s republic of korea': ['north korea'],
                        'iran': ['iran (islamic republic of)'],
                        'vietnam': ['viet nam'],
                        'brunei': ['brunei darussalam'],
                        'congo': ['republic of the congo'],
                        'democratic republic of the congo': ['drc', 'congo (kinshasa)'],
                        'laos': ['lao people\'s democratic republic'],
                        'syria': ['syrian arab republic'],
                        'tanzania': ['united republic of tanzania'],
                        'uae': ['united arab emirates'],
                        'venezuela': ['bolivarian republic of venezuela']
                    };
                    
                    // Check direct match
                    if (normalizedMapName === normalizedDataName) return true;
                    
                    // Check variations
                    for (const [standardName, variations] of Object.entries(nameVariations)) {
                        if (normalizedMapName === standardName && variations.includes(normalizedDataName)) return true;
                        if (normalizedDataName === standardName && variations.includes(normalizedMapName)) return true;
                    }
                    
                    return false;
                });
                
                console.log('Country data lookup:', {
                    searchedName: d.properties.name,
                    foundData: countryData,
                    allCountries: currentMapData?.countries.map(c => c.country)
                });
                
                if (countryData) {
                    console.log('Country clicked:', {
                        name: countryData.country,
                        cases: countryData.cases.toLocaleString(),
                        deaths: countryData.deaths.toLocaleString(),
                        date: currentDate
                    });
                    
                    // Show popup with country data
                    const popup = document.createElement('div');
                    popup.className = 'country-popup';
                    popup.innerHTML = `
                        <div class="popup-content">
                            <h3>${countryData.country}</h3>
                            <div class="popup-stats">
                                <div class="stat">
                                    <span class="label">Total Cases:</span>
                                    <span class="value">${countryData.cases.toLocaleString()}</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Total Deaths:</span>
                                    <span class="value">${countryData.deaths.toLocaleString()}</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Cases per Million:</span>
                                    <span class="value">${countryData.cases_per_million.toLocaleString()}</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Deaths per Million:</span>
                                    <span class="value">${countryData.deaths_per_million.toLocaleString()}</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Date:</span>
                                    <span class="value">${currentDate}</span>
                                </div>
                            </div>
                            <button class="close-popup">&times;</button>
                        </div>
                    `;
                    
                    // Remove any existing popup
                    const existingPopup = document.querySelector('.country-popup');
                    if (existingPopup) {
                        existingPopup.remove();
                    }
                    
                    // Add popup to the map container (off-screen first)
                    popup.style.left = `-9999px`;
                    popup.style.top = `-9999px`;
                    document.getElementById('map-container').appendChild(popup);

                    // Attach close button event listener after adding to DOM
                    const closeBtn = popup.querySelector('.close-popup');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            popup.remove();
                        });
                    }

                    // Add click-outside-to-close logic
                    const mapContainer = document.getElementById('map-container');
                    function handleOutsideClick(e) {
                        if (!popup.contains(e.target)) {
                            popup.remove();
                            mapContainer.removeEventListener('click', handleOutsideClick);
                        }
                    }
                    // Use setTimeout to avoid immediate close from the click that opened the popup
                    setTimeout(() => {
                        mapContainer.addEventListener('click', handleOutsideClick);
                    }, 0);

                    // Now measure the popup
                    const containerRect = mapContainer.getBoundingClientRect();
                    const popupRect = popup.getBoundingClientRect();

                    // Mouse position relative to map container
                    let left = event.clientX - containerRect.left;
                    let top = event.clientY - containerRect.top;

                    // Ensure popup is always fully visible within the container
                    const margin = 10;
                    if (popupRect.width > containerRect.width) {
                        left = margin;
                    } else if (left + popupRect.width > containerRect.width - margin) {
                        left = containerRect.width - popupRect.width - margin;
                    }
                    if (left < margin) left = margin;

                    if (popupRect.height > containerRect.height) {
                        top = margin;
                    } else if (top + popupRect.height > containerRect.height - margin) {
                        top = containerRect.height - popupRect.height - margin;
                    }
                    if (top < margin) top = margin;

                    popup.style.left = `${left}px`;
                    popup.style.top = `${top}px`;
                } else {
                    console.log('No data available for', d.properties.name);
                    console.log('Available countries:', currentMapData?.countries.map(c => c.country));
                    console.log('Current date:', currentDate);
                }
            });

        // Add click handler to container to reset country styles
        container.addEventListener('click', function(event) {
            if (event.target === container || event.target === svg.node()) {
                d3.selectAll('.country')
                    .style('stroke', '#fff')
                    .style('stroke-width', 0.5);
            }
        });

        return svg;
    } catch (error) {
        console.error('Error initializing map:', error);
        showError('Failed to initialize world map. Please refresh the page.');
        throw error;
    }
}

// Update map colors based on severity
function updateMap(data) {
    console.log('Updating map with data:', {
        date: data.date,
        countryCount: data.countries.length,
        countries: data.countries.map(c => c.country)
    });
    
    currentMapData = data;
    
    // Define severity thresholds based on cases per million
    const severityThresholds = {
        low: 10000,      // 0-10,000 cases per million
        moderate: 50000, // 10,000-50,000 cases per million
        high: 100000,    // 50,000-100,000 cases per million
        veryHigh: 200000 // 100,000-200,000 cases per million
    };

    const colorScale = d3.scaleThreshold()
        .domain([
            severityThresholds.low,
            severityThresholds.moderate,
            severityThresholds.high,
            severityThresholds.veryHigh
        ])
        .range(['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']);

    // Update legend
    const legend = d3.select('#legend-container .map-legend');
    legend.selectAll('*').remove(); // Clear existing legend

    legend.append('h4')
        .text('Cases per Million');

    const legendData = [
        { color: '#4CAF50', label: 'Low (< 10,000)' },
        { color: '#8BC34A', label: 'Moderate (10,000-50,000)' },
        { color: '#FFC107', label: 'High (50,000-100,000)' },
        { color: '#FF9800', label: 'Very High (100,000-200,000)' },
        { color: '#F44336', label: 'Critical (> 200,000)' }
    ];

    legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('div')
        .attr('class', 'legend-item')
        .html(d => `
            <div class=\"legend-color\" style=\"background-color: ${d.color} !important\">&nbsp;</div>
            <span>${d.label}</span>
        `);

    // Update country colors
    d3.selectAll('.country')
        .style('fill', d => {
            const country = data.countries.find(c => c.iso_code === d.id);
            if (!country) return '#ccc'; // No data
            const casesPerMillion = country.cases_per_million;
            return colorScale(casesPerMillion);
        })
        .style('stroke', '#fff')
        .style('stroke-width', 0.5);
}

// Load dates for timeline
async function loadDates() {
    try {
        const data = await fetchWithError(`${API_BASE}/api/timeseries`);
        dates = data.dates;
        console.log('Available dates:', dates);
        
        // Set up date picker
        const datePicker = document.getElementById('date-picker');
        
        // Set min and max dates
        datePicker.min = dates[0];
        datePicker.max = dates[dates.length - 1];
        
        // Set initial date
        currentDate = dates[dates.length - 1];
        datePicker.value = currentDate;
        
        // Load initial map data
        await loadMapData(currentDate);

        // Add event listeners for timeline controls
        datePicker.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            console.log('Date picker changed to:', selectedDate);
            if (dates.includes(selectedDate)) {
                currentDate = selectedDate;
                await loadMapData(currentDate);
            }
        });

        document.getElementById('prev-date').addEventListener('click', async () => {
            const currentIndex = dates.indexOf(currentDate);
            if (currentIndex > 0) {
                currentDate = dates[currentIndex - 1];
                datePicker.value = currentDate;
                await loadMapData(currentDate);
            }
        });

        document.getElementById('next-date').addEventListener('click', async () => {
            const currentIndex = dates.indexOf(currentDate);
            if (currentIndex < dates.length - 1) {
                currentDate = dates[currentIndex + 1];
                datePicker.value = currentDate;
                await loadMapData(currentDate);
            }
        });

        // Update button states
        function updateButtonStates() {
            const currentIndex = dates.indexOf(currentDate);
            document.getElementById('prev-date').disabled = currentIndex === 0;
            document.getElementById('next-date').disabled = currentIndex === dates.length - 1;
        }

        // Update button states initially and after date changes
        updateButtonStates();
        datePicker.addEventListener('change', updateButtonStates);
        document.getElementById('prev-date').addEventListener('click', updateButtonStates);
        document.getElementById('next-date').addEventListener('click', updateButtonStates);

    } catch (error) {
        console.error('Error loading dates:', error);
        showError('Failed to load timeline data');
    }
}

// Load map data
async function loadMapData(date) {
    try {
        console.log('Loading map data for date:', date);
        
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = new Date(date).toISOString().split('T')[0];
        console.log('Formatted date:', formattedDate);
        
        // Get available dates for validation
        const availableDates = await fetchWithError(`${API_BASE}/api/timeseries`);
        console.log('Available dates:', availableDates.dates);
        
        if (!availableDates.dates.includes(formattedDate)) {
            console.warn(`Date ${formattedDate} not found in available dates`);
            // Use the closest available date
            const closestDate = availableDates.dates.reduce((prev, curr) => {
                return Math.abs(new Date(curr) - new Date(formattedDate)) < Math.abs(new Date(prev) - new Date(formattedDate)) ? curr : prev;
            });
            console.log(`Using closest available date: ${closestDate}`);
            formattedDate = closestDate;
        }
        
        const data = await fetchWithError(`${API_BASE}/api/map-data/${formattedDate}`);
        console.log('Received map data:', {
            date: data.date,
            countryCount: data.countries.length,
            countries: data.countries.map(c => c.country)
        });
        
        // Store current map data for click events
        currentMapData = data;
        currentDate = formattedDate;
        
        updateMap(data);
        
        // Update global stats based on current date
        const globalStats = await fetchWithError(`${API_BASE}/api/global-stats?date=${formattedDate}`);
        console.log('Received global stats:', globalStats);
        
        // Update the display with the new stats
        document.getElementById('total-cases').textContent = globalStats.total_cases.toLocaleString();
        document.getElementById('total-deaths').textContent = globalStats.total_deaths.toLocaleString();
        document.getElementById('total-countries').textContent = globalStats.total_countries;
        
        // Update the current date display
        document.getElementById('current-date').textContent = formattedDate;
    } catch (error) {
        console.error('Error loading map data:', error);
        showError('Failed to load map data');
    }
}

// Load global stats
async function loadGlobalStats() {
    try {
        const data = await fetchWithError(`${API_BASE}/api/global-stats?date=${currentDate}`);
        console.log('Loading global stats for date:', currentDate);
        console.log('Received global stats:', data);
        
        document.getElementById('total-cases').textContent = data.total_cases.toLocaleString();
        document.getElementById('total-deaths').textContent = data.total_deaths.toLocaleString();
        document.getElementById('total-countries').textContent = data.total_countries;
        document.getElementById('current-date').textContent = data.date;
    } catch (error) {
        console.error('Error loading global stats:', error);
    }
}

// Add error handling for fetch requests
async function fetchWithError(url) {
    try {
        console.log(`Fetching ${url}...`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Error fetching ${url}: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`Successfully fetched ${url}`);
        return data;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        showError(`Failed to load data: ${error.message}`);
        throw error;
    }
}

// Test backend connection
async function testBackend() {
    try {
        console.log('Testing backend connection...');
        const response = await fetch(`${API_BASE}/api/test`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`Backend test failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Backend test response:', data);
        
        if (!data.data_loaded) {
            throw new Error('Backend data not loaded properly');
        }
        
        return true;
    } catch (error) {
        console.error('Backend test failed:', error);
        showError(`Backend connection failed: ${error.message}. Please make sure the backend server is running at ${API_BASE}`);
        return false;
    }
}

// Initialize
async function init() {
    try {
        showLoading();
        console.log('Starting dashboard initialization...');
        
        // Load data in sequence with better error handling
        try {
            console.log('Loading dates...');
            await loadDates();
            console.log('Dates loaded');
        } catch (error) {
            console.error('Failed to load dates:', error);
            showError('Failed to load timeline data. Some features may be limited.');
        }
        
        try {
            console.log('Loading global stats...');
            await loadGlobalStats();
            console.log('Global stats loaded');
        } catch (error) {
            console.error('Failed to load global stats:', error);
            showError('Failed to load global statistics. Some features may be limited.');
        }
        
        try {
            console.log('Initializing map...');
            worldMap = await initMap();
            console.log('Map initialized');
        } catch (error) {
            console.error('Map initialization failed:', error);
            showError('Failed to load world map. Some features may be limited.');
        }
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard. Please refresh the page.');
    } finally {
        console.log('Initialization complete');
        hideLoading();
    }
}

// Start initialization when the page loads
window.addEventListener('load', async () => {
    try {
        showLoading();
        console.log('Starting dashboard initialization...');
        
        // Test backend connection
        const isBackendRunning = await testBackend();
        if (!isBackendRunning) {
            console.error('Backend test failed, stopping initialization');
            return;
        }
        
        console.log('Backend test successful, initializing dashboard...');
        await init();
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    } finally {
        hideLoading();
    }
}); 