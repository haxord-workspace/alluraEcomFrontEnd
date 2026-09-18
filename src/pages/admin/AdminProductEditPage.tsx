import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { ProductFormWizard } from '../../components/admin/ProductFormWizard';

export const AdminProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products } = useAdmin();

  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="font-serif text-2xl text-stone-900">Product Not Found</h2>
        <Link to="/admin/products" className="text-xs font-sans text-allura-goldDark underline">
          Return to Product List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Products</span>
          </Link>
          <h1 className="font-serif text-3xl text-stone-900 font-normal">
            Edit: {product.name}
          </h1>
          <p className="text-xs font-sans text-stone-500 mt-0.5 font-mono">
            SKU: {product.sku} • Last updated: Today
          </p>
        </div>

        <Link
          to={`/product/${product.slug}`}
          target="_blank"
          className="px-4 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl text-xs font-sans font-semibold text-stone-700 flex items-center gap-1.5 transition-colors"
        >
          <Eye size={14} />
          <span>Live Storefront Preview</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      {/* 9-Step Wizard in Edit Mode */}
      <ProductFormWizard initialData={product} isEditing={true} />
    </div>
  );
};
