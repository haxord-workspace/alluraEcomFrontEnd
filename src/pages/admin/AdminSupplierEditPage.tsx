import React, { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useSupplierResource } from '../../hooks/useSupplierResource';
import { getSupplierDetails, updateSupplier } from '../../service/adminSuppliers';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { SupplierForm } from '../../components/admin/suppliers/SupplierForm';
import { SupplierStatusBadge } from '../../components/admin/suppliers/SupplierStatusBadge';
import { PageSpinner, SupplierBreadcrumb, SupplierNotFound } from '../../components/admin/suppliers/SupplierPageChrome';
import { buildUpdatePayload, supplierToFormValues } from '../../components/admin/suppliers/supplierFormModel';

/** Admin › Suppliers › {name} › Edit (/admin/suppliers/:id/edit) */
export const AdminSupplierEditPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useShop();
  const details = useSupplierResource(`edit:${id}`, signal => getSupplierDetails(id, { signal }), 'Could not load the supplier');
  const profile = details.data?.profile;
  const initialValues = useMemo(() => (profile ? supplierToFormValues(profile) : null), [profile]);
  const detailsPath = `/admin/suppliers/${encodeURIComponent(id)}`;

  if (details.status === 'loading') return <PageSpinner label="Loading supplier..." />;
  if (details.error?.status === 404 || details.error?.code === 'SUPPLIER_NOT_FOUND') return <SupplierNotFound />;
  if (details.status === 'error') {
    return (
      <div className="space-y-2">
        <AdminErrorBanner title={details.error?.status === 403 ? 'Access denied' : 'Could not load the supplier'} error={details.error?.message} />
        {details.error?.status !== 403 && (
          <button
            type="button"
            onClick={details.reload}
            className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  if (!profile || !initialValues) return <SupplierNotFound />;
  // Deleted suppliers are read-only
  if (profile.isDeleted) return <Navigate to={detailsPath} replace />;

  return (
    <div className="space-y-6 pb-12 min-w-0">
      <div className="border-b border-stone-200 pb-4">
        <SupplierBreadcrumb
          items={[{ label: 'Suppliers', to: '/admin/suppliers' }, { label: profile.name, to: detailsPath }, { label: 'Edit' }]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl text-stone-900 font-normal">Edit supplier</h1>
          <SupplierStatusBadge status={profile.status} size="md" />
        </div>
        <p className="text-xs font-sans text-stone-500 mt-0.5">
          {profile.name}. Status is changed from the supplier page.
        </p>
      </div>

      <SupplierForm
        // Remount if the supplier reloads so the form starts from the saved values
        key={profile.updatedAt ?? profile._id}
        mode="edit"
        supplierCode={profile.supplierCode}
        initialValues={initialValues}
        submitLabel="Save changes"
        onCancel={() => navigate(detailsPath)}
        onSubmit={async values => {
          const payload = buildUpdatePayload(initialValues, values);
          if (Object.keys(payload).length === 0) {
            navigate(detailsPath);
            return;
          }
          const { message } = await updateSupplier(profile._id, payload);
          showToast(message || 'Supplier updated', 'success');
          navigate(detailsPath);
        }}
      />
    </div>
  );
};

export default AdminSupplierEditPage;
