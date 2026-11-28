import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionMatrix } from '../../components/admin/PermissionMatrix';
import {
  Building2,
  Truck,
  Users,
  Save,
  RotateCcw,
  CheckCircle2,
  Activity,
  Server,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Shield,
  // STAFF-ACTIONS-DISABLED START
  // X,
  // Plus,
  // UserCheck,
  // UserX,
  // UserCog,
  // STAFF-ACTIONS-DISABLED END
} from 'lucide-react';
import { getDashboardSystemHealth, type SystemHealthResponse } from '../../service/adminDashboard';
import {
  getBoutiqueSettings,
  updateBoutiqueSettings,
  getAdminStaff,
  // STAFF-ACTIONS-DISABLED START
  // createAdminStaff,
  // updateAdminStaff,
  // STAFF-ACTIONS-DISABLED END
  settingsErrorMessage,
  settingsFieldErrors,
} from '../../service/settings';
import type {
  AdminStaffMember,
  PickupAddress,
  // STAFF-ACTIONS-DISABLED RbacRole,
  SettingsResponse,
  UpdateBoutiqueProfileRequest,
} from '../../types/settings';
import { DispatchAddressForm } from '../../components/admin/DispatchAddressForm';
import {
  EMPTY_PICKUP_ADDRESS_FORM,
  buildPickupAddressPayload,
  parsePickupAddressToForm,
  stripPickupAddressFieldPrefix,
  validatePickupAddressForm,
  type PickupAddressErrors,
  type PickupAddressForm as PickupAddressFormData,
} from '../../utils/pickupAddressValidation';
import { getStaffInitials } from '../../utils/rbac';
import { normalizeMobile } from '../../utils/addressValidation';
import {
  validateBoutiqueSettings,
  legalNameError,
  taglineError,
  whatsappError,
  emailError,
  gstinError,
  addressError,
  freeShippingThresholdError,
  standardShippingFeeError,
  expressShippingFeeError,
  type BoutiqueSettingsForm,
  type BoutiqueSettingsErrors,
} from '../../utils/boutiqueSettingsValidation';

const EMPTY_BOUTIQUE_FORM: BoutiqueSettingsForm = {
  storeName: '',
  tagline: '',
  whatsapp: '',
  email: '',
  gstin: '',
  address: '',
  freeShippingThreshold: '',
  standardShippingFee: '',
  expressShippingFee: '',
};

