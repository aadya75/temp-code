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