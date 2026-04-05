// Simple working version of traceability.js
const traceability = {
    traces: [],
    currentTrace: null,

    startTrace(operation, metadata = {}) {
        const traceId = 'trace_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        this.currentTrace = {
            trace_id: traceId,
            operation: operation,
            start_time: new Date().toISOString(),
            end_time: null,
            duration_ms: null,
            spans: [],
            metadata: metadata,
            status: 'running'
        };
        this.traces.unshift(this.currentTrace);
        
        // Keep only last 50 traces
        if (this.traces.length > 50) this.traces.pop();
        
        // Save to localStorage
        localStorage.setItem('traceability_traces', JSON.stringify(this.traces));
        
        console.log('Trace started:', operation);
        return traceId;
    },

    endTrace() {
        if (!this.currentTrace) return null;
        
        this.currentTrace.end_time = new Date().toISOString();
        const start = new Date(this.currentTrace.start_time);
        const end = new Date(this.currentTrace.end_time);
        this.currentTrace.duration_ms = end - start;
        this.currentTrace.status = 'completed';
        
        // Save to localStorage
        localStorage.setItem('traceability_traces', JSON.stringify(this.traces));
        
        console.log('Trace completed:', this.currentTrace.operation, this.currentTrace.duration_ms + 'ms');
        
        const completedTrace = this.currentTrace;
        this.currentTrace = null;
        return completedTrace;
    },

    async traceOperation(name, fn, context = {}) {
        this.startTrace(name, context);
        try {
            const result = await fn();
            this.endTrace();
            return result;
        } catch (error) {
            this.endTrace();
            throw error;
        }
    },

    getAllTraces() {
        // Load from localStorage
        const saved = localStorage.getItem('traceability_traces');
        if (saved) {
            this.traces = JSON.parse(saved);
        }
        return this.traces;
    },

    clearTraces() {
        this.traces = [];
        localStorage.removeItem('traceability_traces');
        console.log('All traces cleared');
    }
};

// Load traces on initialization
traceability.getAllTraces();

// Export for use in components
export { traceability };
export default traceability;

// Make available globally
window.traceability = traceability;
console.log('Traceability loaded!', traceability);