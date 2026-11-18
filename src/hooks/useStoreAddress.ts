import { useShop } from '../context/ShopContext';

/**
 * The boutique's address from the store settings (GET store settings → boutiqueProfile.address),
 * managed in Admin › Settings. Empty until the settings load, or when no address is set —
 * callers hide the address in that case instead of showing placeholder text.
 */
export const useStoreAddress = () => {
  const { storeSettings } = useShop();
  const address = storeSettings?.boutiqueProfile?.address?.trim() || '';
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : '';
  return { address, mapsUrl };
};
