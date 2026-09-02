import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabaseClient';
import { formatToUserTimezone } from '../lib/logging';

// --- Helper Functions ---
const formatUserActivityTitle = (action: string): string => {
    if (!action) return "User Activity";
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};


// --- Data Structure ---
interface LogItem {
    id: string | number;
    date: Date;
    type: 'dev' | 'user';
    title: string;
    content: React.ReactNode;
}


const ChangelogPage: React.FC = () => {
    const [logItems, setLogItems] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const [changelogResponse, activityResponse] = await Promise.all([
                    fetch('/changelog.md'),
                    supabase.from('restore_checkpoints').select('*').order('created_at', { ascending: false }).limit(100)
                ]);

                if (!changelogResponse.ok) throw new Error(`Changelog file fetch failed: ${changelogResponse.status}`);
                if (activityResponse.error) throw new Error(`Activity log fetch failed: ${activityResponse.error.message}`);

                // 1. Parse Developer Changelog (from markdown file)
                const markdownText = await changelogResponse.text();
                const devLogs: LogItem[] = [];
                const entries = markdownText.split('### ').slice(1);
                
                entries.forEach((entry, index) => {
                    const lines = entry.split('\n');
                    const header = lines[0] || '';
                    const body = lines.slice(1).join('\n').trim();

                    // FIX: Corrected regex to handle the specific date and time format in the markdown file.
                    const dateMatch = header.match(/Date: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
                    const title = header.replace(/ Date: .*/, '').trim();
                    
                    const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString();
                    const date = new Date(dateStr);
                    
                    if (!isNaN(date.getTime())) {
                        devLogs.push({
                            id: `dev-${index}`,
                            date,
                            type: 'dev',
                            title,
                            content: body, // Will be rendered by markdown component
                        });
                    }
                });

                // 2. Parse User Activity Log (from Supabase)
                // FIX: Added filtering to ignore log entries that are missing an action_type.
                const userLogs: LogItem[] = (activityResponse.data || [])
                  .filter((item: any) => item.action_type) // Filter out entries without an action_type
                  .map((item: any) => ({
                    id: item.id,
                    date: new Date(item.created_at),
                    type: 'user',
                    title: formatUserActivityTitle(item.action_type),
                    content: <pre className="text-xs bg-gray-900/50 p-3 rounded-md whitespace-pre-wrap">{JSON.stringify(item.metadata, null, 2)}</pre>
                }));

                // 3. Merge and Sort
                const allLogs = [...devLogs, ...userLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
                setLogItems(allLogs);

            } catch (e) {
                const err = e as Error;
                console.error("Failed to fetch logs:", err);
                setError(`Could not load logs: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[calc(100vh-80px)] text-center">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="ml-4 text-lg text-gray-400">Loading Combined Changelog...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full min-h-[calc(100vh-80px)] text-center text-red-400 p-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 text-white">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold">Changelog & Activity</h1>
                <p className="text-gray-400 mt-2">A unified timeline of application updates and your portfolio activity.</p>
            </div>

            <div className="relative pl-8">
                <div className="absolute left-0 h-full w-0.5 bg-gray-700 top-2"></div>
                {logItems.map(item => (
                    <div key={item.id} className="relative mb-8">
                        <div className={`absolute -left-[42px] top-1.5 w-5 h-5 rounded-full border-4 border-[#0F172A] shadow-lg ${item.type === 'dev' ? 'bg-blue-500 shadow-blue-500/30' : 'bg-green-500 shadow-green-500/30'}`}></div>
                        <h3 className="text-xl font-bold text-white flex items-baseline gap-3 flex-wrap">
                            <span>{item.title}</span>
                            <span className="text-sm font-normal text-gray-400">{formatToUserTimezone(item.date)}</span>
                        </h3>
                        <div className="mt-2 text-gray-300">
                           {item.type === 'dev' ? 
                                <DevLogContent markdown={item.content as string} /> :
                                item.content
                           }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const DevLogContent: React.FC<{ markdown: string }> = ({ markdown }) => {
    const tagColors: { [key: string]: string } = {
        '✨ New Feature': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        '🚀 Enhancement': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        '💅 UI Improvement': 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
        '🔧 Refactor': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        '🌱 Data Seeding': 'bg-green-500/20 text-green-300 border border-green-500/30',
        '🤖 AI Integration': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
        '📊 Logging': 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        '🛠️ Code Quality': 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
        '🎉 Initial Release': 'bg-lime-500/20 text-lime-300 border border-lime-500/30',
        '⚙️ Backend': 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
        '✅ Bug Fix': 'bg-red-500/20 text-red-300 border border-red-500/30',
        '🐞 Issue Found': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
        '🐞 Root Cause': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
        '⚡ Performance': 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    };
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                ul: ({ node, ...props }) => <div {...props} />,
                li: ({ node, ...props }) => {
                    // FIX: Safely extract text from children instead of using a custom getNodeText function
                    const text = (props.children as any[])?.reduce((acc: string, child: any) => {
                        if (typeof child === 'string') {
                            return acc + child;
                        }
                        if (child?.props?.children) {
                            return acc + (Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children);
                        }
                        return acc;
                    }, '') || '';
                    // FIX: Expanded regex to include more tags for better rendering.
                    const tagMatch = text.match(/^(✨ New Feature|🚀 Enhancement|💅 UI Improvement|🔧 Refactor|🌱 Data Seeding|🤖 AI Integration|📊 Logging|🛠️ Code Quality|🎉 Initial Release|⚙️ Backend|✅ Bug Fix|🐞 Issue Found|🐞 Root Cause|⚡ Performance):/);
                    const tag = tagMatch ? tagMatch[1] : null;
                    const restOfText = tag ? text.substring(tag.length + 1).trim() : text;

                    return (
                        <div className="flex items-start space-x-3 py-0.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
                            <span className="text-blue-400 mt-1">◆</span>
                            <div>
                                {tag && (
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-2 mb-1 ${tagColors[tag] || 'bg-gray-600'}`}>
                                        {tag}
                                    </span>
                                )}
                                <p className="text-gray-300 inline">{restOfText}</p>
                            </div>
                        </div>
                    );
                },
                p: ({ node, ...props }) => <p className="inline" {...props} />,
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
};


export default ChangelogPage;