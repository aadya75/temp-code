import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useCodeFetcher } from "../hooks/useCodeFetcher";
import "./MonacoCodeViewer.css";

const MonacoCodeViewer = ({
  repoId,
  filePath,
  startLine = 1,
  endLine = null,
  nodeId = null,
  onClose,
  onFileChange,
  readOnly = true,
}) => {
  const editorRef = useRef(null);
  const [editorContent, setEditorContent] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState([]);
  const { fetchCode, fetchMapping, loading, error } = useCodeFetcher();

  // Detect language from file extension
  const detectLanguage = (filePath) => {
    const ext = filePath.split(".").pop().toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      go: "go",
      rs: "rust",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      md: "markdown",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      sql: "sql",
      sh: "shell",
      bash: "shell",
    };
    return languageMap[ext] || "plaintext";
  };

  // Fetch file content from MinIO via backend
  const loadFileContent = async () => {
    if (!repoId || !filePath) return;

    setIsLoading(true);
    try {
      const fileData = await fetchCode(repoId, filePath);

      if (fileData && fileData.content) {
        setEditorContent(fileData.content);
        const detectedLang = detectLanguage(filePath);
        setLanguage(detectedLang);

        // Set up line highlighting if provided
        if (startLine) {
          setHighlightedLines(createLineRange(startLine, endLine || startLine));
        }

        // Notify parent about loaded file
        if (onFileChange) {
          onFileChange({
            filePath,
            content: fileData.content,
            language: detectedLang,
            size: fileData.size,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load file:", err);
      setEditorContent(
        `// Error loading file: ${err.message}\n// Make sure the repository exists in MinIO`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load node mapping if nodeId provided
  const loadNodeMapping = async () => {
    if (!repoId || !nodeId) return;

    try {
      const mapping = await fetchMapping(repoId, nodeId);
      if (mapping && mapping.filePath) {
        // If mapping has different file path, update it
        if (mapping.filePath !== filePath) {
          // This would trigger a new file load via props change
          if (onFileChange) {
            onFileChange({
              filePath: mapping.filePath,
              startLine: mapping.startLine,
            });
          }
        }
        setHighlightedLines(
          createLineRange(mapping.startLine, mapping.endLine),
        );

        // Scroll to line when editor is ready
        if (editorRef.current) {
          setTimeout(() => {
            editorRef.current.revealLineInCenter(mapping.startLine);
            editorRef.current.setSelection({
              startLineNumber: mapping.startLine,
              startColumn: mapping.startChar || 1,
              endLineNumber: mapping.endLine || mapping.startLine,
              endColumn: mapping.endChar || 1000,
            });
          }, 100);
        }
      }
    } catch (err) {
      console.error("Failed to load node mapping:", err);
    }
  };

  // Create array of line numbers to highlight
  const createLineRange = (start, end) => {
    const lines = [];
    for (let i = start; i <= end; i++) {
      lines.push(i);
    }
    return lines;
  };

  // Editor mount handler
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      readOnly: readOnly,
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      lineNumbers: "on",
      glyphMargin: true,
      folding: true,
      wordWrap: "on",
      renderWhitespace: "selection",
      tabSize: 2,
      renderLineHighlight: "all",
    });

    // Add custom line highlighting
    if (highlightedLines.length > 0) {
      const decorations = highlightedLines.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "highlighted-line",
          glyphMarginClassName: "highlighted-line-glyph",
        },
      }));
      editor.deltaDecorations([], decorations);
    }

    // Trigger line reveal after mount
    if (startLine) {
      setTimeout(() => {
        editor.revealLineInCenter(startLine);
      }, 200);
    }
  };

  // Reload content when file path changes
  useEffect(() => {
    if (filePath) {
      loadFileContent();
    }
  }, [repoId, filePath]);

  // Load mapping when nodeId changes
  useEffect(() => {
    if (nodeId && editorRef.current) {
      loadNodeMapping();
    }
  }, [nodeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === "Escape" && onClose) {
        onClose();
      }
      // Ctrl/Cmd + F for search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        editorRef.current?.focus();
        editorRef.current?.trigger("anyString", "actions.find");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Loading skeleton
  if (isLoading || loading) {
    return (
      <div className="monaco-container loading-container">
        <div className="loading-skeleton">
          <div className="loading-header">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
          <div className="loading-content">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="skeleton-line"></div>
            ))}
          </div>
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading from MinIO...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !editorContent) {
    return (
      <div className="monaco-container error-container">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load File</h3>
          <p>{error}</p>
          <button onClick={loadFileContent} className="retry-btn">
            Retry
          </button>
          <button onClick={onClose} className="close-btn">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="monaco-container">
      <div className="monaco-header">
        <div className="file-info">
          <span className="file-icon">📄</span>
          <span className="file-path" title={filePath}>
            {filePath}
          </span>
          <span className="file-language">{language}</span>
        </div>
        <div className="header-actions">
          {startLine && (
            <div className="line-info">
              Lines {startLine}
              {endLine && endLine !== startLine ? `-${endLine}` : ""}
            </div>
          )}
          {onClose && (
            <button className="close-editor-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={language}
          value={editorContent}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: readOnly,
            automaticLayout: true,
            minimap: { enabled: true, scale: 1 },
            fontSize: 13,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineNumbers: "on",
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            wordWrap: "on",
          }}
        />
      </div>

      <div className="monaco-footer">
        <div className="footer-stats">
          <span>📊 Lines: {editorContent.split("\n").length}</span>
          <span>📦 Size: {Math.round(editorContent.length / 1024)} KB</span>
        </div>
        <div className="footer-actions">
          <button
            onClick={() => {
              navigator.clipboard.writeText(editorContent);
              alert("Code copied to clipboard!");
            }}
            className="footer-btn"
          >
            📋 Copy
          </button>
          <button
            onClick={() =>
              window.open(
                `https://github.com/${repoId}/blob/main/${filePath}`,
                "_blank",
              )
            }
            className="footer-btn"
          >
            🔗 View on GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonacoCodeViewer;
