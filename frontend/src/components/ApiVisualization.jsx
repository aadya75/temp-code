import { useState, useEffect } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

// Register the dagre layout
cytoscape.use(dagre)

import './ApiVisualization.css'

const ApiVisualization = ({ endpoints, flows, onClose, repoName }) => {
  const [graphData, setGraphData] = useState(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState(null)
  const [viewMode, setViewMode] = useState('graph')
  const [filterMethod, setFilterMethod] = useState('all')

  useEffect(() => {
    buildGraph()
  }, [endpoints, flows, filterMethod])

  const buildGraph = () => {
    const nodes = []
    const edges = []
    
    const filteredEndpoints = filterMethod === 'all' 
      ? endpoints 
      : endpoints.filter(e => e.method === filterMethod)
    
    // Add endpoint nodes
    filteredEndpoints.forEach((endpoint, idx) => {
      nodes.push({
        data: {
          id: `endpoint-${idx}`,
          label: `${endpoint.method} ${endpoint.path}`,
          type: 'endpoint',
          method: endpoint.method,
          path: endpoint.path,
          controller: endpoint.controller,
          framework: endpoint.framework,
          middleware: endpoint.middleware
        }
      })
      
      // Add controller node
      if (endpoint.controller && endpoint.controller !== 'unknown') {
        const controllerId = `controller-${endpoint.controller.replace(/[^a-zA-Z0-9]/g, '')}`
        
        if (!nodes.find(n => n.data.id === controllerId)) {
          nodes.push({
            data: {
              id: controllerId,
              label: endpoint.controller,
              type: 'controller',
              file: endpoint.controller_file
            }
          })
        }
        
        edges.push({
          data: {
            id: `edge-${idx}`,
            source: `endpoint-${idx}`,
            target: controllerId,
            relationship: 'handled_by'
          }
        })
      }
    })
    
    setGraphData({ nodes, edges })
  }

  const stylesheet = [
    {
      selector: 'node[type="endpoint"]',
      style: {
        'background-color': (ele) => {
          const method = ele.data('method')
          switch(method) {
            case 'GET': return '#4ec9b0'
            case 'POST': return '#ce9178'
            case 'PUT': return '#569cd6'
            case 'DELETE': return '#f48771'
            default: return '#dcdcaa'
          }
        },
        'label': 'data(label)',
        'width': 120,
        'height': 40,
        'shape': 'round-rectangle',
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#1e1e1e'
      }
    },
    {
      selector: 'node[type="controller"]',
      style: {
        'background-color': '#0e639c',
        'label': 'data(label)',
        'width': 100,
        'height': 35,
        'shape': 'rectangle',
        'font-size': '10px',
        'color': '#ffffff'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#858585',
        'target-arrow-color': '#858585',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(relationship)',
        'font-size': '8px',
        'text-rotation': 'autorotate'
      }
    }
  ]

  const layoutOptions = {
    name: 'dagre',
    fit: true,
    padding: 30,
    animate: true,
    animationDuration: 500,
    rankDir: 'TB',
    nodeSep: 50,
    edgeSep: 10,
    rankSep: 80
  }

  const handleNodeClick = (event) => {
    const node = event.target
    const nodeData = node.data()
    setSelectedEndpoint(nodeData)
  }

  return (
    <div className="api-viz-modal">
      <div className="api-viz-overlay" onClick={onClose}>
        <div className="api-viz-content" onClick={(e) => e.stopPropagation()}>
          <div className="api-viz-header">
            <h2>🔌 API Endpoints: {repoName}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="api-viz-toolbar">
            <div className="view-controls">
              <button 
                className={`view-btn ${viewMode === 'graph' ? 'active' : ''}`}
                onClick={() => setViewMode('graph')}
              >
                📊 Graph View
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                📋 List View
              </button>
            </div>
            
            <div className="filter-controls">
              <label>Method:</label>
              <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                <option value="all">All</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            
            <div className="stats">
              <span>📊 {endpoints.length} endpoints</span>
            </div>
          </div>
          
          <div className="api-viz-body">
            {viewMode === 'graph' && graphData && graphData.nodes.length > 0 && (
              <div className="graph-container">
                <CytoscapeComponent
                  elements={[...graphData.nodes, ...graphData.edges]}
                  stylesheet={stylesheet}
                  layout={layoutOptions}
                  style={{ width: '100%', height: '500px' }}
                  cy={(cy) => {
                    cy.on('tap', 'node', handleNodeClick)
                  }}
                  zoomingEnabled={true}
                  panningEnabled={true}
                  userZoomingEnabled={true}
                  userPanningEnabled={true}
                />
                
                {selectedEndpoint && (
                  <div className="node-details">
                    <h4>Endpoint Details</h4>
                    <div className="detail-row">
                      <strong>Method:</strong> {selectedEndpoint.method}
                    </div>
                    <div className="detail-row">
                      <strong>Path:</strong> {selectedEndpoint.path}
                    </div>
                    <div className="detail-row">
                      <strong>Controller:</strong> {selectedEndpoint.controller || 'N/A'}
                    </div>
                    <div className="detail-row">
                      <strong>Framework:</strong> {selectedEndpoint.framework || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {viewMode === 'list' && (
              <div className="list-view">
                <table className="endpoints-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Controller</th>
                      <th>File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoints.map((endpoint, idx) => (
                      <tr key={idx}>
                        <td className={`method-${endpoint.method.toLowerCase()}`}>
                          {endpoint.method}
                        </td>
                        <td className="path">{endpoint.path}</td>
                        <td>{endpoint.controller || 'N/A'}</td>
                        <td className="file-path">{endpoint.controller_file}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiVisualization