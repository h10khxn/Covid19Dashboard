const API_BASE = 'http://localhost:3000';
let worldMap, currentDate, dates = [];
let currentMapData = null;
let zoomLevel = 1;
let mapInitialized = false;
let darkMode = localStorage.getItem('darkMode') === 'enabled';

// Initialize any saved user preferences
function initPreferences() {
    // Set dark mode if previously enabled
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Set up dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
}

// Toggle dark mode
function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.removeItem('darkMode');
    }
}

// Show/hide loading indicator with animation
function showLoading() {
    const loader = document.getElementById('loading');
    loader.style.display = 'flex';
    loader.style.opacity = '0';
    
    // Trigger animation
    setTimeout(() => {
        loader.style.opacity = '1';
    }, 10);
}

function hideLoading() {
    const loader = document.getElementById('loading');
    loader.style.opacity = '0';
    
    // Remove after transition
    setTimeout(() => {
        loader.style.display = 'none';
    }, 300);
}

// Show error message with enhanced UI
function showError(message) {
    let errorDiv = document.getElementById('error-message');
    if (!message || message.trim() === '') {
        if (errorDiv) {
            errorDiv.remove();
        }
        return;
    }
    // If the errorDiv doesn't exist, create it
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        document.body.appendChild(errorDiv);
    }
    if (!errorDiv.querySelector('.error-content')) {
        errorDiv.innerHTML = `
            <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="error-content">
                <h5>Error</h5>
                <p></p>
            </div>
            <button class="error-close">&times;</button>
        `;
        errorDiv.querySelector('.error-close').addEventListener('click', () => {
            showError(null);
        });
    }
    errorDiv.querySelector('.error-content p').textContent = message;
    errorDiv.style.display = 'flex';
    errorDiv.style.opacity = '0';
    setTimeout(() => {
        errorDiv.style.opacity = '1';
        errorDiv.classList.add('pulse-error');
        setTimeout(() => {
            if (errorDiv.style.display !== 'none') {
                showError(null);
            }
        }, 10000);
    }, 10);
}

// Initialize world map with improved interactions
async function initMap() {
    try {
        if (mapInitialized) return worldMap;
        
        const container = document.getElementById('map-container');
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        // Clear any existing SVG
        container.innerHTML = '';

        const svg = d3.select('#map-container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [0, 0, width, height])
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Add a background rect for detecting clicks on empty space
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent');

        // Create a g element to hold map elements and support zoom
        const g = svg.append('g');

        // Load world map data
        const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        const geojson = topojson.feature(world, world.objects.countries);

        // Store geojson globally for reuse
        worldMap = { geojson };

        // Set up projection
        const projection = d3.geoMercator().fitSize([width, height], geojson);
        const path = d3.geoPath().projection(projection);

        // Define severity thresholds based on cases per million
        const colorScale = d3.scaleThreshold()
            .domain([10000, 50000, 100000, 200000])
            .range(['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']);

        // Create country paths
        const countries = g.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(geojson.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', path)
            .attr('id', d => `country-${d.id}`);

        // Store countries selection for later
        worldMap.countries = countries;
        worldMap.svg = svg;

        // Set up zoom behavior with dynamic translateExtent
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                zoomLevel = event.transform.k;
                // Dynamically restrict panning so the map cannot be dragged out of view
                const t = event.transform;
                const maxX = (width * t.k - width) / 2;
                const maxY = (height * t.k - height) / 2;
                const minX = -maxX;
                const minY = -maxY;
                zoom.translateExtent([[minX, minY], [width - minX, height - minY]]);
            });

        svg.call(zoom);

        // Add click events for countries
        countries.on('click', function(event, d) {
            event.stopPropagation();
            
            // Reset all countries to default style
            d3.selectAll('.country')
                .classed('selected', false);
            
            // Highlight clicked country
            d3.select(this)
                .classed('selected', true);
            
            // Find country data
            const countryData = findCountryData(d.properties.name);
            
            if (countryData) {
                showCountryPopup(event, countryData, container);
            } else {
                console.log('No data available for', d.properties.name);
            }
        });

        // Add click handler to reset selection and close popup
        svg.on('click', function(event) {
            if (event.target === svg.node() || event.target === svg.select('rect').node()) {
                d3.selectAll('.country')
                    .classed('selected', false);
                
                // Close any open popup
                const popup = document.querySelector('.country-popup');
                if (popup) {
                    popup.classList.add('fade-out');
                    setTimeout(() => popup.remove(), 300);
                }
            }
        });

        // Set up zoom control buttons
        document.getElementById('zoom-in').addEventListener('click', () => {
            svg.transition().duration(300).call(zoom.scaleBy, 1.5);
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            svg.transition().duration(300).call(zoom.scaleBy, 0.75);
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        });

        mapInitialized = true;
        return { svg, g, path, countries, colorScale, projection };
    } catch (error) {
        console.error('Error initializing map:', error);
        showError('Failed to initialize world map. Please refresh the page.');
        throw error;
    }
}

