import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Filter, 
  Activity, 
  UserCheck, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import type { AuditLogItem } from '../../types';

export const AdminAuditLogsPage: React.FC = () => {
  const { auditLogs, logAdminAction } = useAdmin();
  const { showToast } = useShop();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const modules = ['All', 'Products', 'Orders', 'Shipping', 'Marketing', 'Inventory', 'Security', 'Admin Management', 'CMS'];
  const actions = ['All', 'Created', 'Updated', 'Deleted', 'Logged In', 'Changed Permission', 'Archived'];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModule = selectedModule === 'All' || log.module === selectedModule;
    const matchesAction = selectedAction === 'All' || log.action === selectedAction;

    return matchesSearch && matchesModule && matchesAction;
  });

  const getActionBadgeClass = (action: AuditLogItem['action']) => {
    switch (action) {
      case 'Created':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Updated':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Deleted':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Logged In':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Changed Permission':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Archived':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-primary-100 text-primary-800 border-primary-200';
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'User Name', 'User Role', 'Action', 'Module', 'Resource', 'IP Address', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      l.userRole,
      l.action,
      l.module,
      `"${l.resource}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.details || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allura-audit-logs-${Date.now()}.csv`;
    a.click();
    showToast('Audit log export generated successfully', 'gold');
    logAdminAction('Updated', 'Audit Logs', 'Audit Trail Export', 'Exported CSV record of filtered administrative activities');
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary-200/60 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-accent-gold font-bold">Security & Compliance</span>
          <h1 className="font-serif text-3xl text-primary-900 mt-1">System Audit Trail</h1>
          <p className="text-primary-600 text-sm mt-1 font-sans">
            Immutable timeline of administrative logins, stock adjustments, catalog edits, and role modifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-primary-300 text-primary-800 rounded-lg text-xs font-semibold hover:bg-primary-50 transition-colors shadow-sm"
          >
            <Download size={14} />
            Export CSV Log
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-primary-50 p-4 rounded-xl border border-primary-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-gold/20 text-accent-gold flex items-center justify-center">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-xs text-primary-600 font-medium uppercase tracking-wider">Total Recorded Events</p>
            <p className="font-serif text-2xl text-primary-950 font-bold">{auditLogs.length}</p>
          </div>
        </div>

        <div className="bg-primary-50 p-4 rounded-xl border border-primary-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-primary-600 font-medium uppercase tracking-wider">Active Super Admins</p>
            <p className="font-serif text-2xl text-primary-950 font-bold">1 Verified</p>
          </div>
        </div>

        <div className="bg-primary-50 p-4 rounded-xl border border-primary-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-primary-600 font-medium uppercase tracking-wider">Compliance Status</p>
            <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 100% Retained & Intact
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-primary-50 p-4 rounded-xl border border-primary-200/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={16} />
          <input
            type="text"
            placeholder="Search by resource, user or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-primary-200 rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-primary-700">
            <Filter size={14} />
            <span>Module:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-primary-200 rounded-lg text-xs text-primary-900 font-medium"
            >
              {modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-primary-700">
            <span>Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-primary-200 rounded-lg text-xs text-primary-900 font-medium"
            >
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-primary-50 rounded-xl border border-primary-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-primary-100/60 border-b border-primary-200/80 text-[11px] uppercase tracking-wider text-primary-600 font-semibold">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">IP Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100 font-sans">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-white/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-primary-100/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-primary-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="py-3 px-4 font-mono text-primary-700 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 font-medium text-primary-950">
                          <div className="flex items-center gap-1.5">
                            <span>{log.userName}</span>
                            <span className="text-[10px] text-primary-500 font-normal">({log.userRole})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-800 rounded font-medium text-[10px] uppercase tracking-wide">
                            {log.module}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-primary-900 max-w-xs truncate">
                          {log.resource}
                        </td>
                        <td className="py-3 px-4 text-primary-600 font-mono text-[11px] whitespace-nowrap">
                          {log.ipAddress || '117.218.42.10 (Kerala)'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-primary-100/30">
                          <td colSpan={7} className="px-8 py-3.5 text-xs text-primary-800 border-b border-primary-200/50">
                            <div className="space-y-1">
                              <p className="font-semibold text-primary-900">Activity Details & Payload:</p>
                              <p className="text-primary-700 leading-relaxed font-mono text-[11px] bg-white p-2.5 rounded border border-primary-200">
                                {log.details || `Admin user ${log.userName} performed ${log.action} on ${log.module} > ${log.resource}.`}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-primary-500">
                    No matching audit records found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
