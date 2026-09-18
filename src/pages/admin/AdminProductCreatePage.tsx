import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProductFormWizard } from '../../components/admin/ProductFormWizard';

export const AdminProductCreatePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>
        <h1 className="font-serif text-3xl text-stone-900 font-normal">
          Create New Atelier Product
        </h1>
        <p className="text-xs font-sans text-stone-500 mt-0.5">
          Step-by-step product creation wizard with pricing, variants, barcodes, and live SEO preview.
        </p>
      </div>

      {/* 9-Step Wizard Component */}
      <ProductFormWizard isEditing={false} />
    </div>
  );
};
