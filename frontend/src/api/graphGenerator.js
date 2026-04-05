import { saveGraphNodes, saveGraphEdges, saveNodeCodeMapping } from './supabase'

// Generate real knowledge graph from file tree
export const generateKnowledgeGraph = async (repoId, fileTree, repoUrl) => {
  const nodes = []
  const edges = []
  const codeMappings = []
  
  // Generate unique ID for repo node
  const repoNodeId = `repo:${repoId}`
  
  // Add root repo node
  nodes.push({
    node_id: repoNodeId,
    node_type: 'repo',
    name: 'Repository Root',
    file_path: null,
    start_line: null,
    end_line: null,
    language: null,
    parent_node_id: null,
    metadata: { isRoot: true }
  })
  
  // Process file tree to create nodes
  const processTree = (items, parentNodeId, parentPath = '') => {
    if (!items || !Array.isArray(items)) return
    
    for (const item of items) {
      const nodeId = `${item.type}:${item.path}`
      const filePath = item.path
      
      // Add node
      nodes.push({
        node_id: nodeId,
        node_type: item.type,
        name: item.name,
        file_path: filePath,
        start_line: item.type === 'file' ? 1 : null,
        end_line: item.type === 'file' ? Math.min(500, Math.floor(item.size / 20)) : null,
        language: getLanguageFromFile(item.name),
        parent_node_id: parentNodeId,
        metadata: { size: item.size }
      })
      
      // Add edge from parent to this node
      edges.push({
        source: parentNodeId,
        target: nodeId,
        type: 'contains',
        metadata: { level: parentPath.split('/').length }
      })
      
      // For files, create code mapping
      if (item.type === 'file') {
        codeMappings.push({
          node_id: nodeId,
          file_path: filePath,
          start_line: 1,
          end_line: Math.min(500, Math.floor(item.size / 20)),
          code_snippet: null // Will be fetched on demand
        })
      }
      
      // Process children if directory
      if (item.type === 'directory' && item.children) {
        processTree(item.children, nodeId, filePath)
      }
    }
  }
  
  processTree(fileTree, repoNodeId)
  
  // Add some sample function relationships (in production, parse actual code)
  // For demo, create connections between related files
  const pythonFiles = nodes.filter(n => n.language === 'python' && n.node_type === 'file')
  
  for (let i = 0; i < pythonFiles.length; i++) {
    for (let j = i + 1; j < pythonFiles.length && j < i + 5; j++) {
      // Create import relationships between Python files in same directory
      if (pythonFiles[i].file_path.split('/').slice(0, -1).join('/') === 
          pythonFiles[j].file_path.split('/').slice(0, -1).join('/')) {
        edges.push({
          source: pythonFiles[i].node_id,
          target: pythonFiles[j].node_id,
          type: 'imports',
          metadata: { confidence: 0.7 }
        })
      }
    }
  }
  
  // Save to Supabase
  await saveGraphNodes(repoId, nodes)
  await saveGraphEdges(repoId, edges)
  
  for (const mapping of codeMappings) {
    await saveNodeCodeMapping(repoId, mapping.node_id, mapping.file_path, mapping.start_line, mapping.end_line)
  }
  
  return { nodes, edges, codeMappings }
}

// Helper function to detect language from file extension
const getLanguageFromFile = (filename) => {
  const ext = filename.split('.').pop()
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown'
  }
  return languageMap[ext] || 'unknown'
}

// Convert graph data to Cytoscape format
export const graphToCytoscape = (nodes, edges) => {
  const cytoscapeNodes = nodes.map(node => ({
    data: {
      id: node.node_id,
      label: node.name,
      type: node.node_type,
      filePath: node.file_path,
      startLine: node.start_line,
      endLine: node.end_line,
      language: node.language
    }
  }))
  
  const cytoscapeEdges = edges.map(edge => ({
    data: {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      relationship: edge.type
    }
  }))
  
  return { nodes: cytoscapeNodes, edges: cytoscapeEdges }
}