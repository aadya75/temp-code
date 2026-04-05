from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/visualize", tags=["visualization"])

@router.get("/", response_class=HTMLResponse)
async def visualization_dashboard():
    """HTML dashboard for trace visualization"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Traceability Dashboard - GitHub Repo Fetcher</title>
        <script src="https://cdn.jsdelivr.net/npm/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f5f5f5; }
            h1 { color: #333; margin-bottom: 10px; }
            h2 { color: #666; margin: 20px 0 10px 0; }
            .subtitle { color: #666; margin-bottom: 20px; }
            .container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .graph-container { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .traces-container { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            #graph { height: 500px; border: 1px solid #ddd; border-radius: 4px; }
            .trace-list { max-height: 500px; overflow-y: auto; }
            .trace-item { padding: 10px; margin: 5px 0; border-left: 3px solid #4CAF50; background: #f9f9f9; cursor: pointer; border-radius: 4px; }
            .trace-item:hover { background: #f0f0f0; transform: translateX(5px); transition: all 0.2s; }
            .trace-error { border-left-color: #f44336; }
            .trace-duration { float: right; color: #666; font-weight: bold; }
            .trace-time { font-size: 12px; color: #999; margin-top: 5px; }
            .span-list { margin-top: 10px; padding-left: 20px; max-height: 400px; overflow-y: auto; }
            .span-item { padding: 8px; margin: 5px 0; border-left: 2px solid #2196F3; background: #f8f9fa; font-size: 12px; border-radius: 4px; }
            .span-error { border-left-color: #f44336; background: #ffebee; }
            .span-success { border-left-color: #4CAF50; }
            button { padding: 8px 16px; margin: 5px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; }
            button:hover { background: #45a049; }
            .refresh-btn { background: #2196F3; }
            .refresh-btn:hover { background: #0b7dda; }
            .close-btn { background: #f44336; }
            .close-btn:hover { background: #da190b; }
            .trace-detail-panel { margin-top: 20px; background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .badge { display: inline-block; padding: 3px 8px; margin: 2px; border-radius: 12px; font-size: 11px; background: #e0e0e0; }
            .badge-api { background: #e3f2fd; color: #1976d2; }
            .badge-service { background: #e8f5e9; color: #388e3c; }
        </style>
    </head>
    <body>
        <h1>🔍 Traceability Engine - Cross-Functional Call Mapping</h1>
        <div class="subtitle">Track execution sequences and function calls across your GitHub backup system</div>
        
        <div class="container">
            <div class="graph-container">
                <h2>📊 Function Call Graph</h2>
                <div id="graph"></div>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <span class="badge badge-api">API Layer</span>
                    <span class="badge badge-service">Service Layer</span>
                    <span class="badge">→ Shows which functions call which</span>
                </div>
            </div>
            
            <div class="traces-container">
                <h2>📜 Recent Execution Traces</h2>
                <button class="refresh-btn" onclick="loadTraces()">🔄 Refresh</button>
                <div id="traces" class="trace-list"></div>
            </div>
        </div>
        
        <div id="trace-detail" class="trace-detail-panel" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>🔬 Trace Details</h2>
                <button class="close-btn" onclick="closeTraceDetail()">✖ Close</button>
            </div>
            <div id="detail-content"></div>
        </div>
        
        <script>
            async function loadCallGraph() {
                try {
                    const response = await fetch('/api/v1/github/call-graph');
                    const data = await response.json();
                    
                    const elements = [
                        ...data.nodes.map(node => ({
                            data: {
                                id: node.id,
                                label: `${node.name}\\n(${node.service})`,
                                call_count: node.call_count
                            }
                        })),
                        ...data.edges.map(edge => ({
                            data: {
                                source: edge.from,
                                target: edge.to,
                                label: `${edge.call_count} calls\\n${edge.avg_duration_ms?.toFixed(2) || 0}ms`
                            }
                        }))
                    ];
                    
                    const cy = cytoscape({
                        container: document.getElementById('graph'),
                        elements: elements,
                        style: [
                            {
                                selector: 'node',
                                style: {
                                    'label': 'data(label)',
                                    'background-color': (ele) => ele.data('service')?.includes('api') ? '#2196F3' : '#4CAF50',
                                    'text-valign': 'center',
                                    'color': 'white',
                                    'font-size': '11px',
                                    'width': 'label',
                                    'height': 'label',
                                    'padding': '10px',
                                    'shape': 'roundrectangle'
                                }
                            },
                            {
                                selector: 'edge',
                                style: {
                                    'width': (ele) => Math.min(ele.data('call_count') / 10, 5),
                                    'label': 'data(label)',
                                    'font-size': '9px',
                                    'text-rotation': 'autorotate',
                                    'curve-style': 'bezier',
                                    'line-color': '#999',
                                    'target-arrow-color': '#999',
                                    'target-arrow-shape': 'triangle'
                                }
                            }
                        ],
                        layout: {
                            name: 'dagre',
                            rankDir: 'TB',
                            spacingFactor: 1.5,
                            animate: true
                        }
                    });
                    
                    cy.on('tap', 'node', (evt) => {
                        const node = evt.target;
                        alert(`Function: ${node.data('label')}\\nCalled ${node.data('call_count')} times`);
                    });
                } catch (error) {
                    console.error('Error loading graph:', error);
                }
            }
            
            async function loadTraces() {
                try {
                    const response = await fetch('/api/v1/github/traces/recent?limit=20');
                    const traces = await response.json();
                    
                    const container = document.getElementById('traces');
                    container.innerHTML = '';
                    
                    if (traces.length === 0) {
                        container.innerHTML = '<p style="text-align: center; color: #999;">No traces yet. Make some API calls to GitHub repos first!</p>';
                        return;
                    }
                    
                    traces.forEach(trace => {
                        const div = document.createElement('div');
                        div.className = 'trace-item';
                        div.onclick = () => showTraceDetail(trace.trace_id);
                        
                        div.innerHTML = `
                            <strong>${trace.endpoint || 'Unknown endpoint'}</strong>
                            <span class="trace-duration">⏱️ ${trace.duration_ms?.toFixed(2) || 0}ms</span>
                            <div class="trace-time">🆔 ${trace.trace_id.substring(0, 8)}... | ${new Date(trace.start_time).toLocaleTimeString()} | ${trace.spans_count} operations</div>
                        `;
                        container.appendChild(div);
                    });
                } catch (error) {
                    console.error('Error loading traces:', error);
                }
            }
            
            async function showTraceDetail(traceId) {
                try {
                    const response = await fetch(`/api/v1/github/traces/${traceId}`);
                    const trace = await response.json();
                    
                    const detailDiv = document.getElementById('trace-detail');
                    const contentDiv = document.getElementById('detail-content');
                    
                    contentDiv.innerHTML = `
                        <p><strong>Trace ID:</strong> <code>${trace.trace_id}</code></p>
                        <p><strong>Endpoint:</strong> ${trace.endpoint}</p>
                        <p><strong>Method:</strong> ${trace.method}</p>
                        <p><strong>Total Duration:</strong> ⏱️ ${trace.duration_ms?.toFixed(2)}ms</p>
                        <p><strong>Start Time:</strong> ${new Date(trace.start_time).toLocaleString()}</p>
                        <h3>📋 Execution Spans (${trace.spans.length} operations):</h3>
                        <div class="span-list">
                            ${trace.spans.map(span => `
                                <div class="span-item span-${span.status}">
                                    <strong>${span.operation}</strong> 
                                    <span style="float: right;">⏱️ ${span.duration_ms?.toFixed(2) || 0}ms</span><br>
                                    <span class="badge badge-${span.service.includes('api') ? 'api' : 'service'}">${span.service}</span>
                                    Status: ${span.status}
                                    ${span.tags && span.tags.length ? `<br>Tags: ${span.tags.map(t => `<span class="badge">${t}</span>`).join('')}` : ''}
                                    ${span.error ? `<br><span style="color: red;">❌ Error: ${span.error}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    detailDiv.style.display = 'block';
                    detailDiv.scrollIntoView({ behavior: 'smooth' });
                } catch (error) {
                    console.error('Error loading trace detail:', error);
                }
            }
            
            function closeTraceDetail() {
                document.getElementById('trace-detail').style.display = 'none';
            }
            
            // Load data on page load
            loadCallGraph();
            loadTraces();
            
            // Auto-refresh traces every 10 seconds
            setInterval(loadTraces, 10000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)