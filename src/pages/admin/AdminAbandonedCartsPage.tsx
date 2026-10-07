import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Mail,
  RefreshCw,
  Eye,
  BellOff,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Loader2,
  Clock,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getAdminAbandonedCarts,
  getAdminAbandonedCart,
  suppressAbandonedCart,
  abandonedCartErrorMessage,
} from '../../service/abandonedCarts';
import type { AbandonedCartRecord } from '../../service/abandonedCarts';
import { prettyStatus } from '../../service/orders';

const PAGE_SIZE = 20;

// Backend status values are not documented yet; these are sent as ?status=
const FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Abandoned', value: 'ABANDONED' },
  { label: 'Recovered', value: 'RECOVERED' },
  { label: 'Reminders stopped', value: 'SUPPRESSED' },
];

const inr = (n: number) => `₹ ${Math.round(n).toLocaleString('en-IN')}`;

const timeAgo = (iso?: string) => {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

const formatDateTime = (iso?: string) =>
  iso && !Number.isNaN(new Date(iso).getTime())
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

const isClosed = (c: AbandonedCartRecord) => /RECOVER|SUPPRESS|CONVERT|EXPIRE/i.test(c.status) || !!c.recoveredAt || !!c.suppressedAt;

// Ready-made reminder message (the API has no "send reminder" endpoint, so the admin sends it)
const reminderText = (c: AbandonedCartRecord) => {
  const first = c.items[0]?.name;
  const more = c.items.length > 1 ? ` and ${c.items.length - 1} more` : '';
  return `Hello ${c.customer.name}, you left ${first ? `${first}${more}` : 'some pieces'} in your Allura bag (${inr(c.cartValue)}). They're still waiting for you: ${window.location.origin}/cart`;
};

const whatsappLink = (c: AbandonedCartRecord) => {
  const digits = (c.customer.phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const number = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(reminderText(c))}`;
};

const emailLink = (c: AbandonedCartRecord) =>
  c.customer.email
    ? `mailto:${c.customer.email}?subject=${encodeURIComponent('Your Allura bag is waiting')}&body=${encodeURIComponent(reminderText(c))}`
    : null;

export const AdminAbandonedCartsPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();
  const confirm = useConfirm();
  const canAct = hasPermission('marketing', 'edit');

  const [carts, setCarts] = useState<AbandonedCartRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Details panel
  const [detail, setDetail] = useState<AbandonedCartRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchCarts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminAbandonedCarts({ page, limit: PAGE_SIZE, status: statusFilter || undefined });
      setCarts(result.carts);
      setTotal(result.total);
    } catch (err) {
      setError(abandonedCartErrorMessage(err, 'Failed to load abandoned carts'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  const openDetail = async (cart: AbandonedCartRecord) => {
    setDetail(cart);
    setIsDetailLoading(true);
    try {
      setDetail(await getAdminAbandonedCart(cart.id));
    } catch (err) {
      showToast(abandonedCartErrorMessage(err, 'Could not load cart details'), 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSuppress = async (cart: AbandonedCartRecord) => {
    const ok = await confirm({
      title: 'Stop reminders',
      message: `Stop sending recovery reminders to ${cart.customer.name} for this bag? Use this if they asked not to be contacted or already ordered another way.`,
      confirmLabel: 'Stop reminders',
    });
    if (!ok) return;
    setBusyId(cart.id);
    try {
      const updated = await suppressAbandonedCart(cart.id);
      const next = updated || { ...cart, status: 'SUPPRESSED', suppressedAt: new Date().toISOString() };
      setCarts(prev => prev.map(c => (c.id === cart.id ? next : c)));
      if (detail?.id === cart.id) setDetail(next);
      showToast(`Reminders stopped for ${cart.customer.name}`, 'info');
    } catch (err) {
      showToast(abandonedCartErrorMessage(err, 'Could not stop reminders'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openCarts = carts.filter(c => !isClosed(c));
  const valueAtRisk = openCarts.reduce((sum, c) => sum + c.cartValue, 0);
  const recoveredCount = carts.filter(c => /RECOVER|CONVERT/i.test(c.status) || !!c.recoveredAt).length;
  const remindersSent = carts.reduce((sum, c) => sum + c.reminders.length, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const contactButtons = (cart: AbandonedCartRecord, compact = false) => {
    const wa = whatsappLink(cart);
    const mail = emailLink(cart);
    return (
      <>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 ${compact ? 'p-1.5' : 'px-3 py-1.5'}`}
            title="Send a WhatsApp reminder"
          >
            <MessageCircle size={13} />
            {!compact && <span>WhatsApp</span>}
          </a>
        )}
        {mail && (
          <a
            href={mail}
            className={`border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg font-semibold text-[11px] flex items-center gap-1 ${compact ? 'p-1.5' : 'px-3 py-1.5'}`}
            title="Send an email reminder"
          >
            <Mail size={13} />
            {!compact && <span>Email</span>}
          </a>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CONVERSION RECOVERY
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">Abandoned Carts ({total})</h1>
          <p className="text-xs font-sans text-stone-500">
            Customers who left items in their bag without ordering. Remind them on WhatsApp or email, or stop reminders.
          </p>
        </div>
        <button
          onClick={fetchCarts}
          disabled={isLoading}
          className="self-start sm:self-auto p-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl transition-colors disabled:opacity-50"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats (for the carts on this page) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Abandoned Carts</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{total}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Value at Risk</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{inr(valueAtRisk)}</p>
          {totalPages > 1 && <p className="text-[10px] text-stone-400">this page</p>}
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-emerald-700">Recovered</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">{recoveredCount}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Reminders Sent</span>
          <p className="font-serif text-2xl font-bold text-allura-goldDark">{remindersSent}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${
              statusFilter === f.value ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCarts} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Customer</th>
                <th className="p-4">Bag</th>
                <th className="p-4">Value</th>
                <th className="p-4">Last Activity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && carts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-stone-400">Loading abandoned carts…</td>
                </tr>
              ) : carts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-stone-400">
                    <ShoppingBag size={24} className="mx-auto mb-2 text-stone-300" />
                    {statusFilter ? 'No carts with this status.' : 'No abandoned carts right now.'}
                  </td>
                </tr>
              ) : (
                carts.map(cart => {
                  const closed = isClosed(cart);
                  return (
                    <tr key={cart.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4">
                        <p className="font-serif text-sm font-medium text-stone-900">{cart.customer.name}</p>
                        {cart.customer.phone && <p className="text-[10px] text-stone-400">{cart.customer.phone}</p>}
                        {cart.customer.email && <p className="text-[10px] text-stone-400">{cart.customer.email}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          {cart.items[0]?.image ? (
                            <img src={cart.items[0].image} alt="" className="w-10 h-12 object-cover rounded bg-stone-100" />
                          ) : (
                            <div className="w-10 h-12 rounded bg-stone-100 flex items-center justify-center text-stone-300">
                              <ShoppingBag size={14} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-stone-900 truncate max-w-[160px]">{cart.items[0]?.name || '—'}</p>
                            <p className="text-[10px] text-stone-400">
                              {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-stone-900">{inr(cart.cartValue)}</td>
                      <td className="p-4 text-stone-500" title={formatDateTime(cart.lastActivityAt)}>
                        {timeAgo(cart.lastActivityAt || cart.abandonedAt)}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={prettyStatus(cart.status)} size="sm" />
                        <p className="text-[10px] text-stone-400 mt-1">
                          {cart.reminders.length > 0
                            ? `${cart.reminders.length} reminder${cart.reminders.length === 1 ? '' : 's'} sent`
                            : 'No reminders yet'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {!closed && contactButtons(cart, true)}
                          <button
                            onClick={() => openDetail(cart)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          {canAct && !closed && (
                            <button
                              onClick={() => handleSuppress(cart)}
                              disabled={busyId === cart.id}
                              className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg disabled:opacity-50"
                              title="Stop reminders"
                            >
                              {busyId === cart.id ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 text-xs font-sans text-stone-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/50 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <aside
            className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto text-xs font-sans"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Abandoned cart details"
          >
            <div className="sticky top-0 bg-white border-b border-stone-200 p-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Abandoned bag</p>
                <h3 className="font-serif text-xl text-stone-900">{detail.customer.name}</h3>
                <div className="mt-1">
                  <StatusBadge status={prettyStatus(detail.status)} size="sm" />
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 text-stone-400 hover:text-stone-900" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {isDetailLoading && (
                <p className="flex items-center gap-2 text-stone-400"><Loader2 size={14} className="animate-spin" /> Loading details…</p>
              )}

              {/* Contact */}
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase text-stone-400">Customer</h4>
                {detail.customer.phone && <p className="text-stone-700">{detail.customer.phone}</p>}
                {detail.customer.email && <p className="text-stone-700">{detail.customer.email}</p>}
                {!isClosed(detail) && <div className="flex gap-2 pt-1">{contactButtons(detail)}</div>}
              </section>

              {/* Items */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-stone-400">Items in bag ({detail.itemCount})</h4>
                {detail.items.length === 0 ? (
                  <p className="text-stone-400">No item details available.</p>
                ) : (
                  detail.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-12 h-14 object-cover rounded bg-stone-100" />
                      ) : (
                        <div className="w-12 h-14 rounded bg-stone-100" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-stone-400">
                          {[item.color, item.size && `Size ${item.size}`, item.sku].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500">{inr(item.unitPrice)} × {item.quantity}</p>
                        <p className="font-bold text-stone-900">{inr(item.unitPrice * item.quantity)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-between pt-3 border-t border-stone-100 font-serif text-base font-bold text-stone-900">
                  <span>Bag value</span>
                  <span>{inr(detail.cartValue)}</span>
                </div>
              </section>

              {/* Timeline */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-stone-400">Timeline</h4>
                <ul className="space-y-1.5 text-stone-600">
                  <li className="flex justify-between"><span>Last activity</span><span>{formatDateTime(detail.lastActivityAt)}</span></li>
                  <li className="flex justify-between"><span>Marked abandoned</span><span>{formatDateTime(detail.abandonedAt)}</span></li>
                  {detail.recoveredAt && <li className="flex justify-between text-emerald-700"><span>Recovered</span><span>{formatDateTime(detail.recoveredAt)}</span></li>}
                  {detail.suppressedAt && <li className="flex justify-between"><span>Reminders stopped</span><span>{formatDateTime(detail.suppressedAt)}</span></li>}
                </ul>
              </section>

              {/* Reminders */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-stone-400">Reminders sent</h4>
                {detail.reminders.length === 0 ? (
                  <p className="text-stone-400">No automatic reminders sent yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.reminders.map((r, i) => (
                      <li key={i} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                        <span className="flex items-center gap-1.5 text-stone-700">
                          <Clock size={12} className="text-stone-400" />
                          {prettyStatus(r.channel)}
                          {r.status && <span className="text-stone-400">· {prettyStatus(r.status)}</span>}
                        </span>
                        <span className="text-stone-400">{formatDateTime(r.sentAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {canAct && !isClosed(detail) && (
                <button
                  onClick={() => handleSuppress(detail)}
                  disabled={busyId === detail.id}
                  className="w-full py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <BellOff size={14} />
                  Stop reminders for this bag
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
