import React, { useEffect, useRef, useState } from 'react';
import { X, Radio, Loader2, Mail, Smartphone, AlertTriangle } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { broadcastNotification, notificationErrorMessage } from '../../service/notifications';
import type { NotificationSendChannel } from '../../types/notification';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once the broadcast is confirmed enqueued, so the hub can refresh its list. */
  onSent: () => void;
}

const TITLE_MAX = 150;
const MESSAGE_MAX = 1000;

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose, onSent }) => {
  const { showToast } = useShop();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [channels, setChannels] = useState<NotificationSendChannel[]>(['EMAIL']);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmStep, setConfirmStep] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setMessage('');
    setActionUrl('');
    setActionLabel('');
    setChannels(['EMAIL']);
    setFieldErrors({});
    setConfirmStep(false);
    setIsSending(false);
    setError(null);
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleChannel = (channel: NotificationSendChannel) => {
    setChannels(prev => (prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Title is required';
    else if (title.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
    if (!message.trim()) errors.message = 'Message is required';
    else if (message.length > MESSAGE_MAX) errors.message = `Message must be ${MESSAGE_MAX} characters or fewer`;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReview = () => {
    if (!validate()) return;
    setConfirmStep(true);
  };

  const handleConfirm = async () => {
    if (isSending) return; // blocks double clicks — exactly one request per click
    setIsSending(true);
    setError(null);
    try {
      await broadcastNotification({
        title: title.trim(),
        message: message.trim(),
        actionUrl: actionUrl.trim() || undefined,
        actionLabel: actionLabel.trim() || undefined,
        channels: channels.length > 0 ? channels : undefined,
      });
      showToast('Broadcast enqueued for every active customer', 'success');
      onSent();
      onClose();
    } catch (err) {
      setError(notificationErrorMessage(err, 'Could not send the broadcast'));
      setConfirmStep(false);
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !isSending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="broadcast-modal-title"
        onClick={e => e.stopPropagation()}
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-xs font-sans"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 id="broadcast-modal-title" className="font-serif text-xl text-stone-900 flex items-center gap-2">
            <Radio size={18} className="text-allura-goldDark" />
            New broadcast
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 p-1 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {!confirmStep ? (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Diwali Dhamaka — 30% Off Everything!"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
                />
                {fieldErrors.title && <p className="mt-1 text-rose-600">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Celebrate the festival of lights with 30% off your entire order, this weekend only."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800 resize-none"
                />
                {fieldErrors.message && <p className="mt-1 text-rose-600">{fieldErrors.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Action URL (optional)</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={e => setActionUrl(e.target.value)}
                    placeholder="/sale"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Action label (optional)</label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={e => setActionLabel(e.target.value)}
                    placeholder="Shop Now"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1.5">
                  Channels (defaults to Email only)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleChannel('EMAIL')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                      channels.includes('EMAIL')
                        ? 'bg-[#561C08] text-white border-[#561C08]'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <Mail size={13} /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleChannel('PUSH')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                      channels.includes('PUSH')
                        ? 'bg-[#561C08] text-white border-[#561C08]'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <Smartphone size={13} /> Push
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm"
              >
                Review
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <p>
                This will be sent to <strong>all active customers</strong>. Send broadcast?
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700">
              <p className="font-semibold text-stone-900">{title}</p>
              <p className="text-stone-600">{message}</p>
            </div>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStep(false)}
                disabled={isSending}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSending}
                className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSending && <Loader2 size={13} className="animate-spin" />}
                <span>{isSending ? 'Sending…' : 'Confirm & Send'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
