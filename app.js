const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1aCf_lUyc09HmvGTzzqRVnvePjZ_gtmQ8q5OyPJ43jhQ/export?format=csv';

// Room coordinates mapping (relative to 1024 width)
// I've estimated these for the 4 mentioned rooms. You can add more easily!
const roomCoordinates = {
    "1": {
        "101": "100,200,300,200,300,500,100,500"
    },
    "2": {
        "205": "110,480,145,480,145,540,110,540"
    },
    "3": {
        "301": "108,655,160,655,160,700,108,700",
        "302": "172,655,224,655,224,700,172,700",
        "303": "108,576,160,576,160,620,108,620",
        "304": "172,576,224,576,224,700,172,700",
        "305": "110,490,150,490,150,555,110,555",
        "306": "172,490,212,490,212,555,172,555",
        "358": "645,860,715,860,715,900,645,900"
    },
    "4": {
        "455": "760,740,840,740,840,805,760,805"
    }
};

let currentFloor = "2";
let sheetData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupFloorButtons();
    setupSearch();
    fetchSheetData();
});

function setupFloorButtons() {
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.floor-btn.active').classList.remove('active');
            e.target.classList.add('active');
            currentFloor = e.target.dataset.floor;
            updateFloor();
        });
    });
}

async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        sheetData = parseCSV(csvText);
        updateUI();
    } catch (err) {
        console.error('Error fetching sheet data:', err);
        // Fallback for demo
        sheetData = [
            { lottery: "1", firstName: "Elizabeth", lastName: "Owsley", roomRaw: "Single - 305", roommates: "" },
            { lottery: "2", firstName: "Kathryn", lastName: "Bowsher", roomRaw: "Single - 358", roommates: "" },
            { lottery: "3", firstName: "Maureen", lastName: "Gentilezza", roomRaw: "Single - 205", roommates: "" },
            { lottery: "4", firstName: "Maggie", lastName: "Howard", roomRaw: "Single - 455", roommates: "" }
        ];
        updateUI();
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result = [];

    // The data headers are on Row 8 (index 7)
    // We look for the row containing "Lottery Number"
    let headerIndex = lines.findIndex(l => l.includes('Lottery Number'));
    if (headerIndex === -1) return []; // Fallback if structure changes

    const dataLines = lines.slice(headerIndex + 1);
    dataLines.forEach(line => {
        // Handle CSV parsing with quotes
        const cols = [];
        let col = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') {
                col += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(col.trim());
                col = '';
            } else {
                col += char;
            }
        }
        cols.push(col.trim());

        if (cols.length >= 4 && cols[1]) {
            result.push({
                lottery: cols[0],
                firstName: cols[1],
                lastName: cols[2],
                roomRaw: cols[3],
                roommates: cols[4] || ""
            });
        }
    });
    return result;
}

function updateUI() {
    renderTable(sheetData);
    updateFloor();
    updateStats();
}

function updateFloor() {
    const floorImg = document.getElementById('floorImage');
    const overlay = document.getElementById('mapOverlay');

    floorImg.src = `assets/floor${currentFloor}.png`;

    // Clear overlay
    overlay.innerHTML = '';

    // Update SVG viewBox based on floor dimensions found earlier
    const dimensions = { "1": "1024 926", "2": "1024 962", "3": "1024 900", "4": "1024 995" };
    overlay.setAttribute('viewBox', `0 0 ${dimensions[currentFloor]}`);

    // Render hotspots for this floor
    const floorCoords = roomCoordinates[currentFloor] || {};
    Object.keys(floorCoords).forEach(roomNum => {
        const occupant = sheetData.find(p => p.roomRaw && p.roomRaw.includes(roomNum));
        createHotspot(roomNum, floorCoords[roomNum], occupant);
    });
}

function createHotspot(roomNum, points, occupant) {
    const overlay = document.getElementById('mapOverlay');
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "room-group");

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points);
    polygon.setAttribute("class", "room-hotspot " + (occupant ? "occupied" : ""));
    polygon.dataset.room = roomNum;

    // Add Label
    const center = calculateCenter(points);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", center.x);
    label.setAttribute("y", center.y);
    label.setAttribute("class", "room-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = roomNum;

    group.addEventListener('mousemove', (e) => {
        showTooltip(e, roomNum, occupant);
    });

    group.addEventListener('mouseleave', hideTooltip);

    group.appendChild(polygon);
    group.appendChild(label);
    overlay.appendChild(group);
}

function calculateCenter(pointsStr) {
    const pts = pointsStr.split(',').map(Number);
    let x = 0, y = 0, count = 0;
    for (let i = 0; i < pts.length; i += 2) {
        x += pts[i];
        y += pts[i + 1];
        count++;
    }
    return { x: Math.round(x / count), y: Math.round(y / count) };
}

function showTooltip(e, roomNum, occupant) {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('hidden');

    if (occupant) {
        tooltip.innerHTML = `
            <strong>Room ${roomNum}</strong><br>
            Occupant: ${occupant.firstName} ${occupant.lastName}<br>
            <small>Lottery: ${occupant.lottery}</small><br>
            ${occupant.roommates ? `<small>Roommates: ${occupant.roommates}</small>` : ''}
        `;
    } else {
        tooltip.innerHTML = `<strong>Room ${roomNum}</strong><br>Status: Pick Pending`;
    }

    const mouseX = e.pageX;
    const mouseY = e.pageY;
    tooltip.style.left = (mouseX + 15) + 'px';
    tooltip.style.top = (mouseY + 15) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
}

function renderTable(data) {
    const tbody = document.querySelector('#picksTable tbody');
    tbody.innerHTML = '';

    data.filter(p => p.firstName && p.lastName).forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.lottery}</td>
            <td>${row.firstName} ${row.lastName}</td>
            <td>${row.roomRaw}</td>
            <td><small>${row.roommates}</small></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats() {
    const count = sheetData.filter(p => p.roomRaw).length;
    document.getElementById('statsContent').innerHTML = `
        <div class="stat-row"><strong>Total Picks:</strong> ${count}</div>
        <div class="stat-row"><strong>Pending:</strong> ${Math.max(0, 138 - count)}</div>
    `;
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = sheetData.filter(p =>
            (p.firstName + ' ' + p.lastName).toLowerCase().includes(term) ||
            (p.roomRaw && p.roomRaw.toLowerCase().includes(term))
        );
        renderTable(filtered);
    });
}

// ---- MAPPER TOOL (Dev Mode) ----
// Press 'M' to start mapping. Click points, press 'Enter' to finish a polygon and log coords.
let mapperMode = false;
let currentPoints = [];

window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
        mapperMode = !mapperMode;
        alert('Mapper Mode: ' + (mapperMode ? 'ON. Click floor plan to add points.' : 'OFF'));
    }
    if (e.key === 'Enter' && mapperMode) {
        const roomNum = prompt('Enter Room Number:');
        if (roomNum) {
            console.log(`"${roomNum}": "${currentPoints.join(',')}"`);
            alert(`Coord for ${roomNum} copied to console!`);
        }
        currentPoints = [];
    }
});

document.getElementById('mapContainer').addEventListener('click', (e) => {
    if (!mapperMode) return;
    const rect = document.getElementById('floorImage').getBoundingClientRect();
    const svg = document.getElementById('mapOverlay');
    const viewBox = svg.viewBox.baseVal;

    const x = Math.round((e.clientX - rect.left) / rect.width * viewBox.width);
    const y = Math.round((e.clientY - rect.top) / rect.height * viewBox.height);

    currentPoints.push(x, y);

    // Draw dot
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", "red");
    svg.appendChild(dot);
});
