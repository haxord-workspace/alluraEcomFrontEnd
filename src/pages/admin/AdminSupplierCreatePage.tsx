import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { createSupplier } from '../../service/adminSuppliers';
import { SupplierForm } from '../../components/admin/suppliers/SupplierForm';
import { SupplierBreadcrumb } from '../../components/admin/suppliers/SupplierPageChrome';
import { EMPTY_SUPPLIER_FORM, buildCreatePayload } from '../../components/admin/suppliers/supplierFormModel';

/** Admin › Suppliers › Add supplier (/admin/suppliers/new) */
export const AdminSupplierCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  return (
    <div className="space-y-6 pb-12 min-w-0">
      <div className="border-b border-stone-200 pb-4">
        <SupplierBreadcrumb items={[{ label: 'Suppliers', to: '/admin/suppliers' }, { label: 'Add supplier' }]} />
        <h1 className="font-serif text-3xl text-stone-900 font-normal">Add supplier</h1>
        <p className="text-xs font-sans text-stone-500 mt-0.5">
          A supplier code (SUP-00001, SUP-00002, …) is generated automatically when you save.
        </p>
      </div>

      <SupplierForm
        mode="create"
        initialValues={EMPTY_SUPPLIER_FORM}
        submitLabel="Save supplier"
        onCancel={() => navigate('/admin/suppliers')}
        onSubmit={async values => {
          const { supplier, message } = await createSupplier(buildCreatePayload(values));
          showToast(message || `Supplier ${supplier.supplierCode ? `${supplier.supplierCode} ` : ''}added`, 'success');
          navigate(supplier._id ? `/admin/suppliers/${encodeURIComponent(supplier._id)}` : '/admin/suppliers');
        }}
      />
    </div>
  );
};

export default AdminSupplierCreatePage;
