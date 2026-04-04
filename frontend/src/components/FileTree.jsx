import { useState } from 'react'
import './FileTree.css'

const FileTree = ({ treeData, onFileSelect, selectedFile }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set())

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()
    const icons = {
      js: '📜',
      jsx: '⚛️',
      ts: '📘',
      tsx: '⚛️',
      css: '🎨',
      scss: '🎨',
      html: '🌐',
      json: '📦',
      md: '📝',
      py: '🐍',
      java: '☕',
      go: '🐹',
      rs: '🦀',
      php: '🐘',
      rb: '💎',
      vue: '🖖',
      default: '📄'
    }
    return icons[ext] || icons.default
  }

  const renderTree = (items, level = 0) => {
    if (!items || items.length === 0) return null
    
    // Sort directories first, then files
    const sorted = [...items].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'directory' ? -1 : 1
    })
    
    return sorted.map((item, index) => {
      const isExpanded = expandedFolders.has(item.path)
      const paddingLeft = level * 20 + 12
      
      if (item.type === 'directory') {
        return (
          <div key={item.path || index} className="tree-item directory">
            <div 
              className="tree-item-content"
              style={{ paddingLeft: `${paddingLeft}px` }}
              onClick={() => toggleFolder(item.path)}
            >
              <span className="folder-icon">
                {isExpanded ? '📂' : '📁'}
              </span>
              <span className="item-name">{item.name}</span>
              <span className="item-count">
                ({item.children?.length || 0})
              </span>
            </div>
            {isExpanded && item.children && (
              <div className="tree-children">
                {renderTree(item.children, level + 1)}
              </div>
            )}
          </div>
        )
      } else {
        return (
          <div 
            key={item.path || index} 
            className={`tree-item file ${selectedFile?.path === item.path ? 'selected' : ''}`}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => onFileSelect(item)}
          >
            <span className="file-icon">{getFileIcon(item.name)}</span>
            <span className="item-name">{item.name}</span>
            {item.size > 0 && (
              <span className="file-size">
                ({(item.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        )
      }
    })
  }

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h3>📁 Explorer</h3>
      </div>
      <div className="file-tree-content">
        {treeData && treeData.length > 0 ? (
          renderTree(treeData)
        ) : (
          <div className="empty-tree">
            <p>No files found</p>
            <p className="empty-tree-sub">The repository might be empty or still loading...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileTree