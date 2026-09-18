import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const AdminReturnsPage: React.FC = () => {
  const { returns, updateReturnStatus, scheduleReturnPickup } = useAdmin();
  const [selectedReturnForAction, setSelectedReturnForAction] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'pickup' | 'complete' | null>(null);
  const [pickupDate, setPickupDate] = useState('2026-09-22');

  const handleExecuteAction = () => {
    if (!selectedReturnForAction || !actionType) return;
    if (actionType === 'approve') {
      updateReturnStatus(selectedReturnForAction.id, 'Approved', 'Approved by atelier manager');
    } else if (actionType === 'reject') {
      updateReturnStatus(selectedReturnForAction.id, 'Rejected', 'Return window exceeded or tag missing');
    } else if (actionType === 'pickup') {
      scheduleReturnPickup(selectedReturnForAction.id, pickupDate);
    } else if (actionType === 'complete') {
      updateReturnStatus(selectedReturnForAction.id, 'Exchange Shipped', 'Replacement item dispatched');
    }
    setSelectedReturnForAction(null);
    setActionType(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            AFTER-SALES & EXCHANGES
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Return & Exchange Requests ({returns.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Review size exchange requests, inspect returned garments, and schedule Delhivery reverse pickups.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Total Requests</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{returns.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-amber-700">Pending Review</span>
          <p className="font-serif text-2xl font-bold text-amber-800">
            {returns.filter(r => r.status === 'Request Submitted' || r.status === 'Under Review').length}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-emerald-700">Approved & Scheduled</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">
            {returns.filter(r => r.status === 'Approved' || r.status === 'Pickup Scheduled').length}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Return Window</span>
          <p className="font-serif text-2xl font-bold text-stone-900">7 Days</p>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Return ID & Date</th>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Customer & City</th>
                <th className="p-4">Garment Item</th>
                <th className="p-4">Reason & Preference</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {returns.map(ret => (
                <tr key={ret.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-mono font-bold text-stone-900 uppercase">{ret.id}</p>
                    <p className="text-[10px] text-stone-400">{ret.requestedDate}</p>
                  </td>
                  <td className="p-4 font-serif font-semibold text-stone-800">{ret.orderNumber}</td>
                  <td className="p-4">
                    <p className="font-medium text-stone-900">{ret.customerName}</p>
                    <p className="text-[10px] text-stone-400">{ret.customerPhone}</p>
                    <p className="text-[10px] text-stone-400">{ret.pickupAddress.city}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={ret.items[0]?.image}
                        alt={ret.items[0]?.productName}
                        className="w-10 h-12 object-cover rounded bg-stone-100"
                      />
                      <div>
                        <p className="font-medium text-stone-900 truncate max-w-[150px]">{ret.items[0]?.productName}</p>
                        <p className="text-[10px] text-stone-400 font-mono">Size: {ret.items[0]?.size} (₹{ret.items[0]?.price})</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                      {ret.reason}
                    </span>
                    <p className="text-[11px] text-stone-600 mt-1">
                      {ret.preference} {ret.exchangeSize && `&rarr; Size ${ret.exchangeSize}`}
                    </p>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={ret.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {ret.status === 'Request Submitted' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReturnForAction(ret);
                              setActionType('approve');
                            }}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold uppercase"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReturnForAction(ret);
                              setActionType('reject');
                            }}
                            className="px-2.5 py-1 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {ret.status === 'Approved' && (
                        <button
                          onClick={() => {
                            setSelectedReturnForAction(ret);
                            setActionType('pickup');
                          }}
                          className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold uppercase flex items-center gap-1"
                        >
                          <Truck size={12} />
                          <span>Schedule Reverse Pickup</span>
                        </button>
                      )}

                      {ret.status === 'Pickup Scheduled' && (
                        <button
                          onClick={() => {
                            setSelectedReturnForAction(ret);
                            setActionType('complete');
                          }}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold uppercase"
                        >
                          Ship Replacement
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!selectedReturnForAction && actionType !== 'pickup'}
        onClose={() => {
          setSelectedReturnForAction(null);
          setActionType(null);
        }}
        onConfirm={handleExecuteAction}
        title={`${actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Process'} Return Request`}
        message={`Are you sure you want to proceed with updating return reference ${selectedReturnForAction?.id}?`}
        confirmLabel="Confirm Status Change"
        isDestructive={actionType === 'reject'}
      />

      {/* Pickup scheduling modal */}
      {actionType === 'pickup' && selectedReturnForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs font-sans">
            <h3 className="font-serif text-xl text-stone-900">Schedule Delhivery Reverse Pickup</h3>
            <p className="text-stone-500">
              Assign courier associate for doorstep verification at {selectedReturnForAction.pickupAddress.city}.
            </p>
            <div>
              <label className="block font-bold uppercase text-[10px] text-stone-500 mb-1">Pickup Date</label>
              <input
                type="date"
                value={pickupDate}
                onChange={e => setPickupDate(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReturnForAction(null);
                  setActionType(null);
                }}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className="px-5 py-2 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-wider"
              >
                Confirm Delhivery Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
