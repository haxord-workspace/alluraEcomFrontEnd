import React from 'react';
import { X, Printer, Download, Sparkles, CheckCircle } from 'lucide-react';
import { AlluraLogo } from './AlluraLogo';
import { useShop } from '../../context/ShopContext';
import type { Order } from '../../types';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const { formatPrice, showToast } = useShop();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    showToast('Invoice downloaded as PDF mockup', 'gold');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl my-8 p-6 sm:p-10 shadow-2xl space-y-8 animate-slide-up text-stone-800">
        {/* Actions Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 print:hidden">
          <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            TAX INVOICE & BILL OF SUPPLY
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-stone-200 text-xs font-sans text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-allura-darkBrown text-white text-xs font-sans hover:bg-allura-softBrown transition-colors"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          <div>
            <div className="mb-3">
              <AlluraLogo size="md" variant="dark" />
            </div>
            <p className="text-xs text-stone-500 font-sans leading-relaxed">
              <strong>Allura Boutique Pvt. Ltd.</strong><br />
              Flagship Atelier: Ooty Road, Perinthalmanna<br />
              Malappuram District, Kerala — 679322<br />
              GSTIN: 32AABCA1234F1Z9 | contact@alluraboutique.in<br />
              WhatsApp Concierge: +91 90379 91774
            </p>
          </div>

          <div className="text-right sm:text-right space-y-1 w-full sm:w-auto">
            <p className="text-xs font-sans uppercase tracking-wider text-stone-400 font-semibold">Invoice No</p>
            <p className="font-serif text-lg font-bold text-allura-darkBrown">{order.orderNumber}</p>
            <p className="text-xs text-stone-500">Date: {order.date}</p>
            <p className="text-xs text-stone-500">Payment: {order.paymentMethod} ({order.paymentStatus})</p>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium">
              <CheckCircle size={12} />
              <span>Paid in Full</span>
            </div>
          </div>
        </div>

        {/* Billed To & Shipped To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-stone-50 border border-stone-100 text-xs font-sans">
          <div>
            <p className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-1">Billed & Delivered To:</p>
            <p className="font-semibold text-stone-800">{order.shippingAddress.fullName}</p>
            <p className="text-stone-600 leading-relaxed">
              {order.shippingAddress.addressLine1}, {order.shippingAddress.addressLine2 && `${order.shippingAddress.addressLine2}, `}
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}<br />
              Country: {order.shippingAddress.country}<br />
              Contact: {order.shippingAddress.phone.countryCode} {order.shippingAddress.phone.number}
            </p>
          </div>

          <div>
            <p className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-1">Dispatch Logistics:</p>
            <p className="text-stone-600 leading-relaxed">
              Courier: <strong>{order.tracking?.courier || 'Delhivery Luxury Express'}</strong><br />
              AWB: <strong className="font-mono text-stone-800">{order.tracking?.awb || 'DLHV894719283IN'}</strong><br />
              Service: Express Insured Boutique Delivery<br />
              Estimated Delivery: {order.tracking?.estimatedDelivery || '3 Days'}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b-2 border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5">SKU / Size</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {order.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50">
                  <td className="py-3 pr-2">
                    <p className="font-medium text-stone-800">{item.product.name}</p>
                    <p className="text-[11px] text-stone-400">Color: {item.selectedColor.name}</p>
                  </td>
                  <td className="py-3 text-stone-600 font-mono text-[11px]">
                    {item.sku} ({item.selectedSize})
                  </td>
                  <td className="py-3 text-center text-stone-800">{item.quantity}</td>
                  <td className="py-3 text-right text-stone-800">{formatPrice(item.unitPrice)}</td>
                  <td className="py-3 text-right font-medium text-stone-900">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-stone-200 gap-6">
          <div className="text-xs text-stone-500 font-sans max-w-sm space-y-2">
            <div className="flex items-center gap-1 text-allura-goldDark font-semibold">
              <Sparkles size={14} />
              <span>Authentic Handcrafted Guarantee</span>
            </div>
            <p>
              Thank you for choosing Allura Boutique. This garment has been tailored with artisanal care. All luxury taxes included.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs font-sans">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Coupon ({order.couponCode || 'PROMO'}):</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Shipping & Insurance:</span>
              <span>{order.shippingFee === 0 ? 'Complimentary' : formatPrice(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>Integrated GST (5%):</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between text-base font-serif font-bold text-stone-900 pt-2 border-t border-stone-200">
              <span>Total Amount:</span>
              <span className="text-allura-goldDark">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="flex justify-between items-end pt-8 border-t border-dashed border-stone-200 text-stone-400 text-[10px] font-sans">
          <p>This is a computer generated invoice and requires no physical signature.</p>
          <div className="text-right">
            <p className="font-serif text-xs text-stone-700 italic">For Allura Boutique Pvt Ltd</p>
            <p className="uppercase tracking-widest text-[9px]">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};
