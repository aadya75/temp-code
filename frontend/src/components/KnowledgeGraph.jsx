import { useState, useEffect, useRef } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import { saveKnowledgeGraph, getKnowledgeGraph } from '../api/supabase'
import './KnowledgeGraph.css'

const KnowledgeGraph = ({ repoData, fileTree, repoId, onClose }) => {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [layout, setLayout] = useState('cose')
  const cyRef = useRef(null)

  // Generate knowledge graph from file tree
  const generateGraph = async () => {
    setGenerating(true)
    
    try {
      // Simulate graph generation from file tree
      // In production, this would call your backend to parse with tree-sitter
      const nodes = []
      const edges = []
      
      // Add root node
      nodes.push({
        data: { id: repoData.full_name, label: repoData.full_name, type: 'repo' }
      })
      
      // Process file tree to create nodes
      const processTree = (items, parentPath) => {
        if (!items || items.length === 0) return
        
        items.forEach(item => {
          const nodeId = `${repoData.full_name}/${item.path}`
          
          nodes.push({
            data: { 
              id: nodeId, 
              label: item.name, 
              type: item.type,
              path: item.path
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
            // Connect to root
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
            processTree(item.children, nodeId)
          }
        })
      }
      
      processTree(fileTree, null)
      
      // Add some sample relationships (in production, parse actual code)
      // For demo, create some random connections between files
      const fileNodes = nodes.filter(n => n.data.type === 'file')
      for (let i = 0; i < Math.min(20, fileNodes.length); i++) {
        const randomIndex = Math.floor(Math.random() * fileNodes.length)
        if (randomIndex !== i && fileNodes[i] && fileNodes[randomIndex]) {
          edges.push({
            data: {
              id: `rel-${i}-${randomIndex}`,
              source: fileNodes[i].data.id,
              target: fileNodes[randomIndex].data.id,
              relationship: 'imports'
            }
          })
        }
      }
      
      const graph = { nodes, edges }
      setGraphData(graph)
      
      // Save to database
      if (repoId) {
        await saveKnowledgeGraph(repoId, graph)
      }
      
    } catch (error) {
      console.error('Error generating graph:', error)
      alert('Failed to generate knowledge graph')
    } finally {
      setGenerating(false)
    }
  }

  // Load existing graph
  const loadGraph = async () => {
    if (!repoId) return
    
    setLoading(true)
    try {
      const existingGraph = await getKnowledgeGraph(repoId)
      if (existingGraph) {
        setGraphData(existingGraph.graph_data)
      }
    } catch (error) {
      console.error('Error loading graph:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGraph()
  }, [repoId])

  const layoutOptions = {
    name: layout,
    fit: true,
    padding: 30,
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 10000,
    idealEdgeLength: 100,
    edges: {
      opacity: 0.6
    }
  }

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(type)',
        'label': 'data(label)',
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 'mapData(degree, 0, 10, 30, 60)',
        'height': 'mapData(degree, 0, 10, 30, 60)'
      }
    },
    {
      selector: 'node[type="repo"]',
      style: {
        'background-color': '#0e639c',
        'width': 60,
        'height': 60,
        'font-size': '12px',
        'font-weight': 'bold'
      }
    },
    {
      selector: 'node[type="directory"]',
      style: {
        'background-color': '#4ec9b0',
        'shape': 'rectangle'
      }
    },
    {
      selector: 'node[type="file"]',
      style: {
        'background-color': '#dcdcaa'
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
        'opacity': 0.6
      }
    },
    {
      selector: 'edge[relationship="imports"]',
      style: {
        'line-color': '#ce9178',
        'target-arrow-color': '#ce9178'
      }
    }
  ]

  return (
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
              
              {!graphData && !loading && !generating && (
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
            </div>
            
            {graphData && (
              <div className="graph-container">
                <CytoscapeComponent
                  elements={[...graphData.nodes, ...graphData.edges]}
                  stylesheet={stylesheet}
                  layout={layoutOptions}
                  style={{ width: '100%', height: '600px' }}
                  cy={(cy) => { cyRef.current = cy }}
                  zoomingEnabled={true}
                  panningEnabled={true}
                  userZoomingEnabled={true}
                  userPanningEnabled={true}
                />
                
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
                    <span>File</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-edge contains"></div>
                    <span>Contains</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-edge imports"></div>
                    <span>Imports/Depends</span>
                  </div>
                </div>
              </div>
            )}
            
            {!graphData && !generating && !loading && (
              <div className="graph-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-icon">🔮</div>
                  <h3>Knowledge Graph</h3>
                  <p>Generate a visual representation of your codebase structure and dependencies</p>
                  <button className="generate-btn-large" onClick={generateGraph}>
                    Generate Graph
                  </button>
                  <small>Note: This analyzes file structure and relationships</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeGraph