import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './CrossFunctionalGraph.css';

const CrossFunctionalGraph = ({ onClose, repoInfo, fileTree, apiEndpoints, apiFlows }) => {
    const [selectedNode, setSelectedNode] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const fgRef = useRef();

    useEffect(() => {
        if (repoInfo) {
            buildGraphData();
        }
    }, [repoInfo, fileTree, apiEndpoints, apiFlows]);

    const buildGraphData = () => {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        
        console.log('Building graph with:', {
            hasRepo: !!repoInfo,
            fileCount: fileTree?.length,
            apiCount: apiEndpoints?.length,
            flowCount: apiFlows?.length
        });

        // Safety check
        if (!repoInfo) {
            console.warn('No repoInfo provided');
            setGraphData({ nodes: [], links: [] });
            return;
        }

        // 1. REPOSITORY NODE (Center)
        nodes.push({
            id: 'repo',
            name: repoInfo?.full_name || repoInfo?.name || 'Repository',
            type: 'repository',
            icon: '📦',
            color: '#4CAF50',
            size: 35,
            val: 35,
            description: 'GitHub Repository',
            details: {
                stars: repoInfo?.stargazers_count,
                forks: repoInfo?.forks_count,
                language: repoInfo?.language
            }
        });
        nodeMap.set('repo', true);

        // 2. Add directories from file tree (max 8)
        if (fileTree && Array.isArray(fileTree) && fileTree.length > 0) {
            const directories = new Set();
            fileTree.forEach(file => {
                if (file && file.path) {
                    const parts = file.path.split('/');
                    if (parts.length > 1) {
                        directories.add(parts[0]);
                    }
                }
            });

            const dirArray = Array.from(directories).slice(0, 8);
            dirArray.forEach((dir, idx) => {
                const dirId = `dir_${idx}`;
                nodes.push({
                    id: dirId,
                    name: dir,
                    type: 'directory',
                    icon: '📁',
                    color: '#2196F3',
                    size: 22,
                    val: 22,
                    description: `Directory: ${dir}`,
                    fileCount: fileTree.filter(f => f && f.path && f.path.startsWith(dir)).length
                });
                nodeMap.set(dirId, true);
                
                links.push({
                    source: 'repo',
                    target: dirId,
                    label: 'contains',
                    color: '#2196F3'
                });
            });
        }

        // 3. Add API endpoints (max 10)
        if (apiEndpoints && Array.isArray(apiEndpoints) && apiEndpoints.length > 0) {
            apiEndpoints.slice(0, 10).forEach((endpoint, idx) => {
                if (!endpoint) return;
                
                const apiId = `api_${idx}`;
                nodes.push({
                    id: apiId,
                    name: endpoint.method || 'API',
                    fullPath: endpoint.path || '/unknown',
                    type: 'api',
                    icon: '🔌',
                    color: '#9C27B0',
                    size: 20,
                    val: 20,
                    description: `${endpoint.method || 'METHOD'} ${endpoint.path || 'PATH'}`,
                    details: {
                        framework: endpoint.framework || 'unknown',
                        parameters: endpoint.parameters || [],
                        returns: endpoint.returns || 'unknown'
                    }
                });
                nodeMap.set(apiId, true);
                
                links.push({
                    source: 'repo',
                    target: apiId,
                    label: 'exposes API',
                    color: '#9C27B0'
                });
            });
        }

        // 4. Add services from flows (max 15)
        if (apiFlows && Array.isArray(apiFlows) && apiFlows.length > 0) {
            const servicesAdded = new Map();
            
            apiFlows.slice(0, 15).forEach((flow, idx) => {
                if (flow && flow.from && flow.to) {
                    // Add source service
                    if (!servicesAdded.has(flow.from)) {
                        const fromId = `service_from_${idx}`;
                        nodes.push({
                            id: fromId,
                            name: flow.from.length > 20 ? flow.from.substring(0, 20) + '...' : flow.from,
                            fullName: flow.from,
                            type: 'service',
                            icon: '⚙️',
                            color: '#FF9800',
                            size: 18,
                            val: 18,
                            description: `Service: ${flow.from}`
                        });
                        servicesAdded.set(flow.from, fromId);
                        
                        links.push({
                            source: 'repo',
                            target: fromId,
                            label: 'uses',
                            color: '#FF9800'
                        });
                    }
                    
                    // Add target service
                    if (!servicesAdded.has(flow.to)) {
                        const toId = `service_to_${idx}`;
                        nodes.push({
                            id: toId,
                            name: flow.to.length > 20 ? flow.to.substring(0, 20) + '...' : flow.to,
                            fullName: flow.to,
                            type: 'service',
                            icon: '⚙️',
                            color: '#FF9800',
                            size: 18,
                            val: 18,
                            description: `Service: ${flow.to}`
                        });
                        servicesAdded.set(flow.to, toId);
                        
                        links.push({
                            source: 'repo',
                            target: toId,
                            label: 'uses',
                            color: '#FF9800'
                        });
                    }
                    
                    // Connect services (cross-functional call)
                    const fromId = servicesAdded.get(flow.from);
                    const toId = servicesAdded.get(flow.to);
                    
                    if (fromId && toId) {
                        links.push({
                            source: fromId,
                            target: toId,
                            label: flow.relationship || 'calls',
                            type: 'cross_functional',
                            color: '#FF6B6B',
                            width: 2
                        });
                    }
                }
            });
        }

        console.log('Graph built:', { nodes: nodes.length, links: links.length });
        setGraphData({ nodes, links });
    };

    // Custom node rendering
    const renderNode = (node) => {
        return (
            <g>
                <circle
                    r={node.size || 15}
                    fill={node.color}
                    stroke="#fff"
                    strokeWidth={2}
                    filter="url(#shadow)"
                    opacity={selectedNode?.id === node.id ? 1 : 0.85}
                    cursor="pointer"
                />
                <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={(node.size || 15) * 0.7}
                    fill="#fff"
                    cursor="pointer"
                >
                    {node.icon}
                </text>
                <text
                    x={0}
                    y={(node.size || 15) + 12}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fill="#333"
                    fontWeight={selectedNode?.id === node.id ? "bold" : "normal"}
                    cursor="pointer"
                >
                    {node.name}
                </text>
            </g>
        );
    };

    return (
        <div className="cross-functional-overlay">
            <div className="cross-functional-container">
                {/* Header */}
                <div className="graph-header">
                    <div className="header-title">
                        <span className="header-icon">🔍</span>
                        <h2>Cross-Functional Traceability Graph</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>✖</button>
                </div>

                {/* Warning if no API data */}
                {(!apiEndpoints || apiEndpoints.length === 0) && (
                    <div className="warning-banner">
                        ⚠️ No API data detected. Click "API Routes" button first to detect APIs and flows.
                    </div>
                )}

                {/* Stats Bar */}
                <div className="stats-bar">
                    <div className="stat-item">
                        <span className="stat-number">{graphData.nodes.length}</span>
                        <span className="stat-label">Components</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">{graphData.links.length}</span>
                        <span className="stat-label">Relationships</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">
                            {graphData.nodes.filter(n => n.type === 'api').length}
                        </span>
                        <span className="stat-label">APIs</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">
                            {graphData.links.filter(l => l.type === 'cross_functional').length}
                        </span>
                        <span className="stat-label">Cross-Functional Calls</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="legend">
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#4CAF50', borderRadius: '50%' }}></div>
                        <span>Repository</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#2196F3', borderRadius: '50%' }}></div>
                        <span>Directory</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#9C27B0', borderRadius: '50%' }}></div>
                        <span>API Endpoint</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: '#FF9800', borderRadius: '50%' }}></div>
                        <span>Service/Function</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-line solid"></div>
                        <span>Structure Link</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-line dashed"></div>
                        <span>Cross-Functional Call</span>
                    </div>
                </div>

                {/* Graph Visualization */}
                <div className="graph-visualization">
                    {graphData.nodes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔍</div>
                            <h3>No Graph Data Available</h3>
                            <p>Follow these steps to see the graph:</p>
                            <ol className="steps-list">
                                <li>📦 Analyze a GitHub repository</li>
                                <li>🔌 Click the <strong>"API Routes"</strong> button to detect APIs</li>
                                <li>⏳ Wait for detection to complete</li>
                                <li>🔍 Click <strong>"Cross-Functional Graph"</strong> again</li>
                            </ol>
                            {(!apiEndpoints || apiEndpoints.length === 0) && (
                                <button 
                                    className="close-graph-btn"
                                    onClick={onClose}
                                >
                                    Close & Detect APIs First
                                </button>
                            )}
                        </div>
                    ) : (
                        <ForceGraph2D
                            ref={fgRef}
                            graphData={graphData}
                            nodeCanvasObject={renderNode}
                            linkColor={link => link.color || '#999'}
                            linkWidth={link => link.width || 1.5}
                            linkDirectionalArrowLength={6}
                            linkDirectionalArrowRelPos={1}
                            linkCurvature={0.25}
                            onNodeClick={(node) => setSelectedNode(node)}
                            cooldownTicks={50}
                            d3AlphaDecay={0.02}
                            d3VelocityDecay={0.3}
                            width={Math.min(window.innerWidth * 0.85, 1200)}
                            height={Math.min(window.innerHeight * 0.6, 600)}
                        />
                    )}
                </div>

                {/* Node Details Panel */}
                {selectedNode && (
                    <div className="details-panel">
                        <div className="details-header">
                            <h3>Component Details</h3>
                            <button onClick={() => setSelectedNode(null)}>×</button>
                        </div>
                        <div className="details-content">
                            <div className="detail-icon">{selectedNode.icon}</div>
                            <div className="detail-name">{selectedNode.fullName || selectedNode.name}</div>
                            <div className="detail-type">{selectedNode.type}</div>
                            <p className="detail-description">{selectedNode.description}</p>
                            
                            {selectedNode.details && (
                                <div className="detail-metadata">
                                    <h4>Metadata</h4>
                                    {selectedNode.details.stars !== undefined && (
                                        <p>⭐ Stars: {selectedNode.details.stars}</p>
                                    )}
                                    {selectedNode.details.forks !== undefined && (
                                        <p>🍴 Forks: {selectedNode.details.forks}</p>
                                    )}
                                    {selectedNode.details.language && (
                                        <p>💻 Language: {selectedNode.details.language}</p>
                                    )}
                                    {selectedNode.details.framework && selectedNode.details.framework !== 'unknown' && (
                                        <p>🔧 Framework: {selectedNode.details.framework}</p>
                                    )}
                                    {selectedNode.fileCount && (
                                        <p>📄 Files: {selectedNode.fileCount}</p>
                                    )}
                                    {selectedNode.fullPath && (
                                        <p>🛣️ Path: {selectedNode.fullPath}</p>
                                    )}
                                </div>
                            )}

                            <div className="detail-relationships">
                                <h4>Connected Components</h4>
                                <ul>
                                    {graphData.links
                                        .filter(l => l.source.id === selectedNode.id || l.target.id === selectedNode.id)
                                        .map((link, idx) => {
                                            const otherNode = link.source.id === selectedNode.id ? link.target : link.source;
                                            const direction = link.source.id === selectedNode.id ? '→' : '←';
                                            return (
                                                <li key={idx}>
                                                    {direction} <strong>{otherNode.name}</strong> 
                                                    <span className="relationship-label"> ({link.label})</span>
                                                </li>
                                            );
                                        })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrossFunctionalGraph;