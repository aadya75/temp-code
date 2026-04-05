// frontend/src/utils/fileTreeUtils.js

export const buildFileTree = (files) => {
    const tree = {};
    
    files.forEach(file => {
        const parts = file.path.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                current[part] = {
                    name: part,
                    path: file.path,
                    type: 'file',
                    size: file.size
                };
            } else {
                if (!current[part]) {
                    current[part] = {
                        name: part,
                        path: parts.slice(0, index + 1).join('/'),
                        type: 'directory',
                        children: {}
                    };
                }
                current = current[part].children;
            }
        });
    });
    
    return tree;
};

export const treeToArray = (tree) => {
    const result = [];
    
    const convert = (node) => {
        Object.keys(node).forEach(key => {
            const item = node[key];
            if (item.type === 'file') {
                result.push({
                    name: item.name,
                    path: item.path,
                    type: 'file',
                    size: item.size
                });
            } else if (item.type === 'directory') {
                result.push({
                    name: item.name,
                    path: item.path,
                    type: 'directory',
                    children: []
                });
                if (item.children && Object.keys(item.children).length > 0) {
                    convert(item.children);
                }
            }
        });
    };
    
    convert(tree);
    return result;
};