document.addEventListener('DOMContentLoaded', () => {
    const simulateBtn = document.getElementById('simulateBtn');
    const ganttChart = document.getElementById('ganttChart');
    const graphView = document.getElementById('graphView');
    const totalMovementsSpan = document.getElementById('totalMovements');
    const avgSeekTimeSpan = document.getElementById('avgSeekTime');
    const requestFile = document.getElementById('requestFile');
    const requestSequenceInput = document.getElementById('requestSequence');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // Tab functionality
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked tab
            btn.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab content
            const tabId = btn.getAttribute('data-tab');
            if (tabId === 'gantt') {
                document.getElementById('ganttChart').classList.add('active');
            } else if (tabId === 'graph') {
                document.getElementById('graphView').classList.add('active');
            }
        });
    });
    
    // File reading functionality
    requestFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            requestSequenceInput.value = content.trim();
        };
        reader.readAsText(file);
    });

    simulateBtn.addEventListener('click', () => {
        const trackCount = parseInt(document.getElementById('trackCount').value);
        const initialPosition = parseInt(document.getElementById('initialPosition').value);
        const requestSequence = document.getElementById('requestSequence').value
            .split(',')
            .map(num => parseInt(num.trim()))
            .filter(num => !isNaN(num));
        const algorithm = document.getElementById('algorithm').value;

        if (validateInputs(trackCount, initialPosition, requestSequence)) {
            const result = simulateDiskScheduling(algorithm, requestSequence, initialPosition, trackCount);
            displayResults(result, trackCount);
        }
    });

    function validateInputs(trackCount, initialPosition, requestSequence) {
        if (isNaN(trackCount) || trackCount <= 0) {
            alert('Please enter a valid number of tracks');
            return false;
        }
        if (isNaN(initialPosition) || initialPosition < 0 || initialPosition >= trackCount) {
            alert('Initial position must be between 0 and ' + (trackCount - 1));
            return false;
        }
        if (requestSequence.length === 0) {
            alert('Please enter a valid request sequence');
            return false;
        }
        if (requestSequence.some(track => track < 0 || track >= trackCount)) {
            alert('All track numbers must be between 0 and ' + (trackCount - 1));
            return false;
        }
        return true;
    }

    function simulateDiskScheduling(algorithm, requests, initialPosition, trackCount) {
        let sequence = [];
        let totalMovements = 0;
        let currentPosition = initialPosition;
        let seekTimes = [];

        switch (algorithm) {
            case 'FCFS':
                sequence = [...requests];
                for (let request of requests) {
                    const seekTime = Math.abs(request - currentPosition);
                    totalMovements += seekTime;
                    seekTimes.push(seekTime);
                    currentPosition = request;
                }
                break;

            case 'SSTF':
                let remainingRequests = [...requests];
                while (remainingRequests.length > 0) {
                    const closest = remainingRequests.reduce((prev, curr) => 
                        Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev
                    );
                    sequence.push(closest);
                    const seekTime = Math.abs(closest - currentPosition);
                    totalMovements += seekTime;
                    seekTimes.push(seekTime);
                    currentPosition = closest;
                    remainingRequests = remainingRequests.filter(req => req !== closest);
                }
                break;

            case 'SCAN':
                const sortedRequests = [...requests].sort((a, b) => a - b);
                const leftRequests = sortedRequests.filter(req => req <= currentPosition).reverse();
                const rightRequests = sortedRequests.filter(req => req > currentPosition);
                
                // Going left first (towards 0), then right
                if (leftRequests.length > 0) {
                    // Add all requests on the left side
                    for (let req of leftRequests) {
                        sequence.push(req);
                        const seekTime = Math.abs(req - currentPosition);
                        totalMovements += seekTime;
                        seekTimes.push(seekTime);
                        currentPosition = req;
                    }
                    
                    // Go all the way to 0 if needed
                    if (currentPosition > 0) {
                        sequence.push(0);
                        const seekTime = currentPosition;
                        totalMovements += seekTime;
                        seekTimes.push(seekTime);
                        currentPosition = 0;
                    }
                }
                
                // Now go right (towards higher tracks)
                for (let req of rightRequests) {
                    sequence.push(req);
                    const seekTime = Math.abs(req - currentPosition);
                    totalMovements += seekTime;
                    seekTimes.push(seekTime);
                    currentPosition = req;
                }
                break;

            case 'CSCAN':
                const sortedRequestsC = [...requests].sort((a, b) => a - b);
                const leftRequestsC = sortedRequestsC.filter(req => req < currentPosition);
                const rightRequestsC = sortedRequestsC.filter(req => req >= currentPosition);
                
                // First serve all requests to the right (higher track numbers)
                for (let req of rightRequestsC) {
                    sequence.push(req);
                    const seekTime = Math.abs(req - currentPosition);
                    totalMovements += seekTime;
                    seekTimes.push(seekTime);
                    currentPosition = req;
                }
                
                // If we have requests to the left, jump to track 0
                if (leftRequestsC.length > 0) {
                    // Jump to the end of the disk
                    sequence.push(trackCount - 1);
                    const seekTimeEnd = (trackCount - 1 - currentPosition);
                    totalMovements += seekTimeEnd;
                    seekTimes.push(seekTimeEnd);
                    
                    // Jump to the beginning of the disk
                    sequence.push(0);
                    totalMovements += (trackCount - 1);
                    seekTimes.push(trackCount - 1);
                    currentPosition = 0;
                    
                    // Serve all requests to the left
                    for (let req of leftRequestsC) {
                        sequence.push(req);
                        const seekTime = Math.abs(req - currentPosition);
                        totalMovements += seekTime;
                        seekTimes.push(seekTime);
                        currentPosition = req;
                    }
                }
                break;
        }

        return {
            sequence: [initialPosition, ...sequence],
            totalMovements,
            avgSeekTime: totalMovements / requests.length,
            seekTimes
        };
    }

    function displayResults(result, trackCount) {
        // Update statistics
        totalMovementsSpan.textContent = result.totalMovements;
        avgSeekTimeSpan.textContent = result.avgSeekTime.toFixed(2);

        // Clear previous charts
        ganttChart.innerHTML = '';
        graphView.innerHTML = '';

        // Create Gantt chart
        createGanttChart(result, trackCount);
        
        // Create Graph view
        createGraphView(result, trackCount);
    }
    
    function createGanttChart(result, trackCount) {
        const sequence = result.sequence;
        const maxTrack = trackCount - 1;
        const scale = (ganttChart.clientWidth - 40) / maxTrack;
        
        // Add axis
        const axis = document.createElement('div');
        axis.className = 'gantt-track';
        axis.style.top = '150px';
        ganttChart.appendChild(axis);
        
        // Create colored segments for each movement
        sequence.forEach((track, index) => {
            if (index < sequence.length - 1) {
                const bar = document.createElement('div');
                bar.className = 'gantt-bar';
                bar.style.width = `${Math.abs(sequence[index + 1] - track) * scale}px`;
                bar.style.left = `${Math.min(track, sequence[index + 1]) * scale + 20}px`;
                bar.style.top = `${index * 40 + 20}px`;
                
                // Use different colors for different algorithms
                const hue = (index * 25) % 360;
                bar.style.backgroundColor = `hsl(${hue}, 80%, 60%)`;

                const label = document.createElement('div');
                label.className = 'gantt-label';
                label.textContent = `${track} → ${sequence[index + 1]}`;
                bar.appendChild(label);

                ganttChart.appendChild(bar);
            }
        });
    }
    
    function createGraphView(result, trackCount) {
        const sequence = result.sequence;
        const maxTrack = trackCount - 1;
        
        // Calculate scale factors for the graph
        const graphHeight = graphView.clientHeight - 40;
        const graphWidth = graphView.clientWidth - 40;
        const scaleY = graphHeight / maxTrack;
        const scaleX = graphWidth / (sequence.length - 1);
        
        // Add axis
        const yAxis = document.createElement('div');
        yAxis.style.position = 'absolute';
        yAxis.style.width = '2px';
        yAxis.style.height = `${graphHeight}px`;
        yAxis.style.backgroundColor = '#ccc';
        yAxis.style.left = '20px';
        yAxis.style.top = '20px';
        graphView.appendChild(yAxis);
        
        const xAxis = document.createElement('div');
        xAxis.style.position = 'absolute';
        xAxis.style.width = `${graphWidth}px`;
        xAxis.style.height = '2px';
        xAxis.style.backgroundColor = '#ccc';
        xAxis.style.left = '20px';
        xAxis.style.top = `${graphHeight + 20}px`;
        graphView.appendChild(xAxis);
        
        // Add points and lines for each track request
        sequence.forEach((track, index) => {
            // Add point
            const point = document.createElement('div');
            point.className = 'graph-point';
            point.style.left = `${index * scaleX + 20}px`;
            point.style.top = `${graphHeight - track * scaleY + 20}px`;
            
            // Show track number on hover
            point.title = `Track: ${track}`;
            
            graphView.appendChild(point);
            
            // Add line connecting to next point
            if (index < sequence.length - 1) {
                const line = document.createElement('div');
                line.className = 'graph-line';
                
                // Calculate line position and angle
                const x1 = index * scaleX + 20;
                const y1 = graphHeight - track * scaleY + 20;
                const x2 = (index + 1) * scaleX + 20;
                const y2 = graphHeight - sequence[index + 1] * scaleY + 20;
                
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                
                line.style.width = `${length}px`;
                line.style.left = `${x1}px`;
                line.style.top = `${y1}px`;
                line.style.transform = `rotate(${angle}deg)`;
                
                graphView.appendChild(line);
            }
        });
    }
}); 