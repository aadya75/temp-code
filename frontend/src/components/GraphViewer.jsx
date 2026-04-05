import React, { useState, useCallback } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import MonacoCodeViewer from "./MonacoCodeViewer";
import "./GraphViewer.css";

const GraphViewer = ({ graphData, repoId }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const cyRef = React.useRef(null);

  // Handle node hover - show code preview after delay
  const handleNodeHover = useCallback(
    (event) => {
      const node = event.target;
      const nodeData = node.data();

      // Clear previous timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }

      // Set new timeout to load code after 500ms hover
      const timeout = setTimeout(() => {
        setSelectedNode(nodeData);
        setCurrentNodeId(nodeData.id);
        setCurrentFile(nodeData.filePath);
        setShowCodeViewer(true);
      }, 500);

      setHoverTimeout(timeout);
    },
    [hoverTimeout],
  );

  // Handle node leave - don't close immediately, let user move to viewer
  const handleNodeLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Don't close here - let user interact with code viewer
  }, [hoverTimeout]);

  // Handle node click - open code viewer immediately
  const handleNodeClick = useCallback((event) => {
    const node = event.target;
    const nodeData = node.data();

    setSelectedNode(nodeData);
    setCurrentNodeId(nodeData.id);
    setCurrentFile(nodeData.filePath);
    setShowCodeViewer(true);
  }, []);

  // Close code viewer
  const handleCloseViewer = () => {
    setShowCodeViewer(false);
    setSelectedNode(null);
    setCurrentFile(null);
    setCurrentNodeId(null);
  };

  // Cytoscape styles
  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#0e639c",
        label: "data(label)",
        "font-size": "10px",
        width: "mapData(degree, 0, 10, 30, 60)",
        height: "mapData(degree, 0, 10, 30, 60)",
        "text-valign": "center",
        "text-halign": "center",
        color: "#ffffff",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#ce9178",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#858585",
        "target-arrow-color": "#858585",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        opacity: 0.6,
      },
    },
  ];

  const layout = {
    name: "cose",
    fit: true,
    padding: 30,
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 10000,
    idealEdgeLength: 100,
  };

  return (
    <div className="graph-viewer">
      <div className="graph-container">
        <CytoscapeComponent
          elements={graphData}
          stylesheet={stylesheet}
          layout={layout}
          style={{ width: "100%", height: "100%", background: "#1e1e1e" }}
          cy={(cy) => {
            cyRef.current = cy;
          }}
          onMouseover={handleNodeHover}
          onMouseout={handleNodeLeave}
          onClick={handleNodeClick}
          wheelSensitivity={0.5}
        />
      </div>

      {showCodeViewer && currentFile && (
        <div className="code-viewer-panel">
          <MonacoCodeViewer
            repoId={repoId}
            filePath={currentFile}
            nodeId={currentNodeId}
            onClose={handleCloseViewer}
            readOnly={true}
          />
        </div>
      )}
    </div>
  );
};

export default GraphViewer;
