import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Save analyzed repo to database
export const saveAnalysis = async (userId, repoData, fileTree) => {
  const { data, error } = await supabase
    .from('analyzed_repos')
    .insert([{
      user_id: userId,
      repo_url: repoData.html_url,
      repo_name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      file_tree: fileTree,
      analyzed_at: new Date().toISOString()
    }])
    .select()
  
  if (error) throw error
  return data[0]
}

// Get user's analysis history
export const getAnalysisHistory = async (userId) => {
  const { data, error } = await supabase
    .from('analyzed_repos')
    .select('*')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Get single analysis by ID
export const getAnalysisById = async (analysisId) => {
  const { data, error } = await supabase
    .from('analyzed_repos')
    .select('*')
    .eq('id', analysisId)
    .single()
  
  if (error) throw error
  return data
}

// Delete analysis
export const deleteAnalysis = async (analysisId) => {
  const { error } = await supabase
    .from('analyzed_repos')
    .delete()
    .eq('id', analysisId)
  
  if (error) throw error
  return true
}

// Save knowledge graph
export const saveKnowledgeGraph = async (repoId, graphData) => {
  const { data, error } = await supabase
    .from('knowledge_graphs')
    .insert([{
      repo_id: repoId,
      graph_data: graphData,
      nodes_count: graphData.nodes?.length || 0,
      edges_count: graphData.edges?.length || 0
    }])
    .select()
  
  if (error) throw error
  return data[0]
}

// Get knowledge graph
export const getKnowledgeGraph = async (repoId) => {
  const { data, error } = await supabase
    .from('knowledge_graphs')
    .select('*')
    .eq('repo_id', repoId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (error) throw error
  return data[0]
}



// ============ NEW GRAPH FUNCTIONS ============

// Save graph nodes
export const saveGraphNodes = async (repoId, nodes) => {
  const nodesToInsert = nodes.map(node => ({
    repo_id: repoId,
    node_id: node.node_id,
    node_type: node.node_type,
    name: node.name,
    file_path: node.file_path,
    start_line: node.start_line,
    end_line: node.end_line,
    language: node.language,
    parent_node_id: node.parent_node_id,
    metadata: node.metadata || {}
  }))
  
  const { data, error } = await supabase
    .from('graph_nodes')
    .upsert(nodesToInsert, { onConflict: 'repo_id,node_id' })
    .select()
  
  if (error) throw error
  return data
}

// Save graph edges
export const saveGraphEdges = async (repoId, edges) => {
  const edgesToInsert = edges.map(edge => ({
    repo_id: repoId,
    source_node_id: edge.source,
    target_node_id: edge.target,
    edge_type: edge.type,
    metadata: edge.metadata || {}
  }))
  
  const { data, error } = await supabase
    .from('graph_edges')
    .upsert(edgesToInsert, { onConflict: 'repo_id,source_node_id,target_node_id,edge_type' })
    .select()
  
  if (error) throw error
  return data
}

// Get graph for visualization
export const getGraph = async (repoId) => {
  // Get all nodes
  const { data: nodes, error: nodesError } = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('repo_id', repoId)
  
  if (nodesError) throw nodesError
  
  // Get all edges
  const { data: edges, error: edgesError } = await supabase
    .from('graph_edges')
    .select('*')
    .eq('repo_id', repoId)
  
  if (edgesError) throw edgesError
  
  return { nodes, edges }
}

// Get node by ID with code mapping
export const getNodeWithCode = async (repoId, nodeId) => {
  // Get node details
  const { data: node, error: nodeError } = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('repo_id', repoId)
    .eq('node_id', nodeId)
    .single()
  
  if (nodeError) throw nodeError
  
  // Get code mapping
  const { data: codeMapping, error: codeError } = await supabase
    .from('node_code_mapping')
    .select('*')
    .eq('repo_id', repoId)
    .eq('node_id', nodeId)
    .maybeSingle()
  
  return { node, codeMapping }
}

// Save node code mapping
export const saveNodeCodeMapping = async (repoId, nodeId, filePath, startLine, endLine, codeSnippet = null) => {
  const { data, error } = await supabase
    .from('node_code_mapping')
    .upsert({
      node_id: nodeId,
      repo_id: repoId,
      file_path: filePath,
      start_line: startLine,
      end_line: endLine,
      code_snippet: codeSnippet,
      last_accessed: new Date().toISOString()
    }, { onConflict: 'node_id,repo_id' })
    .select()
  
  if (error) throw error
  return data
}

// Get function callers (who calls this function)
export const getFunctionCallers = async (repoId, functionNodeId) => {
  const { data, error } = await supabase
    .from('graph_edges')
    .select(`
      source_node_id,
      graph_nodes!source_node_id (*)
    `)
    .eq('repo_id', repoId)
    .eq('target_node_id', functionNodeId)
    .eq('edge_type', 'calls')
  
  if (error) throw error
  return data
}

// Get function callees (who this function calls)
export const getFunctionCallees = async (repoId, functionNodeId) => {
  const { data, error } = await supabase
    .from('graph_edges')
    .select(`
      target_node_id,
      graph_nodes!target_node_id (*)
    `)
    .eq('repo_id', repoId)
    .eq('source_node_id', functionNodeId)
    .eq('edge_type', 'calls')
  
  if (error) throw error
  return data
}

// Delete graph data for a repo
export const deleteGraphData = async (repoId) => {
  // Delete in correct order (edges first due to foreign keys)
  await supabase.from('graph_edges').delete().eq('repo_id', repoId)
  await supabase.from('graph_nodes').delete().eq('repo_id', repoId)
  await supabase.from('node_code_mapping').delete().eq('repo_id', repoId)
  
  return true
}