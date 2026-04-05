import { traceability } from '../utils/traceability';

// Wrap your existing fetchRepoData function
export const fetchRepoData = async (url) => {
    traceability.startTrace('fetch-repo-data', { repoUrl: url });
    try {
        // Your existing code here
        const response = await fetch(`/api/v1/github/repo?url=${encodeURIComponent(url)}`);
        
        // CRITICAL FIX: Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const htmlText = await response.text();
            console.error('Received HTML instead of JSON. First 200 chars:', htmlText.substring(0, 200));
            throw new Error('Backend API returned HTML. Please check if your backend server is running and the endpoint is correct.');
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        traceability.endTrace();
        
        // Ensure consistent return format
        if (data.success !== undefined) {
            return data;
        }
        return { success: true, data: data };
    } catch (error) {
        traceability.endTrace();
        console.error('fetchRepoData error:', error);
        return { success: false, error: error.message };
    }
};

// Wrap fetchRepoTree
export const fetchRepoTree = async (url) => {
    traceability.startTrace('fetch-repo-tree', { repoUrl: url });
    try {
        const response = await fetch(`/api/v1/github/tree?url=${encodeURIComponent(url)}`);
        
        // CRITICAL FIX: Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const htmlText = await response.text();
            console.error('Received HTML instead of JSON. First 200 chars:', htmlText.substring(0, 200));
            throw new Error('Backend API returned HTML. Please check if your backend server is running and the endpoint is correct.');
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        traceability.endTrace();
        
        // Ensure consistent return format
        if (data.success !== undefined) {
            return data;
        }
        return { success: true, data: data.tree || data };
    } catch (error) {
        traceability.endTrace();
        console.error('fetchRepoTree error:', error);
        return { success: false, error: error.message };
    }
};

// Build file tree from flat structure
export const buildFileTree = (files) => {
    if (!files || !Array.isArray(files)) {
        console.warn('buildFileTree received invalid files:', files);
        return {};
    }
    
    const tree = {};
    
    files.forEach(file => {
        if (!file.path) return;
        
        const parts = file.path.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                // This is a file
                if (!current.files) current.files = [];
                current.files.push({
                    name: part,
                    path: file.path,
                    type: 'file',
                    size: file.size || 0,
                    sha: file.sha
                });
            } else {
                // This is a directory
                if (!current.dirs) current.dirs = {};
                if (!current.dirs[part]) {
                    current.dirs[part] = {};
                }
                current = current.dirs[part];
            }
        });
    });
    
    return tree;
};

// Convert tree to array format
export const treeToArray = (tree, parentPath = '') => {
    if (!tree) return [];
    
    const result = [];
    
    // Add directories
    if (tree.dirs) {
        Object.keys(tree.dirs).forEach(dirName => {
            const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName;
            const dirChildren = treeToArray(tree.dirs[dirName], dirPath);
            result.push({
                name: dirName,
                path: dirPath,
                type: 'directory',
                children: dirChildren
            });
        });
    }
    
    // Add files
    if (tree.files) {
        tree.files.forEach(file => {
            result.push({
                ...file,
                type: 'file'
            });
        });
    }
    
    return result;
};

// Optional: Add fetchFileContent if you need it
export const fetchFileContent = async (repoUrl, filePath) => {
    traceability.startTrace('fetch-file-content', { repoUrl, filePath });
    try {
        const response = await fetch(`/api/v1/github/content?url=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(filePath)}`);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Backend API returned HTML instead of JSON');
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const data = await response.json();
        traceability.endTrace();
        return data;
    } catch (error) {
        traceability.endTrace();
        console.error('fetchFileContent error:', error);
        return { success: false, error: error.message };
    }
};