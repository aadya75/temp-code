import { useState, useCallback, useRef } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const useCodeFetcher = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [content, setContent] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchCode = useCallback(async (repoId, filePath, options = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/code/${encodeURIComponent(repoId)}/${encodeURIComponent(filePath)}`;

      const response = await fetch(url, {
        signal: abortController.signal,
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch code");
      }

      setContent(result.data);
      return result.data;
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
        console.error("Error fetching code:", err);
      }
      return null;
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const fetchBatch = useCallback(async (repoId, filePaths) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/code/batch/${repoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePaths }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMapping = useCallback(async (repoId, nodeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/map/${repoId}/${nodeId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      console.error("Error fetching mapping:", err);
      return null;
    }
  }, []);

  const clearContent = useCallback(() => {
    setContent(null);
    setError(null);
  }, []);

  return {
    fetchCode,
    fetchBatch,
    fetchMapping,
    loading,
    error,
    content,
    clearContent,
  };
};
