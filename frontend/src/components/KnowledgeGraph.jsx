import { useState, useEffect, useRef } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import CodePreviewModal from './CodePreviewModal'
import './KnowledgeGraph.css'

cytoscape.use(dagre)

const KnowledgeGraph = ({ repoData, fileTree, repoId, onClose, repoUrl }) => {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [layout, setLayout] = useState('cose')
  const [selectedNode, setSelectedNode] = useState(null)
  const [showCodePreview, setShowCodePreview] = useState(false)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const cyRef = useRef(null)

  // Generate knowledge graph from file tree with line numbers
  const generateGraph = async () => {
    setGenerating(true)
    
    try {
      const nodes = []
      const edges = []
      
      // Add root node
      nodes.push({
        data: { 
          id: repoData.full_name, 
          label: repoData.full_name, 
          type: 'repo',
          filePath: null,
          startLine: null,
          endLine: null
        }
      })
      
      // Process file tree to create nodes with estimated line numbers
      const processTree = (items, parentPath, depth = 0) => {
        if (!items || items.length === 0) return
        
        items.forEach((item, index) => {
          const nodeId = `${repoData.full_name}/${item.path}`
          
          // For files, try to estimate line numbers based on file size
          let startLine = null
          let endLine = null
          
          if (item.type === 'file' && item.size) {
            // Estimate: ~50 lines per KB (rough approximation)
            const estimatedLines = Math.max(1, Math.floor(item.size / 20))
            startLine = 1
            endLine = Math.min(estimatedLines, 500) // Cap at 500 lines
          } else if (item.type === 'directory') {
            // Directories don't have code
            startLine = null
            endLine = null
          }
          
          nodes.push({
            data: { 
              id: nodeId, 
              label: item.name, 
              type: item.type,
              path: item.path,
              filePath: item.type === 'file' ? item.path : null,
              startLine: startLine,
              endLine: endLine,
              size: item.size
            }
          })
          
          // Create edge from parent
          if (parentPath) {
            edges.push({
              data: {
                id: `${parentPath}-${nodeId}`,
                source: parentPath,
                target: nodeId,
                relationship: 'contains'
              }
            })
          } else {
            edges.push({
              data: {
                id: `${repoData.full_name}-${nodeId}`,
                source: repoData.full_name,
                target: nodeId,
                relationship: 'contains'
              }
            })
          }
          
          // Process children if directory
          if (item.type === 'directory' && item.children) {
            processTree(item.children, nodeId, depth + 1)
          }
        })
      }
      
      processTree(fileTree, null)
      
      const graph = { nodes, edges }
      setGraphData(graph)
      
    } catch (error) {
      console.error('Error generating graph:', error)
      alert('Failed to generate knowledge graph')
    } finally {
      setGenerating(false)
    }
  }

  // Handle node click - show code preview for files
  const handleNodeClick = (node) => {
    const nodeData = node.data()
    
    if (nodeData.type === 'file' && nodeData.filePath) {
      setSelectedNode({
        type: nodeData.type,
        label: nodeData.label,
        filePath: nodeData.filePath,
        startLine: nodeData.startLine || 1,
        endLine: nodeData.endLine || 50
      })
      setShowCodePreview(true)
    } else if (nodeData.type === 'directory') {
      // For directories, you could show summary or just log
      console.log('Directory clicked:', nodeData.label)
    }
  }

  // Handle node hover - show tooltip with info
  const handleNodeHover = (node) => {
    // Clear previous timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    
    // Set timeout to show hover info after 500ms
    const timeout = setTimeout(() => {
      const nodeData = node.data()
      setHoveredNode({
        label: nodeData.label,
        type: nodeData.type,
        filePath: nodeData.filePath,
        size: nodeData.size,
        lines: nodeData.startLine ? `${nodeData.startLine}-${nodeData.endLine}` : null
      })
    }, 500)
    
    setHoverTimeout(timeout)
  }

  const handleNodeLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    setHoveredNode(null)
  }

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': (ele) => {
          const type = ele.data('type')
          switch(type) {
            case 'repo': return '#3b82f6'
            case 'directory': return '#8b5cf6'
            case 'file': return '#10b981'
            default: return '#6b7280'
          }
        },
        'label': 'data(label)',
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'width': (ele) => {
          const type = ele.data('type')
          if (type === 'repo') return 80
          if (type === 'directory') return 60
          return 50
        },
        'height': (ele) => {
          const type = ele.data('type')
          if (type === 'repo') return 80
          if (type === 'directory') return 60
          return 50
        },
        'border-width': 2,
        'border-color': 'rgba(255, 255, 255, 0.2)',
        'cursor': 'pointer'
      }
    },
    {
      selector: 'node[type="file"]',
      style: {
        'background-color': '#10b981',
        'shape': 'round-rectangle',
        'cursor': 'pointer'
      }
    },
    {
      selector: 'node[type="directory"]',
      style: {
        'background-color': '#8b5cf6',
        'shape': 'rectangle'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': '#4b5563',
        'target-arrow-color': '#4b5563',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.6
      }
    }
  ]

  const layoutOptions = {
    name: layout,
    fit: true,
    padding: 30,
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 10000,
    idealEdgeLength: 100
  }

  return (
    <>
      <div className="knowledge-graph-modal">
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Knowledge Graph: {repoData.full_name}</h2>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="graph-controls">
                <div className="control-group">
                  <label>Layout:</label>
                  <select value={layout} onChange={(e) => setLayout(e.target.value)}>
                    <option value="cose">Circular</option>
                    <option value="grid">Grid</option>
                    <option value="breadthfirst">Hierarchical</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
                
                {!graphData && !generating && (
                  <button className="generate-btn" onClick={generateGraph}>
                    Generate Knowledge Graph
                  </button>
                )}
                
                {(generating || loading) && (
                  <div className="loading-indicator">
                    <div className="spinner-small"></div>
                    <span>{loading ? 'Loading graph...' : 'Generating graph...'}</span>
                  </div>
                )}
                
                {graphData && (
                  <div className="info-text">
                    💡 Click on any file node to see its source code
                  </div>
                )}
              </div>
              
              {graphData && (
                <div className="graph-container">
                  <CytoscapeComponent
                    elements={[...graphData.nodes, ...graphData.edges]}
                    stylesheet={stylesheet}
                    layout={layoutOptions}
                    style={{ width: '100%', height: '600px' }}
                    cy={(cy) => { 
                      cyRef.current = cy
                      cy.on('tap', 'node', (e) => handleNodeClick(e.target))
                      cy.on('mouseover', 'node', (e) => handleNodeHover(e.target))
                      cy.on('mouseout', 'node', () => handleNodeLeave())
                    }}
                    zoomingEnabled={true}
                    panningEnabled={true}
                    userZoomingEnabled={true}
                    userPanningEnabled={true}
                  />
                  
                  {/* Hover Tooltip */}
                  {hoveredNode && (
                    <div className="node-tooltip">
                      <div className="tooltip-header">
                        <span className="tooltip-type">{hoveredNode.type}</span>
                        <strong>{hoveredNode.label}</strong>
                      </div>
                      {hoveredNode.filePath && (
                        <div className="tooltip-path">{hoveredNode.filePath}</div>
                      )}
                      {hoveredNode.lines && (
                        <div className="tooltip-lines">Lines: {hoveredNode.lines}</div>
                      )}
                      {hoveredNode.size && (
                        <div className="tooltip-size">Size: {(hoveredNode.size / 1024).toFixed(2)} KB</div>
                      )}
                      <div className="tooltip-hint">Click to view code →</div>
                    </div>
                  )}
                  
                  <div className="graph-legend">
                    <div className="legend-item">
                      <div className="legend-color repo"></div>
                      <span>Repository</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color directory"></div>
                      <span>Directory</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color file"></div>
                      <span>File (Click to view code)</span>
                    </div>
                  </div>
                </div>
              )}
              
              {!graphData && !generating && (
                <div className="graph-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">🔮</div>
                    <h3>Knowledge Graph</h3>
                    <p>Generate a visual representation of your codebase structure</p>
                    <button className="generate-btn-large" onClick={generateGraph}>
                      Generate Graph
                    </button>
                    <small>Click on any file node to see its source code</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Code Preview Modal */}
      <CodePreviewModal 
        isOpen={showCodePreview}
        onClose={() => setShowCodePreview(false)}
        nodeData={selectedNode}
        repoUrl={repoUrl}
      />
    </>
  )
}

export default KnowledgeGraph