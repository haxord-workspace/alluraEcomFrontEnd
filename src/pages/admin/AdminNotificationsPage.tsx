import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getDashboardNotifications, type NotificationAnalyticsResponse } from '../../service/adminDashboard';

export const AdminNotificationsPage: React.FC = () => {
  const { showToast } = useShop();
  const [templateName, setTemplateName] = useState('Order Confirmation WhatsApp');
  const [channel, setChannel] = useState<'WhatsApp' | 'Email' | 'Push'>('WhatsApp');
  const [subject, setSubject] = useState('Your Allura Boutique Order is Confirmed');
  const [body, setBody] = useState(
    'Dear {{customerName}},\n\nThank you for choosing Allura Boutique. Your handcrafted ensemble {{orderNumber}} for ₹{{amount}} has been placed successfully and is being prepared in our atelier.\n\nTrack shipment: {{trackingUrl}}\n\nWarm regards,\nAllura Atelier Team'
  );
  const [queueMetrics, setQueueMetrics] = useState<NotificationAnalyticsResponse | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const fetchQueueMetrics = async () => {
    setIsLoadingQueue(true);
    try {
      const data = await getDashboardNotifications();
      setQueueMetrics(data);
    } catch (err) {
      console.warn('Could not load notification queue metrics:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueueMetrics();
  }, []);

  const handleTestBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Test ${channel} notification triggered successfully!`, 'gold');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            OMNICHANNEL BROADCAST
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Notifications & Messaging Hub
          </h1>
          <p className="text-xs font-sans text-stone-500">
            WhatsApp business templates, transactional dispatch emails, and customer event triggers.
          </p>
        </div>

        <button
          onClick={fetchQueueMetrics}
          disabled={isLoadingQueue}
          className="p-2 border border-stone-200 hover:border-stone-400 rounded-xl bg-white text-stone-600 transition-colors self-start sm:self-center"
          title="Refresh Queue Metrics"
        >
          <RefreshCw size={14} className={isLoadingQueue ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Queue & Delivery Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-bold uppercase text-stone-400">DISPATCH QUEUE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-900">
            {queueMetrics?.queueStatus || 'ONLINE'}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">
            {queueMetrics?.channelsSupported ? queueMetrics.channelsSupported.join(' · ') : 'EMAIL · WHATSAPP · FCM'}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-sans font-bold uppercase">COMPLETED</span>
            <CheckCircle2 size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-800">
            {queueMetrics?.counts.completed ?? 0}
          </p>
          <p className="text-[11px] text-emerald-700 font-sans">Delivered messages</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-sans font-bold uppercase">IN FLIGHT / WAITING</span>
            <Clock size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {(queueMetrics?.counts.waiting ?? 0) + (queueMetrics?.counts.active ?? 0)}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">
            {queueMetrics?.counts.active ?? 0} active, {queueMetrics?.counts.waiting ?? 0} pending
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] font-sans font-bold uppercase">FAILED RETRIES</span>
            <AlertTriangle size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-rose-800">
            {queueMetrics?.counts.failed ?? 0}
          </p>
          <p className="text-[11px] text-rose-700 font-sans">Undelivered alerts</p>
        </div>
      </div>

      {/* Grid: Templates List & Live Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Templates (1 Col) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs font-sans">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            TRANSACTIONAL TEMPLATES
          </span>
          <div className="space-y-2">
            {[
              { name: 'Order Confirmation WhatsApp', channel: 'WhatsApp', event: 'Order Placed' },
              { name: 'Delhivery Out for Delivery', channel: 'WhatsApp', event: 'Delivery Day' },
              { name: 'Order Delivered & Invoice PDF', channel: 'Email', event: 'Delivered' },
              { name: 'Abandoned Bag Concierge Nudge', channel: 'WhatsApp', event: 'Cart Drop' },
              { name: 'VIP Circle Gold Tier Welcome', channel: 'Email', event: 'Privilege' },
            ].map((tmpl, idx) => (
              <div
                key={idx}
                onClick={() => setTemplateName(tmpl.name)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  templateName === tmpl.name
                    ? 'border-stone-900 bg-stone-50 font-bold'
                    : 'border-stone-100 hover:border-stone-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <p className="text-stone-900">{tmpl.name}</p>
                  <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded font-mono font-normal">
                    {tmpl.channel}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 font-normal mt-0.5">Event: {tmpl.event}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Template Editor (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5 text-xs font-sans">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <h3 className="font-serif text-xl font-normal text-stone-900">{templateName}</h3>
            <div className="flex gap-2">
              {(['WhatsApp', 'Email', 'Push'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    channel === ch ? 'bg-[#561C08] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleTestBroadcast} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Notification Subject / Title
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Message Body (Variables: {'{{customerName}}'}, {'{{orderNumber}}'}, {'{{amount}}'}, {'{{trackingUrl}}'})
              </label>
              <textarea
                rows={6}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Live message preview */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">PREVIEW RENDER</span>
              <p className="whitespace-pre-wrap text-stone-800 font-sans leading-relaxed">
                {body
                  .replace('{{customerName}}', 'Ananya Menon')
                  .replace('{{orderNumber}}', 'ALR-ORD-849201')
                  .replace('{{amount}}', '8,499')
                  .replace('{{trackingUrl}}', 'https://alluraboutique.in/track/DLHV894719283IN')}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
              >
                <Send size={13} />
                <span>Test Broadcast</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
