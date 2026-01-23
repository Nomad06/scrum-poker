import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '../config/api';
import type { JiraIssue } from '../types';

interface JiraSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (issue: JiraIssue) => void;
}

export function JiraSearchModal({ isOpen, onClose, onSelect }: JiraSearchModalProps) {
    const [query, setQuery] = useState('');
    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const searchIssues = useCallback(async (q: string) => {
        if (!q.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            // Use query string
            const response = await fetch(buildApiUrl(`api/jira/search?q=${encodeURIComponent(q)}`));
            if (!response.ok) throw new Error('Failed to search Jira');

            const data = await response.json();
            setIssues(data.issues || []);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch issues. Check backend config.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchIssues(query);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="wanted-poster w-full max-w-lg shadow-2xl relative z-10"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl text-wood-800">🔍 Find Wanted Ticket</h2>
                                <button
                                    onClick={onClose}
                                    className="text-wood-500 hover:text-wood-800 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search by key (PROJ-123) or summary..."
                                    className="flex-1 px-4 py-2 border-2 border-wood-400 rounded bg-sand-100 text-wood-800 placeholder-wood-400 focus:outline-none focus:border-leather-500"
                                    autoFocus
                                />
                                <button
                                    onClick={() => searchIssues(query)}
                                    disabled={isLoading || !query.trim()}
                                    className="btn-western px-6 py-2 disabled:opacity-50"
                                >
                                    {isLoading ? '...' : 'Search'}
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 text-leather-600 bg-leather-50 p-2 rounded text-center text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                                {issues.length > 0 ? (
                                    issues.map(issue => (
                                        <button
                                            key={issue.key}
                                            onClick={() => onSelect(issue)}
                                            className="w-full text-left p-3 rounded border border-wood-300 hover:bg-sand-200 hover:border-wood-500 transition-colors group"
                                        >
                                            <div className="font-mono text-sm font-bold text-wood-700 group-hover:text-leather-700">
                                                {issue.key}
                                            </div>
                                            <div className="text-wood-800 text-sm truncate">
                                                {issue.summary}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    !isLoading && query && !error && (
                                        <div className="text-center text-wood-400 py-8 italic">
                                            No tickets found in these parts...
                                        </div>
                                    )
                                )}

                                {issues.length === 0 && !query && (
                                    <div className="text-center text-wood-400 py-8 italic">
                                        Enter text to search the Jira archives...
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