// Helper function to find country data from the currentMapData
function findCountryData(countryName) {
    if (!currentMapData || !currentMapData.countries) return null;
    
    // Normalize the search name
    const normalizedName = countryName.toLowerCase().trim();
    
    // Common name variations
    const nameVariations = {
        'united states': ['usa', 'united states of america', 'u.s.a.', 'u.s.'],
        'united kingdom': ['uk', 'great britain', 'britain', 'england'],
        'russian federation': ['russia'],
        'czech republic': ['czechia'],
        'south korea': ['republic of korea', 'korea, south'],
        'north korea': ['democratic people\'s republic of korea', 'korea, north'],
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
    
    // Try direct match first
    let country = currentMapData.countries.find(c => 
        c.country.toLowerCase().trim() === normalizedName
    );
    
    // Try variations if no match
    if (!country) {
        for (const [standardName, variations] of Object.entries(nameVariations)) {
            if (normalizedName === standardName || variations.includes(normalizedName)) {
                // If country name matches the standard name or its variations
                country = currentMapData.countries.find(c => 
                    c.country.toLowerCase().trim() === standardName || 
                    variations.includes(c.country.toLowerCase().trim())
                );
                if (country) break;
            }
        }
    }
    
    return country;
}

// Show country popup with improved styling and animations
function showCountryPopup(event, countryData, container) {
    // Remove any existing popup
    const existingPopup = document.querySelector('.country-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'country-popup';
    popup.innerHTML = `
        <div class="popup-header">
            <h3>${countryData.country}</h3>
            <button class="close-popup">&times;</button>
        </div>
        <div class="popup-content">
            <div class="popup-stats">
                <div class="stat">
                    <span class="label"><i class="fas fa-virus"></i> Total Cases:</span>
                    <span class="value">${countryData.cases.toLocaleString()}</span>
                </div>
                <div class="stat">
                    <span class="label"><i class="fas fa-heart-broken"></i> Total Deaths:</span>
                    <span class="value">${countryData.deaths.toLocaleString()}</span>
                </div>
                <div class="stat">
                    <span class="label"><i class="fas fa-chart-line"></i> Cases per Million:</span>
                    <span class="value">${countryData.cases_per_million.toLocaleString()}</span>
                </div>
                <div class="stat">
                    <span class="label"><i class="fas fa-skull"></i> Deaths per Million:</span>
                    <span class="value">${countryData.deaths_per_million.toLocaleString()}</span>
                </div>
                <div class="stat">
                    <span class="label"><i class="fas fa-calendar-day"></i> Date:</span>
                    <span class="value">${formatDate(currentDate)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Position popup (initially off-screen)
    popup.style.left = `-9999px`;
    popup.style.top = `-9999px`;
    container.appendChild(popup);
    
    // Add close button event listener
    popup.querySelector('.close-popup').addEventListener('click', () => {
        popup.classList.add('fade-out');
        setTimeout(() => popup.remove(), 300);
        
        // Also clear country selection
        d3.selectAll('.country')
            .classed('selected', false);
    });
    
    // Calculate best position for popup
    const containerRect = container.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    let left = event.clientX - containerRect.left;
    let top = event.clientY - containerRect.top;
    
    // Ensure popup stays within map container bounds
    const margin = 10;
    if (left + popupRect.width > containerRect.width - margin) {
        left = left - popupRect.width - margin;
    }
    if (left < margin) left = margin;
    
    if (top + popupRect.height > containerRect.height - margin) {
        top = top - popupRect.height - margin;
    }
    if (top < margin) top = margin;
    
    // Apply final position with animation
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Update map colors based on severity
async function updateMap(data) {
    if (!mapInitialized) {
        worldMap = await initMap();
    }
    currentMapData = data;
    // Get map elements
    const { countries, colorScale } = worldMap;
    // Update country colors with transition
    countries
        .transition()
        .duration(500)
        .style('fill', d => {
            const country = data.countries.find(c => c.iso_code === d.id);
            if (!country || !country.cases || country.cases === 0) return '#ccc'; // No data or zero cases
            return colorScale(country.cases_per_million);
        });
    // Animate count numbers (use backend global stats if available)
    if (typeof data.total_cases === 'number') animateNumbers('total-cases', data.total_cases);
    if (typeof data.total_deaths === 'number') animateNumbers('total-deaths', data.total_deaths);
    if (Array.isArray(data.countries)) animateNumbers('total-countries', data.countries.length);
}

// Animate counting up numbers
function animateNumbers(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    // If targetNumber is not a valid number, just show 0
    if (typeof targetNumber !== 'number' || isNaN(targetNumber)) {
        element.textContent = '0';
        return;
    }
    const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const duration = 1000; // ms
    const frameRate = 30; // frames per second
    const totalFrames = duration / (1000 / frameRate);
    const increment = (targetNumber - startValue) / totalFrames;
    let currentValue = startValue;
    let frame = 0;
    const animate = () => {
        frame++;
        currentValue += increment;
        if (frame <= totalFrames) {
            element.textContent = Math.round(currentValue).toLocaleString();
            requestAnimationFrame(animate);
        } else {
            element.textContent = targetNumber.toLocaleString();
        }
    };
    animate();
}

// Load dates for timeline with improved UX
async function loadDates() {
    try {
        const data = await fetchWithError(`${API_BASE}/api/timeseries`);
        dates = data.dates;
        
        // Set up date picker
        const datePicker = document.getElementById('date-picker');
        
        // Set min and max dates
        datePicker.min = dates[0];
        datePicker.max = dates[dates.length - 1];
        
        // Set initial date to latest available
        currentDate = dates[dates.length - 1];
        datePicker.value = currentDate;
        
        // Show formatted date in the date display
        document.getElementById('current-date').textContent = formatDate(currentDate);
        
        // Load initial map data
        await loadMapData(currentDate);

        // Add event listeners for timeline controls
        datePicker.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            if (dates.includes(selectedDate)) {
                currentDate = selectedDate;
                await loadMapData(currentDate);
            }
        });

        // Previous date button
        document.getElementById('prev-date').addEventListener('click', async () => {
            const currentIndex = dates.indexOf(currentDate);
            if (currentIndex > 0) {
                currentDate = dates[currentIndex - 1];
                datePicker.value = currentDate;
                await loadMapData(currentDate);
            }
        });

        // Next date button
        document.getElementById('next-date').addEventListener('click', async () => {
            const currentIndex = dates.indexOf(currentDate);
            if (currentIndex < dates.length - 1) {
                currentDate = dates[currentIndex + 1];
                datePicker.value = currentDate;
                await loadMapData(currentDate);
            }
        });

        // Update button states initially
        updateButtonStates();

    } catch (error) {
        console.error('Error loading dates:', error);
        showError('Failed to load timeline data. Please try again later.');
    }
}

// Update timeline button states
function updateButtonStates() {
    const currentIndex = dates.indexOf(currentDate);
    const prevButton = document.getElementById('prev-date');
    const nextButton = document.getElementById('next-date');
    
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === dates.length - 1;
}

// Load map data for a specific date
async function loadMapData(date) {
    try {
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = new Date(date).toISOString().split('T')[0];
        
        // Validate date against available dates
        if (!dates.includes(formattedDate)) {
            const closestDate = dates.reduce((prev, curr) => {
                return Math.abs(new Date(curr) - new Date(formattedDate)) < 
                       Math.abs(new Date(prev) - new Date(formattedDate)) ? curr : prev;
            });
            date = closestDate;
        }
        
        // Get map data
        const data = await fetchWithError(`${API_BASE}/api/map-data/${formattedDate}`);
        currentMapData = data;
        currentDate = formattedDate;
        
        // Update map visualization
        await updateMap(data);
        
        // Get global stats
        const globalStats = await fetchWithError(`${API_BASE}/api/global-stats?date=${formattedDate}`);
        
        // Update global stats
        document.getElementById('total-cases').textContent = globalStats.total_cases.toLocaleString();
        document.getElementById('total-deaths').textContent = globalStats.total_deaths.toLocaleString();
        document.getElementById('total-countries').textContent = globalStats.total_countries;
        
        // Update date display with formatted date
        document.getElementById('current-date').textContent = formatDate(formattedDate);
        document.getElementById('date-picker').value = formattedDate;
        
        // Update button states
        updateButtonStates();
        
    } catch (error) {
        console.error('Error loading map data:', error);
        showError('Failed to load map data for the selected date.');
    }
}

// Enhanced fetch with error handling, retries, and timeout
async function fetchWithError(url, retries = 2, timeout = 10000) {
    let attempts = 0;
    
    while (attempts <= retries) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal
            });
            
            // Clear timeout
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.detail || `Error: ${response.status} ${response.statusText}`;
                } catch {
                    errorMsg = `Error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }
            
            return await response.json();
            
        } catch (error) {
            attempts++;
            
            if (error.name === 'AbortError') {
                console.error(`Request timeout for ${url}`);
                if (attempts > retries) {
                    throw new Error(`Request timed out after ${timeout / 1000} seconds`);
                }
            } else if (attempts > retries) {
                throw error;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }
}

// Test backend connection with improved UI feedback
async function testBackend() {
    try {
        const response = await fetch(`${API_BASE}/api/test`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`Backend test failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.data_loaded) {
            throw new Error('Backend data not loaded properly');
        }
        
        return true;
    } catch (error) {
        console.error('Backend test failed:', error);
        showError(`Backend connection failed. Please make sure the backend server is running at ${API_BASE}`);
        return false;
    }
}

// Handle window resize
function handleResize() {
    if (mapInitialized) {
        if (currentMapData) {
            updateMap(currentMapData);
        }
    }
}

// Initialize dashboard
async function init() {
    try {
        // Initialize user preferences
        initPreferences();
        
        // Set up window resize handler
        window.addEventListener('resize', handleResize);
        
        // Test backend connection
        const isBackendRunning = await testBackend();
        if (!isBackendRunning) {
            return;
        }
        
        // Load map if it hasn't been initialized
        if (!mapInitialized) {
            worldMap = await initMap();
        }
        
        // Load timeline data
        await loadDates();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard. Please refresh the page.');
    }
}

// Start initialization when the page loads
window.addEventListener('load', init);