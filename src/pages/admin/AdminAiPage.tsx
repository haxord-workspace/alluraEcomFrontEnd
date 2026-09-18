import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminAiPage: React.FC = () => {
  const { aiArticles, addAIArticle } = useAdmin();
  const [activeTab, setActiveTab] = useState<'kb' | 'logs' | 'actions'>('kb');
  const [isAddArticleOpen, setIsAddArticleOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'FAQ' | 'Shipping Policy' | 'Return Policy' | 'Product Sizing' | 'Care & Craft'>('Product Sizing');
  const [content, setContent] = useState('');

  const mockLogs = [
    { id: 'sess-891', customer: 'Ananya Menon', query: 'Where is my order ALR-ORD-849201?', tool: 'Order Lookup', result: 'Success', time: '10 mins ago' },
    { id: 'sess-890', customer: 'Guest Visitor', query: 'I need a modest evening outfit under 6000', tool: 'Product Search', result: '3 Products Suggested', time: '35 mins ago' },
    { id: 'sess-889', customer: 'Dr. Shahina K.', query: 'What size should I pick for 38 bust?', tool: 'Sizing Guide', result: 'Recommended Size L', time: '2 hours ago' },
  ];

  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    addAIArticle({
      title,
      category,
      content,
      status: 'Active',
    });
    setTitle('');
    setContent('');
    setIsAddArticleOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            AI SHOPPING ASSISTANT ENGINE
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            ALLURA AI Knowledge & Logs
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Feed boutique styling rules, review customer AI conversations, and monitor automated product actions.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans font-semibold">
            {[
              { id: 'kb', label: 'Knowledge Base' },
              { id: 'logs', label: 'Conversation Logs' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddArticleOpen(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Add Knowledge Doc</span>
          </button>
        </div>
      </div>

      {/* TAB 1: KNOWLEDGE BASE */}
      {activeTab === 'kb' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aiArticles.map(art => (
            <div
              key={art.id}
              className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded">
                    {art.category}
                  </span>
                  <StatusBadge status={art.status} size="sm" />
                </div>
                <h3 className="font-serif text-xl font-normal text-stone-900">{art.title}</h3>
                <p className="text-stone-600 leading-relaxed">{art.content}</p>
              </div>

              <div className="pt-3 border-t border-stone-100 text-[11px] font-sans text-stone-400">
                <span>Last updated: {art.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CONVERSATION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Session ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">User Inquiry Prompt</th>
                  <th className="p-4">Tool Triggered</th>
                  <th className="p-4">AI Resolution</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {mockLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-stone-900">{log.id}</td>
                    <td className="p-4 font-medium text-stone-800">{log.customer}</td>
                    <td className="p-4 text-stone-700 italic">"{log.query}"</td>
                    <td className="p-4">
                      <span className="font-bold text-allura-goldDark bg-allura-bgSecondary px-2 py-0.5 rounded text-[10px] uppercase">
                        {log.tool}
                      </span>
                    </td>
                    <td className="p-4 text-emerald-800 font-semibold">{log.result}</td>
                    <td className="p-4 text-right text-stone-400">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Article Modal */}
      {isAddArticleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 space-y-4 text-xs font-sans shadow-2xl">
            <h3 className="font-serif text-xl text-stone-900">Add AI Knowledge Document</h3>
            <form onSubmit={handleAddArticle} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Doc Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="E.g. Custom Alteration Policy"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Knowledge Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <option value="Product Sizing">Product Sizing</option>
                  <option value="Care & Craft">Care & Craft</option>
                  <option value="Shipping Policy">Shipping Policy</option>
                  <option value="Return Policy">Return Policy</option>
                  <option value="FAQ">FAQ</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Content & Instructions</label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddArticleOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl font-bold uppercase"
                >
                  Save Knowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
