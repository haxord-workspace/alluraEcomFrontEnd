import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Edit3, Trash2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import type { SavedAddress } from '../../types';

export const AccountAddressesPage: React.FC = () => {
  const { customer, fetchCustomerAddresses, addCustomerAddress, updateCustomerAddress, deleteCustomerAddress } = useShop();

  useEffect(() => {
    fetchCustomerAddresses();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: 'Home',
    fullName: '',
    phone: { countryCode: '+91', number: '' },
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefaultShipping: false,
    isDefaultBilling: false,
  });

  const handleOpenAdd = () => {
    setEditingAddressId(null);
    setFormData({
      label: 'Home',
      fullName: customer?.name || '',
      phone: { countryCode: '+91', number: customer?.phone?.replace('+91 ', '') || '' },
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: 'Perinthalmanna',
      state: 'Kerala',
      postalCode: '679322',
      country: 'India',
      isDefaultShipping: false,
      isDefaultBilling: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setFormData({
      label: addr.label,
      fullName: addr.fullName,
      phone: { countryCode: addr.phone.countryCode, number: addr.phone.number },
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefaultShipping: addr.isDefaultShipping,
      isDefaultBilling: addr.isDefaultBilling,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      if (editingAddressId) {
        await updateCustomerAddress(editingAddressId, formData);
      } else {
        const isFirst = customer.addresses.length === 0;
        await addCustomerAddress({
          ...formData,
          isDefaultShipping: isFirst || formData.isDefaultShipping,
          isDefaultBilling: isFirst || formData.isDefaultBilling,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      // Handled by context
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div>
        <Link to="/account" className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2">
          <ArrowLeft size={14} />
          <span>Back to Account</span>
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">Manage Addresses</h1>
            <p className="text-xs font-sans text-allura-muted mt-1">Manage your delivery locations and preferences.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add New Address</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customer?.addresses.map((addr) => (
          <div key={addr.id} className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-allura-bgSecondary px-2 py-0.5 rounded text-allura-darkBrown">
                {addr.label}
              </span>
              {addr.isDefaultShipping && (
                <span className="text-[10px] font-sans font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Default Shipping
                </span>
              )}
            </div>

            <div className="text-xs font-sans text-allura-muted leading-relaxed space-y-1">
              <p className="font-bold text-allura-text text-sm">{addr.fullName}</p>
              <p>{addr.addressLine1}</p>
              {addr.addressLine2 && <p>{addr.addressLine2}</p>}
              <p>{addr.city} - {addr.postalCode}</p>
              <p>{addr.state}, {addr.country}</p>
              <p className="pt-2 text-allura-text">
                <span className="font-semibold text-allura-muted">Phone:</span> {addr.phone.countryCode} {addr.phone.number}
              </p>
            </div>
            
            <div className="pt-2 border-t border-allura-border flex gap-3">
              <button 
                onClick={() => handleOpenEdit(addr)}
                className="text-xs font-sans font-bold text-allura-goldDark hover:text-allura-darkBrown flex items-center gap-1 transition-colors"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => deleteCustomerAddress(addr.id)}
                className="text-xs font-sans font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
        {customer?.addresses.length === 0 && (
          <div className="col-span-full py-10 text-center border-2 border-dashed border-allura-border rounded-2xl">
            <MapPin size={32} className="mx-auto text-allura-muted mb-3" />
            <p className="text-sm font-sans font-semibold text-allura-text">No Saved Addresses</p>
            <p className="text-xs font-sans text-allura-muted mt-1">Add an address to speed up checkout.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm">
          <div className="bg-allura-card border border-allura-border rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-luxury max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-xl text-allura-text font-normal">
              {editingAddressId ? 'Edit Address' : 'Add Delivery Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Save As (Label)</label>
                <input
                  type="text"
                  required
                  placeholder="Home, Office, etc."
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone.number}
                  onChange={e => setFormData({ 
                    ...formData, 
                    phone: { ...formData.phone, number: e.target.value } 
                  })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="House/Flat, Street, Area"
                  value={formData.addressLine1}
                  onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={formData.postalCode}
                    onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">State</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl focus:border-allura-gold outline-none"
                />
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefaultShipping}
                  onChange={e => setFormData({ ...formData, isDefaultShipping: e.target.checked })}
                  className="accent-allura-goldDark w-4 h-4 rounded border-allura-border"
                />
                <span className="text-allura-text">Set as default shipping address</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-allura-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-allura-border rounded-xl text-allura-muted font-bold transition-colors hover:bg-allura-bgSecondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