const renderRoleBadge = (role: AdminStaffMember['role']) => (
  <span
    className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${role === 'SUPER_ADMIN'
      ? 'bg-amber-100 text-amber-900 border border-amber-300'
      : role === 'ADMIN'
        ? 'bg-blue-100 text-blue-900 border border-blue-300'
        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
      }`}
  >
    {role.replace(/_/g, ' ')}
  </span>
);

const renderStatus = (status: AdminStaffMember['status']) =>
  status === 'Active' ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
      <span className="w-2 h-2 rounded-full bg-amber-500"></span> {status}
    </span>
  );

const toForm = (s: SettingsResponse): BoutiqueSettingsForm => ({
  storeName: s.boutiqueProfile?.legalName ?? '',
  tagline: s.boutiqueProfile?.tagline ?? '',
  whatsapp: s.boutiqueProfile?.whatsappNumber ?? '',
  email: s.boutiqueProfile?.supportEmail ?? '',
  gstin: s.boutiqueProfile?.gstin ?? '',
  address: s.boutiqueProfile?.address ?? '',
  freeShippingThreshold:
    s.shipping?.freeShippingMinOrder !== undefined ? String(s.shipping.freeShippingMinOrder) : '',
  standardShippingFee:
    s.shipping?.standardTariff !== undefined ? String(s.shipping.standardTariff) : '',
  expressShippingFee:
    s.shipping?.expressTariff !== undefined ? String(s.shipping.expressTariff) : '',
});

const BACKEND_TO_FORM_FIELD: Record<string, keyof BoutiqueSettingsForm> = {
  legalName: 'storeName',
  storeName: 'storeName',
  tagline: 'tagline',
  whatsappNumber: 'whatsapp',
  whatsapp: 'whatsapp',
  supportEmail: 'email',
  email: 'email',
  gstin: 'gstin',
  address: 'address',
  freeShippingMinOrder: 'freeShippingThreshold',
  freeShippingThreshold: 'freeShippingThreshold',
  standardTariff: 'standardShippingFee',
  standardShippingFee: 'standardShippingFee',
  expressTariff: 'expressShippingFee',
  expressShippingFee: 'expressShippingFee',
};

export const AdminSettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currentAdmin,
    setRole,
    logAdminAction,
  } = useAdmin();
  const { can, role, realRole, roles: availableRoles /* STAFF-ACTIONS-DISABLED , matrix, modules */ } = usePermissions();
  // STAFF-ACTIONS-DISABLED START
  // const [previewStaff, setPreviewStaff] = useState<AdminStaffMember | null>(null);
  // const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  // const [addStaffForm, setAddStaffForm] = useState<{
  //   name: string;
  //   email: string;
  //   role: RbacRole;
  //   password: string;
  // }>({ name: '', email: '', role: 'ADMIN', password: '' });
  // const [addStaffError, setAddStaffError] = useState<string | null>(null);
  // const [isAddingStaff, setIsAddingStaff] = useState(false);
  // const [roleChangeTarget, setRoleChangeTarget] = useState<AdminStaffMember | null>(null);
  // const [selectedNewRole, setSelectedNewRole] = useState<RbacRole>('ADMIN');
  // const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  // const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
  // const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  // STAFF-ACTIONS-DISABLED END
  const { showToast } = useShop();
  const confirm = useConfirm();

  const canViewAdminMatrix =
    role === 'SUPER_ADMIN' || role === 'ADMIN' || can('admin_management', 'view');

  const urlTab = searchParams.get('tab');
  const activeTab: 'store' | 'admins' | 'health' =
    urlTab === 'admins' || (location.pathname.endsWith('/admins') && !urlTab)
      ? 'admins'
      : urlTab === 'health'
        ? 'health'
        : 'store';
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isMatrixDirty, setIsMatrixDirty] = useState(false);

  // Admin staff list — loaded from GET /admin/settings/admins on Admins tab mount
  const [staffList, setStaffList] = useState<AdminStaffMember[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const fetchAdminStaff = useCallback(async () => {
    setIsStaffLoading(true);
    setStaffError(null);
    try {
      const staff = await getAdminStaff();
      setStaffList(staff);
      setIsStaffLoaded(true);
    } catch (err) {
      setStaffError(settingsErrorMessage(err, 'Could not load staff directory'));
    } finally {
      setIsStaffLoading(false);
    }
  }, []);

  const isSelfUser = (u: AdminStaffMember) =>
    Boolean(
      currentAdmin &&
      (u.id === currentAdmin.id ||
        (currentAdmin.email && u.email.toLowerCase() === currentAdmin.email.toLowerCase()))
    );

  // STAFF-ACTIONS-DISABLED START
  // const handleCreateStaff = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!addStaffForm.name.trim() || !addStaffForm.email.trim()) return;
  //   setIsAddingStaff(true);
  //   setAddStaffError(null);
  //   try {
  //     const res = await createAdminStaff(addStaffForm);
  //     showToast(
  //       res.setupEmailSent
  //         ? `Staff member created. Setup link sent to ${res.staff.email}.`
  //         : `Staff member created successfully for ${res.staff.name}.`,
  //       'success'
  //     );
  //     setIsAddStaffOpen(false);
  //     setAddStaffForm({ name: '', email: '', role: 'ADMIN', password: '' });
  //     await fetchAdminStaff();
  //     logAdminAction(
  //       'Created',
  //       'Admin Management',
  //       addStaffForm.email,
  //       `Created staff member with role ${addStaffForm.role}`
  //     );
  //   } catch (err: any) {
  //     const code = err?.response?.data?.error?.code;
  //     if (code === 'EMAIL_ALREADY_EXISTS') {
  //       setAddStaffError('An admin account with this email address already exists.');
  //     } else {
  //       setAddStaffError(settingsErrorMessage(err, 'Failed to create staff account.'));
  //     }
  //   } finally {
  //     setIsAddingStaff(false);
  //   }
  // };
  // const handleOpenChangeRole = (u: AdminStaffMember) => {
  //   setRoleChangeTarget(u);
  //   setSelectedNewRole(u.role);
  //   setRoleChangeError(null);
  // };
  // const handleSubmitChangeRole = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!roleChangeTarget || !selectedNewRole || roleChangeTarget.role === selectedNewRole) {
  //     setRoleChangeTarget(null);
  //     return;
  //   }
  //   if (selectedNewRole === 'SUPER_ADMIN') {
  //     const ok = await confirm({
  //       title: 'Promote to Super Admin?',
  //       message:
  //         'Promoting this user to Super Admin grants unrestricted access to all atelier settings, staff credentials, and financial configurations. Continue?',
  //       confirmLabel: 'Promote to Super Admin',
  //       isDestructive: true,
  //     });
  //     if (!ok) return;
  //   }
  //   setIsUpdatingRole(true);
  //   setRoleChangeError(null);
  //   try {
  //     await updateAdminStaff(roleChangeTarget.id, { role: selectedNewRole });
  //     showToast(
  //       `Role updated to ${selectedNewRole.replace(/_/g, ' ')} for ${roleChangeTarget.name}`,
  //       'success'
  //     );
  //     setRoleChangeTarget(null);
  //     await fetchAdminStaff();
  //     logAdminAction(
  //       'Updated',
  //       'Admin Management',
  //       roleChangeTarget.email,
  //       `Changed role from ${roleChangeTarget.role} to ${selectedNewRole}`
  //     );
  //   } catch (err: any) {
  //     const code = err?.response?.data?.error?.code;
  //     if (code === 'LAST_SUPER_ADMIN') {
  //       setRoleChangeError('Cannot demote the last active Super Admin account.');
  //     } else if (code === 'CANNOT_MODIFY_SELF') {
  //       setRoleChangeError('You cannot modify your own role.');
  //     } else {
  //       setRoleChangeError(settingsErrorMessage(err, 'Failed to update role.'));
  //     }
  //   } finally {
  //     setIsUpdatingRole(false);
  //   }
  // };
  // const handleToggleStaffStatus = async (u: AdminStaffMember) => {
  //   const isCurrentlyActive = u.status === 'Active' || u.status === 'active';
  //   const nextStatus = isCurrentlyActive ? 'inactive' : 'active';
  //   if (isCurrentlyActive) {
  //     const ok = await confirm({
  //       title: `Deactivate ${u.name}?`,
  //       message: 'They will be signed out immediately and cannot log in until reactivated.',
  //       confirmLabel: 'Deactivate',
  //       isDestructive: true,
  //     });
  //     if (!ok) return;
  //   } else {
  //     const ok = await confirm({
  //       title: `Reactivate ${u.name}?`,
  //       message: 'Reactivate this staff account so they can log in again?',
  //       confirmLabel: 'Reactivate',
  //       isDestructive: false,
  //     });
  //     if (!ok) return;
  //   }
  //   setTogglingStatusId(u.id);
  //   try {
  //     await updateAdminStaff(u.id, { status: nextStatus });
  //     showToast(
  //       `Account ${nextStatus === 'active' ? 'reactivated' : 'deactivated'} for ${u.name}`,
  //       'success'
  //     );
  //     await fetchAdminStaff();
  //     logAdminAction(
  //       'Updated',
  //       'Admin Management',
  //       u.email,
  //       `${nextStatus === 'active' ? 'Reactivated' : 'Deactivated'} staff account`
  //     );
  //   } catch (err: any) {
  //     const code = err?.response?.data?.error?.code;
  //     const msg =
  //       code === 'LAST_SUPER_ADMIN'
  //         ? 'Cannot deactivate the last active Super Admin account.'
  //         : code === 'CANNOT_MODIFY_SELF'
  //           ? 'You cannot deactivate your own account.'
  //           : settingsErrorMessage(err, `Failed to update status for ${u.name}.`);
  //     showToast(msg, 'error');
  //   } finally {
  //     setTogglingStatusId(null);
  //   }
  // };
  // STAFF-ACTIONS-DISABLED END

  useEffect(() => {
    if (activeTab === 'admins' && canViewAdminMatrix && !isStaffLoaded && !staffError) {
      void fetchAdminStaff();
    }
  }, [activeTab, canViewAdminMatrix, isStaffLoaded, staffError, fetchAdminStaff]);

  const fetchHealth = async () => {
    setIsHealthLoading(true);
    try {
      const data = await getDashboardSystemHealth();
      setSystemHealth(data);
    } catch (err) {
      console.warn('Could not load system health report:', err);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Boutique Profile form — loaded from GET /admin/settings
  const [boutiqueForm, setBoutiqueForm] = useState<BoutiqueSettingsForm>(EMPTY_BOUTIQUE_FORM);
  const [boutiqueOriginal, setBoutiqueOriginal] = useState<BoutiqueSettingsForm>(EMPTY_BOUTIQUE_FORM);
  const [boutiqueReadOnly, setBoutiqueReadOnly] = useState({ currency: '', timezone: '' });
  const [boutiqueErrors, setBoutiqueErrors] = useState<BoutiqueSettingsErrors>({});
  const [boutiqueTouched, setBoutiqueTouched] = useState<Partial<Record<keyof BoutiqueSettingsForm, boolean>>>({});
  const [isBoutiqueLoading, setIsBoutiqueLoading] = useState(false);
  const [isBoutiqueLoaded, setIsBoutiqueLoaded] = useState(false);
  const [boutiqueLoadError, setBoutiqueLoadError] = useState<string | null>(null);
  const [isBoutiqueSaving, setIsBoutiqueSaving] = useState(false);

  // Dispatch address ("From" on shipping slips and invoices) — tracked separately from
  // the rest of the Boutique Profile so saving one never accidentally sends or wipes the
  // other; `pickupAddress` is only added to the PATCH payload when it actually changed.
  const [pickupForm, setPickupForm] = useState<PickupAddressFormData>(EMPTY_PICKUP_ADDRESS_FORM);
  const [pickupOriginalRaw, setPickupOriginalRaw] = useState<PickupAddress | null>(null);
  const [pickupErrors, setPickupErrors] = useState<PickupAddressErrors>({});
  const [pickupTouched, setPickupTouched] = useState<Partial<Record<keyof PickupAddressFormData, boolean>>>({});
  const [pickupCleared, setPickupCleared] = useState(false);

  const isBoutiqueDirty = (Object.keys(boutiqueForm) as (keyof BoutiqueSettingsForm)[]).some(
    key => boutiqueForm[key] !== boutiqueOriginal[key]
  );
  const hasBoutiqueErrors = Object.values(boutiqueErrors).some(Boolean);

  const pickupParsedOriginal = parsePickupAddressToForm(pickupOriginalRaw);
  const isPickupFormChanged = (Object.keys(pickupForm) as (keyof PickupAddressFormData)[]).some(
    key => pickupForm[key] !== pickupParsedOriginal[key]
  );
  const isPickupDirty = pickupCleared || isPickupFormChanged;
  const isAnyDirty = isBoutiqueDirty || isPickupDirty;

  const fetchBoutiqueSettings = useCallback(async () => {
    setIsBoutiqueLoading(true);
    setBoutiqueLoadError(null);
    try {
      const data = await getBoutiqueSettings();
      const form = toForm(data);
      setBoutiqueForm(form);
      setBoutiqueOriginal(form);
      setBoutiqueReadOnly({
        currency: data.boutiqueProfile?.currency ?? '',
        timezone: data.boutiqueProfile?.timezone ?? '',
      });
      setBoutiqueErrors({});
      setBoutiqueTouched({});
      const pickup = data.boutiqueProfile?.pickupAddress ?? null;
      setPickupOriginalRaw(pickup);
      setPickupForm(parsePickupAddressToForm(pickup));
      setPickupErrors({});
      setPickupTouched({});
      setPickupCleared(false);
      setIsBoutiqueLoaded(true);
    } catch (err) {
      setBoutiqueLoadError(settingsErrorMessage(err, 'Could not load boutique settings'));
    } finally {
      setIsBoutiqueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'store' && !isBoutiqueLoaded) {
      fetchBoutiqueSettings();
    }
  }, [activeTab, isBoutiqueLoaded, fetchBoutiqueSettings]);

  // Warn on browser close/reload with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isAnyDirty || isMatrixDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isAnyDirty, isMatrixDirty]);

  const BOUTIQUE_VALIDATORS: Record<keyof BoutiqueSettingsForm, (form: BoutiqueSettingsForm) => string> = {
    storeName: f => legalNameError(f.storeName),
    tagline: f => taglineError(f.tagline),
    whatsapp: f => whatsappError(f.whatsapp),
    email: f => emailError(f.email),
    gstin: f => gstinError(f.gstin),
    address: f => addressError(f.address),
    freeShippingThreshold: f => freeShippingThresholdError(f.freeShippingThreshold),
    standardShippingFee: f => standardShippingFeeError(f.standardShippingFee),
    expressShippingFee: f => expressShippingFeeError(f.expressShippingFee, f.standardShippingFee),
  };

  const setBoutiqueField = (field: keyof BoutiqueSettingsForm, value: string) => {
    const next = { ...boutiqueForm, [field]: value };
    setBoutiqueForm(next);
    if (boutiqueTouched[field]) {
      setBoutiqueErrors(prev => ({ ...prev, [field]: BOUTIQUE_VALIDATORS[field](next) || undefined }));
    }
  };

  const blurBoutiqueField = (field: keyof BoutiqueSettingsForm) => {
    setBoutiqueTouched(prev => ({ ...prev, [field]: true }));
    setBoutiqueErrors(prev => ({ ...prev, [field]: BOUTIQUE_VALIDATORS[field](boutiqueForm) || undefined }));
  };

  const handleResetBoutique = () => {
    setBoutiqueForm(boutiqueOriginal);
    setBoutiqueErrors({});
    setBoutiqueTouched({});
    setPickupForm(parsePickupAddressToForm(pickupOriginalRaw));
    setPickupErrors({});
    setPickupTouched({});
    setPickupCleared(false);
  };

  const setPickupField = (field: keyof PickupAddressFormData, value: string) => {
    const next = { ...pickupForm, [field]: value };
    setPickupForm(next);
    if (pickupCleared) setPickupCleared(false); // typing again after "Clear" re-fills the address instead
    if (pickupTouched[field]) {
      setPickupErrors(prev => ({ ...prev, [field]: validatePickupAddressForm(next)[field] }));
    }
  };

  const blurPickupField = (field: keyof PickupAddressFormData) => {
    setPickupTouched(prev => ({ ...prev, [field]: true }));
    setPickupErrors(prev => ({ ...prev, [field]: validatePickupAddressForm(pickupForm)[field] }));
  };

  const handleClearPickupAddress = async () => {
    const ok = await confirm({
      title: 'Clear dispatch address?',
      message:
        'Shipping slips and invoices will fall back to your general address and WhatsApp number until you add a new one.',
      confirmLabel: 'Clear address',
      isDestructive: true,
    });
    if (!ok) return;
    setPickupForm(EMPTY_PICKUP_ADDRESS_FORM);
    setPickupErrors({});
    setPickupTouched({});
    setPickupCleared(true);
  };

  const isEditable = can('system_settings', 'edit');

  const switchTab = async (tab: 'store' | 'admins' | 'health') => {
    if (tab === activeTab) return;
    if (activeTab === 'store' && isAnyDirty) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'The Boutique Profile has unsaved changes. Switch tabs and discard them?',
        confirmLabel: 'Discard changes',
        isDestructive: true,
      });
      if (!ok) return;
    }
    if (activeTab === 'admins' && isMatrixDirty) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'The Role Permissions Matrix has unsaved changes. Switch tabs and discard them?',
        confirmLabel: 'Discard changes',
        isDestructive: true,
      });
      if (!ok) return;
      setIsMatrixDirty(false);
    }
    if (location.pathname.endsWith('/admins') && tab !== 'admins') {
      navigate(tab === 'store' ? '/admin/settings' : `/admin/settings?tab=${tab}`);
      return;
    }
    setSearchParams(tab === 'store' ? {} : { tab });
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) {
      showToast('Action restricted: Read-only access for current role', 'error');
      return;
    }

    const errors = validateBoutiqueSettings(boutiqueForm);
    if (Object.keys(errors).length > 0) {
      setBoutiqueErrors(errors);
      setBoutiqueTouched({
        storeName: true,
        tagline: true,
        whatsapp: true,
        email: true,
        gstin: true,
        address: true,
        freeShippingThreshold: true,
        standardShippingFee: true,
        expressShippingFee: true,
      });
      return;
    }

    // `pickupAddress` is validated and built separately — it's always sent whole, never merged,
    // and is only added to the PATCH payload when it actually changed (cleared or edited).
    let pickupPayloadValue: PickupAddress | null | undefined;
    if (pickupCleared) {
      pickupPayloadValue = null;
    } else if (isPickupFormChanged) {
      const pickupValidationErrors = validatePickupAddressForm(pickupForm);
      if (Object.keys(pickupValidationErrors).length > 0) {
        setPickupErrors(pickupValidationErrors);
        setPickupTouched({
          contactName: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        });
        return;
      }
      pickupPayloadValue = buildPickupAddressPayload(pickupForm);
    }

    if (!isBoutiqueDirty && pickupPayloadValue === undefined) return;

    // Build a true PATCH: only the fields that actually changed
    const payload: UpdateBoutiqueProfileRequest = {};
    if (pickupPayloadValue !== undefined) payload.pickupAddress = pickupPayloadValue;
    if (boutiqueForm.storeName !== boutiqueOriginal.storeName) payload.legalName = boutiqueForm.storeName.trim();
    if (boutiqueForm.tagline !== boutiqueOriginal.tagline) payload.tagline = boutiqueForm.tagline.trim();
    if (boutiqueForm.whatsapp !== boutiqueOriginal.whatsapp) {
      const digits = normalizeMobile(boutiqueForm.whatsapp);
      payload.whatsappNumber = digits.length === 10 ? `+91${digits}` : boutiqueForm.whatsapp.trim();
    }
    if (boutiqueForm.email !== boutiqueOriginal.email) payload.supportEmail = boutiqueForm.email.trim().toLowerCase();
    if (boutiqueForm.gstin !== boutiqueOriginal.gstin) payload.gstin = boutiqueForm.gstin.trim().toUpperCase();
    if (boutiqueForm.address !== boutiqueOriginal.address) payload.address = boutiqueForm.address.trim();
    if (boutiqueForm.freeShippingThreshold !== boutiqueOriginal.freeShippingThreshold)
      payload.freeShippingMinOrder = Number(boutiqueForm.freeShippingThreshold);
    if (boutiqueForm.standardShippingFee !== boutiqueOriginal.standardShippingFee)
      payload.standardTariff = Number(boutiqueForm.standardShippingFee);
    if (boutiqueForm.expressShippingFee !== boutiqueOriginal.expressShippingFee)
      payload.expressTariff = Number(boutiqueForm.expressShippingFee);

    setIsBoutiqueSaving(true);
    try {
      const updated = await updateBoutiqueSettings(payload);
      const form = toForm(updated);
      setBoutiqueForm(form);
      setBoutiqueOriginal(form);
      setBoutiqueReadOnly({
        currency: updated.boutiqueProfile?.currency ?? '',
        timezone: updated.boutiqueProfile?.timezone ?? '',
      });
      setBoutiqueErrors({});
      setBoutiqueTouched({});
      const updatedPickup = updated.boutiqueProfile?.pickupAddress ?? null;
      setPickupOriginalRaw(updatedPickup);
      setPickupForm(parsePickupAddressToForm(updatedPickup));
      setPickupErrors({});
      setPickupTouched({});
      setPickupCleared(false);
      logAdminAction('Updated', 'Settings', 'Store Configuration', 'Updated boutique details and shipping rates');
      showToast('Boutique profile updated', 'success');
      // Best-effort cache-bust for any other part of the app that reads boutique
      // settings (e.g. the invoice/header store name) — nothing subscribes yet.
      window.dispatchEvent(new CustomEvent('boutique-settings-updated', { detail: updated }));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        showToast('Your role does not have permission to update boutique settings.', 'error');
      } else {
        const rawFieldErrors = settingsFieldErrors(err);
        const mappedErrors: BoutiqueSettingsErrors = {};
        const mappedPickupErrors: PickupAddressErrors = {};
        Object.entries(rawFieldErrors).forEach(([key, message]) => {
          if (key.includes('pickupAddress')) {
            const cleanKey = stripPickupAddressFieldPrefix(key) as keyof PickupAddressFormData;
            mappedPickupErrors[cleanKey] = message;
            return;
          }
          const formKey = BACKEND_TO_FORM_FIELD[key];
          if (formKey) mappedErrors[formKey] = message;
        });
        if (Object.keys(mappedErrors).length > 0) {
          setBoutiqueErrors(prev => ({ ...prev, ...mappedErrors }));
        }
        if (Object.keys(mappedPickupErrors).length > 0) {
          setPickupErrors(prev => ({ ...prev, ...mappedPickupErrors }));
        }
        showToast(settingsErrorMessage(err, 'Could not update boutique profile'), 'error');
      }
    } finally {
      setIsBoutiqueSaving(false);
    }
  };

  const boutiqueErrorId = (field: keyof BoutiqueSettingsForm) => `boutique-${field}-error`;
  const boutiqueInputClass = (field: keyof BoutiqueSettingsForm, extra = '') =>
    `w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold disabled:bg-primary-100/60 disabled:text-primary-500 ${boutiqueErrors[field] ? 'border-rose-400 focus:border-rose-500' : 'border-primary-200'
    } ${extra}`;
  const BoutiqueFieldError: React.FC<{ field: keyof BoutiqueSettingsForm }> = ({ field }) =>
    boutiqueErrors[field] ? (
      <p id={boutiqueErrorId(field)} role="alert" className="text-[11px] text-rose-600 mt-1">
        {boutiqueErrors[field]}
      </p>
    ) : null;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary-200/60 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-accent-gold font-bold">Administration</span>
          <h1 className="font-serif text-3xl text-primary-900 mt-1">Atelier Settings & Integrations</h1>
          <p className="text-primary-600 text-sm mt-1 font-sans">
            Configure boutique profile, shipping thresholds, admin permissions, and system health.
          </p>
        </div>

        {/* Role Indicator / Dynamic Quick Switch */}
        <div className="flex flex-wrap items-center gap-2 bg-primary-100/70 p-1.5 rounded-lg border border-primary-200">
          <span className="text-xs font-semibold text-primary-700 px-2">Role:</span>
          {realRole === 'SUPER_ADMIN' && availableRoles.length > 0 ? (
            availableRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${role === r
                  ? 'bg-primary-900 text-primary-50 shadow-sm font-bold'
                  : 'text-primary-700 hover:bg-primary-200/50'
                  }`}
              >
                {r.replace(/_/g, ' ')}
              </button>
            ))
          ) : (
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-primary-900 text-primary-50 shadow-sm">
              {(role || realRole || '—').replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {!isEditable && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span><strong>Read-Only Configuration Mode:</strong> Active role (<span className="font-mono font-bold">{role || '—'}</span>) has view access only.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
            Protected
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-primary-200/80 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => switchTab('store')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'store'
            ? 'border-accent-gold text-primary-950 font-semibold'
            : 'border-transparent text-primary-600 hover:text-primary-900'
            }`}
        >
          <Building2 size={16} />
          Boutique Profile
          {isBoutiqueDirty && <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" aria-hidden="true" />}
        </button>

        {canViewAdminMatrix && (
          <button
            type="button"
            onClick={() => switchTab('admins')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'admins'
              ? 'border-accent-gold text-primary-950 font-semibold'
              : 'border-transparent text-primary-600 hover:text-primary-900'
              }`}
          >
            <Users size={16} />
            Admins & RBAC Matrix
            {isMatrixDirty && <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" aria-hidden="true" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => switchTab('health')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'health'
            ? 'border-accent-gold text-primary-950 font-semibold'
            : 'border-transparent text-primary-600 hover:text-primary-900'
            }`}
        >
          <Activity size={16} />
          System Health
        </button>
      </div>

      {/* Tab 1: Store Settings */}
      {activeTab === 'store' && (
        isBoutiqueLoading || (!isBoutiqueLoaded && !boutiqueLoadError) ? (
          <div className="p-12 flex flex-col items-center gap-3 text-primary-500">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-xs font-sans uppercase tracking-widest">Loading boutique profile…</p>
          </div>
        ) : boutiqueLoadError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-rose-600">{boutiqueLoadError}</p>
            <button onClick={fetchBoutiqueSettings} className="text-xs font-sans text-primary-700 underline">
              Retry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveStore} className="space-y-6">
            <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-6">
              <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
                <Building2 className="text-accent-gold" size={20} />
                General Boutique Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Boutique Legal Name
                  </label>
                  <input
                    type="text"
                    value={boutiqueForm.storeName}
                    onChange={(e) => setBoutiqueField('storeName', e.target.value)}
                    onBlur={() => blurBoutiqueField('storeName')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('storeName')}
                    aria-invalid={!!boutiqueErrors.storeName}
                    aria-describedby={boutiqueErrors.storeName ? boutiqueErrorId('storeName') : undefined}
                    required
                  />
                  <BoutiqueFieldError field="storeName" />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Tagline / Brand Signature
                  </label>
                  <input
                    type="text"
                    value={boutiqueForm.tagline}
                    onChange={(e) => setBoutiqueField('tagline', e.target.value)}
                    onBlur={() => blurBoutiqueField('tagline')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('tagline')}
                    aria-invalid={!!boutiqueErrors.tagline}
                    aria-describedby={boutiqueErrors.tagline ? boutiqueErrorId('tagline') : undefined}
                  />
                  <BoutiqueFieldError field="tagline" />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    WhatsApp Concierge Number
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={boutiqueForm.whatsapp}
                    onChange={(e) => setBoutiqueField('whatsapp', e.target.value.replace(/[^\d+]/g, ''))}
                    onBlur={() => blurBoutiqueField('whatsapp')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('whatsapp')}
                    aria-invalid={!!boutiqueErrors.whatsapp}
                    aria-describedby={boutiqueErrors.whatsapp ? boutiqueErrorId('whatsapp') : undefined}
                    placeholder="9037991774"
                  />
                  <BoutiqueFieldError field="whatsapp" />
                  <p className="text-[11px] text-primary-500 mt-1">Direct link for client consultations & order inquiries</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Concierge Support Email
                  </label>
                  <input
                    type="email"
                    value={boutiqueForm.email}
                    onChange={(e) => setBoutiqueField('email', e.target.value)}
                    onBlur={() => blurBoutiqueField('email')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('email')}
                    aria-invalid={!!boutiqueErrors.email}
                    aria-describedby={boutiqueErrors.email ? boutiqueErrorId('email') : undefined}
                    required
                  />
                  <BoutiqueFieldError field="email" />
                </div>

                {/* <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    GSTIN / Tax Identification
                  </label>
                  <input
                    type="text"
                    value={boutiqueForm.gstin}
                    onChange={(e) => setBoutiqueField('gstin', e.target.value.toUpperCase())}
                    onBlur={() => blurBoutiqueField('gstin')}
                    disabled={!isEditable || isBoutiqueSaving}
                    maxLength={15}
                    className={boutiqueInputClass('gstin', 'font-mono')}
                    aria-invalid={!!boutiqueErrors.gstin}
                    aria-describedby={boutiqueErrors.gstin ? boutiqueErrorId('gstin') : undefined}
                  />
                  <BoutiqueFieldError field="gstin" />
                </div> */}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Currency & Timezone
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={boutiqueReadOnly.currency}
                      disabled
                      className="px-3.5 py-2 text-sm bg-primary-100/60 border border-primary-200 rounded-lg text-primary-700 font-mono"
                    />
                    <input
                      type="text"
                      value={boutiqueReadOnly.timezone}
                      disabled
                      className="px-3.5 py-2 text-sm bg-primary-100/60 border border-primary-200 rounded-lg text-primary-700 text-xs"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Kerala Physical Atelier & Dispatch Hub Address
                  </label>
                  <textarea
                    rows={2}
                    value={boutiqueForm.address}
                    onChange={(e) => setBoutiqueField('address', e.target.value)}
                    onBlur={() => blurBoutiqueField('address')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('address')}
                    aria-invalid={!!boutiqueErrors.address}
                    aria-describedby={boutiqueErrors.address ? boutiqueErrorId('address') : undefined}
                  />
                  <BoutiqueFieldError field="address" />
                </div>
              </div>
            </div>

            {/* Shipping Thresholds */}
            <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-6">
              <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
                <Truck className="text-accent-gold" size={20} />
                Shipping Tariffs & Complimentary Thresholds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Free Shipping Min. Order (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={boutiqueForm.freeShippingThreshold}
                    onChange={(e) => setBoutiqueField('freeShippingThreshold', e.target.value)}
                    onBlur={() => blurBoutiqueField('freeShippingThreshold')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('freeShippingThreshold')}
                    aria-invalid={!!boutiqueErrors.freeShippingThreshold}
                    aria-describedby={boutiqueErrors.freeShippingThreshold ? boutiqueErrorId('freeShippingThreshold') : undefined}
                  />
                  <BoutiqueFieldError field="freeShippingThreshold" />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Standard Surface Tariff (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={boutiqueForm.standardShippingFee}
                    onChange={(e) => setBoutiqueField('standardShippingFee', e.target.value)}
                    onBlur={() => blurBoutiqueField('standardShippingFee')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('standardShippingFee')}
                    aria-invalid={!!boutiqueErrors.standardShippingFee}
                    aria-describedby={boutiqueErrors.standardShippingFee ? boutiqueErrorId('standardShippingFee') : undefined}
                  />
                  <BoutiqueFieldError field="standardShippingFee" />
                </div>

                {/* <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">
                    Express Air Courier (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={boutiqueForm.expressShippingFee}
                    onChange={(e) => setBoutiqueField('expressShippingFee', e.target.value)}
                    onBlur={() => blurBoutiqueField('expressShippingFee')}
                    disabled={!isEditable || isBoutiqueSaving}
                    className={boutiqueInputClass('expressShippingFee')}
                    aria-invalid={!!boutiqueErrors.expressShippingFee}
                    aria-describedby={boutiqueErrors.expressShippingFee ? boutiqueErrorId('expressShippingFee') : undefined}
                  />
                  <BoutiqueFieldError field="expressShippingFee" />
                </div> */}
              </div>
            </div>

            <DispatchAddressForm
              form={pickupForm}
              errors={pickupErrors}
              disabled={!isEditable || isBoutiqueSaving}
              isConfigured={!!pickupOriginalRaw && !pickupCleared}
              onChange={setPickupField}
              onBlur={blurPickupField}
              onClear={handleClearPickupAddress}
            />

            {isEditable && (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetBoutique}
                  disabled={!isAnyDirty || isBoutiqueSaving}
                  className="flex items-center gap-2 px-5 py-2.5 border border-primary-300 text-primary-700 rounded-lg text-sm font-semibold hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={15} />
                  <span>Discard Changes</span>
                </button>
                <button
                  type="submit"
                  disabled={!isAnyDirty || hasBoutiqueErrors || Object.values(pickupErrors).some(Boolean) || isBoutiqueSaving}
                  className="flex items-center gap-2 px-5 py-2.5 border border-primary-300 text-primary-700 rounded-lg text-sm font-semibold hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBoutiqueSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span className="text-black">{isBoutiqueSaving ? 'Saving...' : 'Save Boutique Profile'}</span>
                </button>
              </div>
            )}
          </form>
        )
      )}

      {/* Tab 2: Admins & RBAC Matrix */}
      {activeTab === 'admins' && (
        <div className="space-y-8">
          {/* Admin Staff Table */}
          <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-4 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-primary-900">Atelier Management & Staff</h2>
                <p className="text-xs text-primary-600 mt-0.5">Assigned roles and active access privileges</p>
              </div>

              {/* STAFF-ACTIONS-DISABLED START */}
              {/* {realRole === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={() => {
                    setAddStaffForm({ name: '', email: '', role: 'ADMIN', password: '' });
                    setAddStaffError(null);
                    setIsAddStaffOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-gold text-stone-950 text-xs font-bold hover:opacity-90 transition-opacity shadow-sm self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>Add Staff</span>
                </button>
              )} */}
              {/* STAFF-ACTIONS-DISABLED END */}
            </div>

            <div>
              {isStaffLoading ? (
                <>
                  {/* Mobile skeleton cards */}
                  <ul className="md:hidden space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <li key={idx} className="rounded-lg border border-primary-200/70 bg-white/60 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-full bg-stone-200/80 animate-pulse" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-3.5 w-2/3 bg-stone-200/80 rounded animate-pulse" />
                            <div className="h-3 w-5/6 bg-stone-200/70 rounded animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-5 w-24 bg-stone-200/70 rounded animate-pulse" />
                          <div className="h-3 w-16 bg-stone-200/70 rounded animate-pulse" />
                        </div>
                        <div className="h-3 w-28 bg-stone-200/70 rounded animate-pulse" />
                      </li>
                    ))}
                  </ul>

                  {/* Desktop skeleton table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-primary-200/70 text-xs uppercase tracking-wider text-primary-600 font-semibold">
                          <th className="pb-3 pr-4">Staff Name</th>
                          <th className="pb-3 pr-4">Email Address</th>
                          <th className="pb-3 pr-4">Assigned Role</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary-100">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <tr key={idx}>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 shrink-0 rounded-full bg-stone-200/80 animate-pulse" />
                                <div className="h-3.5 w-32 bg-stone-200/80 rounded animate-pulse" />
                              </div>
                            </td>
                            <td className="py-3 pr-4"><div className="h-3 w-44 bg-stone-200/70 rounded animate-pulse" /></td>
                            <td className="py-3 pr-4"><div className="h-5 w-24 bg-stone-200/70 rounded animate-pulse" /></td>
                            <td className="py-3 pr-4"><div className="h-3 w-16 bg-stone-200/70 rounded animate-pulse" /></td>
                            <td className="py-3"><div className="h-3 w-28 bg-stone-200/70 rounded animate-pulse" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : staffError ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-rose-600">{staffError}</p>
                  <button
                    type="button"
                    onClick={() => void fetchAdminStaff()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-300 text-xs font-sans text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-8 text-center text-xs text-primary-500">
                  No staff found
                </div>
              ) : (
                <>
                  {/* Mobile staff cards */}
                  <ul className="md:hidden space-y-3">
                    {staffList.map((u) => {
                      const isSelf = isSelfUser(u);
                      // STAFF-ACTIONS-DISABLED const isCurrentlyActive = u.status === 'Active' || u.status === 'active';
                      // STAFF-ACTIONS-DISABLED const isToggling = togglingStatusId === u.id;

                      return (
                        <li key={u.id} className="rounded-lg border border-primary-200/70 bg-white/60 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 shrink-0 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center font-bold text-xs">
                              {getStaffInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-primary-900 truncate">
                                {u.name} {isSelf && <span className="text-[10px] text-primary-500 font-bold">(You)</span>}
                              </p>
                              <p className="text-primary-600 font-mono text-xs break-all">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {renderRoleBadge(u.role)}
                            {renderStatus(u.status)}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary-100">
                            <p className="text-xs text-primary-500">
                              <span className="uppercase tracking-wider text-[10px] font-semibold text-primary-600 mr-1.5">Last Active</span>
                              {u.lastLogin}
                            </p>
                            {/* STAFF-ACTIONS-DISABLED START */}
                            {/* <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewStaff(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary-300 bg-white hover:bg-primary-50 text-primary-800 text-[11px] font-semibold transition-colors"
                              >
                                <Shield size={11} className="text-accent-gold" />
                                <span>Privileges</span>
                              </button>
                              {realRole === 'SUPER_ADMIN' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenChangeRole(u)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-semibold transition-colors"
                                  >
                                    <UserCog size={11} />
                                    <span>Role</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSelf || isToggling}
                                    onClick={() => handleToggleStaffStatus(u)}
                                    title={isSelf ? 'Cannot deactivate your own account' : undefined}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                      isCurrentlyActive
                                        ? 'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100'
                                        : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {isToggling ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : isCurrentlyActive ? (
                                      <UserX size={11} />
                                    ) : (
                                      <UserCheck size={11} />
                                    )}
                                    <span>{isCurrentlyActive ? 'Deactivate' : 'Reactivate'}</span>
                                  </button>
                                </>
                              )}
                            </div> */}
                            {/* STAFF-ACTIONS-DISABLED END */}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Desktop staff table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-primary-200/70 text-xs uppercase tracking-wider text-primary-600 font-semibold">
                          <th className="pb-3 pr-4">Staff Name</th>
                          <th className="pb-3 pr-4">Email Address</th>
                          <th className="pb-3 pr-4">Assigned Role</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Last Active</th>
                          {/* STAFF-ACTIONS-DISABLED START */}
                          {/* <th className="pb-3 text-right">Actions</th> */}
                          {/* STAFF-ACTIONS-DISABLED END */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary-100">
                        {staffList.map((u) => {
                          const isSelf = isSelfUser(u);
                          // STAFF-ACTIONS-DISABLED const isCurrentlyActive = u.status === 'Active' || u.status === 'active';
                          // STAFF-ACTIONS-DISABLED const isToggling = togglingStatusId === u.id;

                          return (
                            <tr key={u.id} className="hover:bg-white/50 transition-colors">
                              <td className="py-3 pr-4 font-medium text-primary-900">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 shrink-0 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center font-bold text-xs">
                                    {getStaffInitials(u.name)}
                                  </div>
                                  <span>
                                    {u.name} {isSelf && <span className="text-[10px] text-primary-500 font-bold">(You)</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-primary-600 font-mono text-xs break-all">{u.email}</td>
                              <td className="py-3 pr-4 whitespace-nowrap">{renderRoleBadge(u.role)}</td>
                              <td className="py-3 pr-4 whitespace-nowrap">{renderStatus(u.status)}</td>
                              <td className="py-3 pr-4 text-xs text-primary-500 whitespace-nowrap">{u.lastLogin}</td>
                              {/* STAFF-ACTIONS-DISABLED START */}
                              {/* <td className="py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewStaff(u)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary-300 bg-white hover:bg-primary-50 text-primary-800 text-xs font-semibold transition-colors"
                                  >
                                    <Shield size={12} className="text-accent-gold" />
                                    <span>Privileges</span>
                                  </button>
                                  {realRole === 'SUPER_ADMIN' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenChangeRole(u)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
                                      >
                                        <UserCog size={12} />
                                        <span>Change Role</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSelf || isToggling}
                                        onClick={() => handleToggleStaffStatus(u)}
                                        title={isSelf ? 'Cannot deactivate your own account' : undefined}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                          isCurrentlyActive
                                            ? 'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100'
                                            : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                      >
                                        {isToggling ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : isCurrentlyActive ? (
                                          <UserX size={12} />
                                        ) : (
                                          <UserCheck size={12} />
                                        )}
                                        <span>{isCurrentlyActive ? 'Deactivate' : 'Reactivate'}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td> */}
                              {/* STAFF-ACTIONS-DISABLED END */}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* STAFF-ACTIONS-DISABLED START */}
          {/* Add Staff Modal */}
          {/* {isAddStaffOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
              <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-normal text-stone-900 flex items-center gap-2">
                    <Plus size={18} className="text-accent-gold" />
                    <span>Add Staff Member</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddStaffOpen(false)}
                    className="p-1.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateStaff} className="p-5 space-y-4 text-xs font-sans">
                  {addStaffError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      {addStaffError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Nair"
                      value={addStaffForm.name}
                      onChange={(e) => setAddStaffForm((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={isAddingStaff}
                      className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-stone-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="maya@alluraboutique.com"
                      value={addStaffForm.email}
                      onChange={(e) => setAddStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={isAddingStaff}
                      className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-stone-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Assigned Role *
                    </label>
                    <select
                      value={addStaffForm.role}
                      onChange={(e) => setAddStaffForm((prev) => ({ ...prev, role: e.target.value as RbacRole }))}
                      disabled={isAddingStaff}
                      className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-none focus:border-stone-800"
                    >
                      <option value="ADMIN">ADMIN (Full management except staff credentials)</option>
                      <option value="CATALOG_MANAGER">CATALOG_MANAGER (Products, categories, inventory)</option>
                      <option value="ORDER_MANAGER">ORDER_MANAGER (Orders, shipping, customer service)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Temporary Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Leave empty to send email setup link"
                      value={addStaffForm.password}
                      onChange={(e) => setAddStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                      disabled={isAddingStaff}
                      className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-stone-800"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Leave empty to automatically send an invitation email with a password setup link.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddStaffOpen(false)}
                      disabled={isAddingStaff}
                      className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingStaff}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-gold text-stone-950 font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isAddingStaff && <Loader2 size={13} className="animate-spin" />}
                      <span>{isAddingStaff ? 'Adding…' : 'Add Staff Member'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )} */}

          {/* Change Role Modal */}
          {/* {roleChangeTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
              <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-normal text-stone-900 flex items-center gap-2">
                    <UserCog size={18} className="text-accent-gold" />
                    <span>Change Assigned Role</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setRoleChangeTarget(null)}
                    className="p-1.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSubmitChangeRole} className="p-5 space-y-4 text-xs font-sans">
                  {roleChangeError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      {roleChangeError}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                    <p className="font-semibold text-stone-800">{roleChangeTarget.name}</p>
                    <p className="font-mono text-[11px] text-stone-500">{roleChangeTarget.email}</p>
                    <div className="mt-1">Current: {renderRoleBadge(roleChangeTarget.role)}</div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                      New Role
                    </label>
                    <select
                      value={selectedNewRole}
                      onChange={(e) => setSelectedNewRole(e.target.value as RbacRole)}
                      disabled={isUpdatingRole}
                      className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-none focus:border-stone-800"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="CATALOG_MANAGER">CATALOG_MANAGER</option>
                      <option value="ORDER_MANAGER">ORDER_MANAGER</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Unrestricted privileges)</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRoleChangeTarget(null)}
                      disabled={isUpdatingRole}
                      className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingRole || selectedNewRole === roleChangeTarget.role}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-gold text-stone-950 font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isUpdatingRole && <Loader2 size={13} className="animate-spin" />}
                      <span>{isUpdatingRole ? 'Updating…' : 'Update Role'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )} */}

          {/* Role Preview Modal */}
          {/* {previewStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
              <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center font-bold text-sm">
                      {getStaffInitials(previewStaff.name)}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-normal text-stone-900">{previewStaff.name}</h3>
                      <p className="text-xs text-stone-500 font-mono">{previewStaff.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewStaff(null)}
                    className="p-1.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs font-sans">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-stone-400 block">Assigned Role</span>
                      <div className="mt-0.5">{renderRoleBadge(previewStaff.role)}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-stone-400 block">Account Status</span>
                      <div className="mt-0.5">{renderStatus(previewStaff.status)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-stone-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield size={13} className="text-accent-gold" />
                      <span>Role Capabilities ({previewStaff.role.replace(/_/g, ' ')})</span>
                    </h4>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {modules.map((mod) => {
                        const perms = matrix?.[previewStaff.role]?.[mod.key];
                        const grantedActions = perms
                          ? Object.entries(perms)
                              .filter(([_, val]) => val === true)
                              .map(([act]) => act)
                          : [];
                        return (
                          <div
                            key={mod.key}
                            className="p-2.5 rounded-lg border border-stone-100 bg-stone-50/50 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-stone-800 truncate">{mod.label}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {grantedActions.length > 0 ? (
                                grantedActions.map((act) => (
                                  <span
                                    key={act}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800"
                                  >
                                    {act}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-stone-400 italic">No access</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewStaff(null)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )} */}
          {/* STAFF-ACTIONS-DISABLED END */}

          {/* Granular Permission Matrix Component: Super Admin only */}
          {realRole === 'SUPER_ADMIN' ? (
            <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm">
              <PermissionMatrix onDirtyChange={setIsMatrixDirty} />
            </div>
          ) : (
            <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-8 shadow-sm text-center space-y-2">
              <Shield className="mx-auto text-stone-400" size={28} />
              <h3 className="font-serif text-lg text-primary-900">Role Permissions Matrix</h3>
              <p className="text-xs text-primary-600 max-w-md mx-auto font-sans">
                The Role Permissions Matrix is configured exclusively by the Super Admin. Your privileges are synchronized automatically from your account profile.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: System & Integrations Health */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Overview Banner */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${systemHealth?.status === 'HEALTHY'
                ? 'bg-emerald-50 text-emerald-600'
                : systemHealth?.status === 'DEGRADED'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
                }`}>
                <Server size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-normal text-stone-900">
                    System Status: {systemHealth?.status || 'HEALTHY'}
                  </h2>
                  <span className={`w-2 h-2 rounded-full ${systemHealth?.status === 'HEALTHY'
                    ? 'bg-emerald-500'
                    : systemHealth?.status === 'DEGRADED'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                    } animate-pulse`} />
                </div>
                <p className="text-xs text-stone-500 font-sans mt-0.5">
                  Last verified: {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString('en-IN') : 'Live now'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchHealth}
              disabled={isHealthLoading}
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw size={13} className={isHealthLoading ? 'animate-spin' : ''} />
              <span>Ping Connectivity</span>
            </button>
          </div>

          {/* Core Infrastructure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MongoDB */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">
                  DATABASE ENGINE
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${systemHealth?.services.mongodb.status === 'HEALTHY'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
                  }`}>
                  {systemHealth?.services.mongodb.status || 'HEALTHY'}
                </span>
              </div>
              <h3 className="font-serif text-xl text-stone-900">MongoDB Atlas Replica</h3>
              <p className="text-xs text-stone-500">
                Primary persistence cluster for orders, catalog, patrons, and schema collections.
              </p>
              <div className="pt-2 text-xs font-mono text-stone-600">
                Latency: <span className="font-bold text-[#561C08]">{systemHealth?.services.mongodb.latencyMs ?? 12} ms</span>
              </div>
            </div>

            {/* Redis */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">
                  CACHE & LOCKING
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${systemHealth?.services.redis.status === 'HEALTHY'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
                  }`}>
                  {systemHealth?.services.redis.status || 'HEALTHY'}
                </span>
              </div>
              <h3 className="font-serif text-xl text-stone-900">Redis In-Memory Bus</h3>
              <p className="text-xs text-stone-500">
                Session stores, BullMQ job queues, and sub-millisecond SEO & CMS caching layer.
              </p>
              <div className="pt-2 text-xs font-mono text-stone-600">
                Latency: <span className="font-bold text-[#561C08]">{systemHealth?.services.redis.latencyMs ?? 2} ms</span>
              </div>
            </div>
          </div>

          {/* Third-Party Integrations Matrix */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-xl text-stone-900">Cloud Integrations & Gateways</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {[
                { name: 'Razorpay Payments', key: 'razorpay' as const, label: 'Payment Gateway' },
                { name: 'Meta CAPI', key: 'meta' as const, label: 'Conversions API' },
                { name: 'Email Gateway', key: 'email' as const, label: 'Transactional Dispatch' },
                { name: 'Delhivery Logistics', key: 'delhivery' as const, label: 'Courier & Waybills' },
                // { name: 'DeepSeek AI', key: 'deepseek' as const, label: 'Stylist Chatbot' },
                { name: 'Firebase FCM', key: 'firebase' as const, label: 'Push Notifications' },
                { name: 'Cloudflare R2', key: 'cloudflareR2' as const, label: 'Asset Storage' },
                { name: 'Cloudinary CDN', key: 'cloudinary' as const, label: 'Media CDN' },
              ].map(item => {
                const configStatus = systemHealth?.services.integrations?.[item.key]?.status || 'CONFIGURED';
                const isOk = configStatus === 'CONFIGURED';

                return (
                  <div key={item.key} className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 space-y-1 text-xs font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{item.name}</span>
                      {isOk ? (
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={13} className="text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400">{item.label}</p>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}>
                      {configStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
