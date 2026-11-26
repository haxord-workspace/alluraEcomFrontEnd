import api from './api';
import type { SavedAddress } from '../types';

// Helper to map backend _id to frontend id
const mapAddress = (addr: any): SavedAddress => {
  if (!addr) return addr;
  return {
    ...addr,
    id: addr.id || addr._id, // fallback to _id if id doesn't exist
  };
};

export const getAddresses = async (): Promise<SavedAddress[]> => {
  const response = await api.get('/customer/addresses');
  const data = response.data.data || response.data;
  return Array.isArray(data) ? data.map(mapAddress) : [];
};

export const getAddress = async (addressId: string): Promise<SavedAddress> => {
  const response = await api.get(`/customer/addresses/${addressId}`);
  const data = response.data.data || response.data;
  return mapAddress(data);
};

export const addAddress = async (data: Omit<SavedAddress, 'id'>): Promise<SavedAddress> => {
  const response = await api.post('/customer/addresses', data);
  const respData = response.data.data || response.data;
  return mapAddress(respData);
};

export const updateAddress = async (addressId: string, data: Partial<SavedAddress>): Promise<SavedAddress> => {
  const response = await api.patch(`/customer/addresses/${addressId}`, data);
  const respData = response.data.data || response.data;
  return mapAddress(respData);
};

export const deleteAddress = async (addressId: string): Promise<void> => {
  await api.delete(`/customer/addresses/${addressId}`);
};
