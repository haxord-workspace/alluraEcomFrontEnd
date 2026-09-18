import React, { useState } from 'react';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  CheckCircle2,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { SeoPreviewEditor } from './SeoPreviewEditor';
import type { Product, ProductVariant } from '../../types';

interface ProductFormWizardProps {
  initialData?: Product;
  isEditing?: boolean;
}

export const ProductFormWizard: React.FC<ProductFormWizardProps> = ({
  initialData,
  isEditing = false,
}) => {
  const { addProduct, updateProduct } = useAdmin();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>(() => {
    if (initialData) return { ...initialData };
    return {
      name: '',
      price: 6999,
      originalPrice: 8499,
      costPrice: 3200,
      category: 'Ethnic Wear',
      occasion: 'Festive',
      description: 'Handcrafted luxury modest silhouette tailored in our Kerala atelier with pure natural silk lining.',
      fabricDetails: 'Pure Chanderi Silk with Santoon full inner lining.',
      careInstructions: 'Dry Clean Only to preserve delicate gold zari embroidery.',
      stylingTips: 'Pair with delicate pearl jewellery and statement Kerala antique jhumkas.',
      sku: 'ALR-ETH-009',
      barcode: '8901234567890',
      stockCount: 15,
      status: 'Active',
      colors: [
        { name: 'Ivory Cream', hex: '#F7F1E7' },
        { name: 'Royal Maroon', hex: '#5C1D24' },
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      images: {
        primary: '/images/best-sellers/classic-cream-anarkali.jpeg',
        secondary: '/images/best-sellers/aura-cream-embroidered.jpeg',
        gallery: [
          '/images/best-sellers/classic-cream-anarkali.jpeg',
          '/images/best-sellers/aura-cream-embroidered.jpeg',
        ],
      },
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: ['luxury fashion', 'kerala boutique', 'ethnic wear'],
      },
    };
  });

  const [hasVariants, setHasVariants] = useState(true);
  const [variantList] = useState<ProductVariant[]>(() => {
    if (initialData?.variants && initialData.variants.length > 0) return initialData.variants;
    return [
      {
        id: 'var-1',
        sku: `${formData.sku || 'ALR'}-S-CR`,
        barcode: '890123456701',
        color: { name: 'Cream & Gold', hex: '#EBE3D5' },
        size: 'S',
        price: Number(formData.price || 6999),
        mrp: Number(formData.originalPrice || 8499),
        stockOnHand: 4,
        stockReserved: 1,
        stockAvailable: 3,
        lowStockThreshold: 2,
      },
      {
        id: 'var-2',
        sku: `${formData.sku || 'ALR'}-M-CR`,
        barcode: '890123456702',
        color: { name: 'Cream & Gold', hex: '#EBE3D5' },
        size: 'M',
        price: Number(formData.price || 6999),
        mrp: Number(formData.originalPrice || 8499),
        stockOnHand: 6,
        stockReserved: 2,
        stockAvailable: 4,
        lowStockThreshold: 2,
      },
      {
        id: 'var-3',
        sku: `${formData.sku || 'ALR'}-L-CR`,
        barcode: '890123456703',
        color: { name: 'Cream & Gold', hex: '#EBE3D5' },
        size: 'L',
        price: Number(formData.price || 6999),
        mrp: Number(formData.originalPrice || 8499),
        stockOnHand: 5,
        stockReserved: 0,
        stockAvailable: 5,
        lowStockThreshold: 2,
      },
    ];
  });

  const steps = [
    { num: 1, label: 'Basic' },
    { num: 2, label: 'Pricing' },
    { num: 3, label: 'Attributes' },
    { num: 4, label: 'Images' },
    { num: 5, label: 'Variants' },
    { num: 6, label: 'Barcode' },
    { num: 7, label: 'Inventory' },
    { num: 8, label: 'SEO' },
    { num: 9, label: 'Preview' },
  ];

  const handleNameChange = (val: string) => {
    const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: prev.slug || slug,
      seo: {
        metaTitle: prev.seo?.metaTitle || `${val} | Allura Boutique`,
        metaDescription: prev.seo?.metaDescription || prev.description || 'Allura handcrafted boutique couture',
        keywords: prev.seo?.keywords || ['luxury fashion', 'kerala boutique', 'ethnic wear'],
        canonicalUrl: prev.seo?.canonicalUrl,
        robots: prev.seo?.robots,
        ogTitle: prev.seo?.ogTitle,
        ogDescription: prev.seo?.ogDescription,
        ogImage: prev.seo?.ogImage,
      },
    }));
  };

  const handlePublish = () => {
    if (isEditing && initialData) {
      updateProduct(initialData.id, {
        ...formData,
        variants: variantList,
      });
      navigate('/admin/products');
    } else {
      addProduct({
        name: formData.name || 'New Handcrafted Ensemble',
        slug: formData.slug || 'new-handcrafted-ensemble',
        category: formData.category || 'Ethnic Wear',
        subcategory: formData.subcategory,
        occasion: formData.occasion || 'Festive',
        price: Number(formData.price || 5999),
        originalPrice: Number(formData.originalPrice || 7499),
        costPrice: Number(formData.costPrice || 2500),
        description: formData.description || '',
        shortDescription: formData.shortDescription,
        fabricDetails: formData.fabricDetails || '',
        careInstructions: formData.careInstructions || '',
        stylingTips: formData.stylingTips || '',
        sku: formData.sku || `ALR-${Date.now().toString().slice(-4)}`,
        status: formData.status || 'Active',
        inStock: (formData.stockCount ?? 1) > 0,
        stockCount: Number(formData.stockCount || 10),
        rating: 4.9,
        reviewsCount: 1,
        colors: formData.colors || [{ name: 'Cream', hex: '#F5EFE6' }],
        sizes: formData.sizes || ['S', 'M', 'L'],
        images: formData.images || {
          primary: '/images/best-sellers/classic-cream-anarkali.jpeg',
          secondary: '/images/best-sellers/aura-cream-embroidered.jpeg',
        },
        variants: variantList,
        seo: formData.seo,
      });
      navigate('/admin/products');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      
      {/* Step Wizard Stepper */}
      <div className="bg-allura-card border border-allura-border rounded-2xl p-4 shadow-subtle overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => setStep(s.num)}
                className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-bold transition-all ${
                    step === s.num
                      ? 'bg-allura-darkBrown text-white shadow-sm'
                      : step > s.num
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-allura-bgSecondary text-allura-muted group-hover:bg-stone-200'
                  }`}
                >
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span
                  className={`text-xs font-sans font-medium whitespace-nowrap ${
                    step === s.num ? 'text-allura-text font-bold' : 'text-allura-muted'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-2 ${
                    step > idx + 1 ? 'bg-emerald-500' : 'bg-allura-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Step Container */}
      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6">
        
        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <div className="space-y-5 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 1 — Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="E.g. Classic Cream Anarkali Gown with Maroon Border"
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-medium text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-allura-text focus:outline-none focus:border-allura-gold font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Category
                </label>
                <select
                  value={formData.category || 'Ethnic Wear'}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-allura-text focus:outline-none focus:border-allura-gold"
                >
                  <option value="Ethnic Wear">Ethnic Wear</option>
                  <option value="Modest Wear">Modest Wear</option>
                  <option value="Party Wear">Party Wear</option>
                  <option value="Curated Sets">Curated Sets</option>
                  <option value="Bridal Edit">Bridal Edit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Occasion Type
                </label>
                <select
                  value={formData.occasion || 'Festive'}
                  onChange={e => setFormData({ ...formData, occasion: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-allura-text focus:outline-none focus:border-allura-gold"
                >
                  <option value="Festive">Festive</option>
                  <option value="Bridal">Bridal</option>
                  <option value="Party Wear">Party Wear</option>
                  <option value="Modest Wear">Modest Wear</option>
                  <option value="Ethnic">Ethnic</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Publish Status
                </label>
                <select
                  value={formData.status || 'Active'}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-allura-text focus:outline-none focus:border-allura-gold"
                >
                  <option value="Active">Active (Visible in Storefront)</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Short Editorial Description
                </label>
                <input
                  type="text"
                  value={formData.shortDescription || ''}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Concise boutique tagline..."
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Full Story & Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PRICING */}
        {step === 2 && (
          <div className="space-y-5 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 2 — Pricing & Taxes</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.price || ''}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-serif text-lg font-bold text-allura-darkBrown focus:outline-none focus:border-allura-gold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Original MRP (₹)
                </label>
                <input
                  type="number"
                  value={formData.originalPrice || ''}
                  onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-serif text-lg text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Cost of Production (₹)
                </label>
                <input
                  type="number"
                  value={formData.costPrice || ''}
                  onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-serif text-lg text-allura-muted focus:outline-none focus:border-allura-gold"
                />
              </div>
            </div>

            {/* Profit Margin and Discount calculation */}
            <div className="p-4 bg-allura-bgSecondary/60 rounded-xl border border-allura-border grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] text-allura-muted uppercase font-bold">Discount Offered</span>
                <p className="font-serif text-base font-bold text-emerald-800">
                  {formData.originalPrice && formData.price
                    ? `${Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)}% OFF`
                    : '0%'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-allura-muted uppercase font-bold">Gross Margin</span>
                <p className="font-serif text-base font-bold text-allura-darkBrown">
                  {formData.price && formData.costPrice
                    ? `₹ ${(formData.price - formData.costPrice).toLocaleString('en-IN')} (${Math.round(
                        ((formData.price - formData.costPrice) / formData.price) * 100
                      )}%)`
                    : '—'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-allura-muted uppercase font-bold">Applicable GST</span>
                <p className="font-serif text-base font-bold text-allura-text">5% Integrated GST (Included)</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ATTRIBUTES */}
        {step === 3 && (
          <div className="space-y-5 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 3 — Atelier Attributes</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Fabric & Material
                </label>
                <input
                  type="text"
                  value={formData.material || ''}
                  onChange={e => setFormData({ ...formData, material: e.target.value })}
                  placeholder="E.g. Pure Georgette with Zari"
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Fit Type
                </label>
                <input
                  type="text"
                  value={formData.fit || ''}
                  onChange={e => setFormData({ ...formData, fit: e.target.value })}
                  placeholder="E.g. Modest Flared A-Line"
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Fabric Details & Inner Lining
                </label>
                <input
                  type="text"
                  value={formData.fabricDetails || ''}
                  onChange={e => setFormData({ ...formData, fabricDetails: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Care Instructions
                </label>
                <input
                  type="text"
                  value={formData.careInstructions || ''}
                  onChange={e => setFormData({ ...formData, careInstructions: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Styling Recommendations
                </label>
                <input
                  type="text"
                  value={formData.stylingTips || ''}
                  onChange={e => setFormData({ ...formData, stylingTips: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: IMAGES */}
        {step === 4 && (
          <div className="space-y-5 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 4 — Lookbook & Product Imagery</h3>

            <div className="border-2 border-dashed border-allura-border rounded-2xl p-8 text-center bg-allura-bg/40 space-y-3 cursor-pointer hover:bg-allura-bgSecondary/50 transition-colors">
              <Upload size={32} className="mx-auto text-allura-goldDark" />
              <div>
                <p className="font-medium text-allura-text">Drag & drop high-resolution editorial fashion imagery</p>
                <p className="text-[11px] text-allura-muted">JPEG, PNG, WEBP up to 10MB each (Vertical 3:4 crop recommended)</p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-allura-darkBrown text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Browse Files
              </button>
            </div>

            {/* Existing Images Grid */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-allura-muted">Uploaded Media</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  formData.images?.primary || '/images/best-sellers/classic-cream-anarkali.jpeg',
                  formData.images?.secondary || '/images/best-sellers/aura-cream-embroidered.jpeg',
                ].map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-allura-border bg-stone-100">
                    <img src={img} alt="Product media" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-allura-darkBrown/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="text-[10px] text-white font-bold bg-allura-gold px-2 py-0.5 rounded">
                        {i === 0 ? 'Primary' : 'Secondary'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: VARIANTS */}
        {step === 5 && (
          <div className="space-y-5 text-xs font-sans">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl text-allura-text font-normal">Step 5 — Color & Size Variants</h3>
                <p className="text-allura-muted">Generate and configure SKU variant combinations.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={e => setHasVariants(e.target.checked)}
                  className="accent-allura-gold w-4 h-4"
                />
                <span className="font-bold text-allura-text">Has Variants</span>
              </label>
            </div>

            {hasVariants && (
              <div className="overflow-x-auto border border-allura-border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-allura-bg border-b border-allura-border text-[10px] uppercase font-bold text-allura-muted">
                      <th className="p-3">Color</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Barcode</th>
                      <th className="p-3">Price (₹)</th>
                      <th className="p-3">Stock Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-allura-border/60">
                    {variantList.map(v => (
                      <tr key={v.id} className="hover:bg-white/40">
                        <td className="p-3 flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-300"
                            style={{ backgroundColor: v.color.hex }}
                          />
                          <span>{v.color.name}</span>
                        </td>
                        <td className="p-3 font-bold">{v.size}</td>
                        <td className="p-3 font-mono text-stone-600">{v.sku}</td>
                        <td className="p-3 font-mono text-stone-500">{v.barcode}</td>
                        <td className="p-3 font-bold text-allura-darkBrown">₹ {v.price}</td>
                        <td className="p-3 text-emerald-800 font-bold">{v.stockAvailable} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: BARCODE */}
        {step === 6 && (
          <div className="space-y-5 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 6 — Barcode & SKU Configuration</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Master SKU Code
                </label>
                <input
                  type="text"
                  value={formData.sku || ''}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Barcode (EAN-13 Standard)
                </label>
                <input
                  type="text"
                  value={formData.barcode || '8901234567890'}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Barcode Visual Preview Card */}
            <div className="p-6 bg-white border border-stone-200 rounded-2xl text-center space-y-3 max-w-sm mx-auto shadow-xs">
              <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400">ALLURA ATELIER LABEL</span>
              <p className="font-serif text-sm font-bold text-stone-900">{formData.name || 'Product Label'}</p>
              
              {/* CSS Simulated Barcode Lines */}
              <div className="py-2 flex justify-center items-center gap-1 h-12">
                {[4, 2, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4, 2, 6, 3].map((w, i) => (
                  <span key={i} className="bg-black h-full" style={{ width: `${w}px` }} />
                ))}
              </div>

              <p className="font-mono text-xs tracking-widest font-bold text-stone-800">
                {formData.barcode || '8901234567890'}
              </p>
              <p className="text-[10px] text-stone-500 font-mono">SKU: {formData.sku} • MRP: ₹{formData.originalPrice}</p>
            </div>
          </div>
        )}

        {/* STEP 7: INVENTORY */}
        {step === 7 && (
          <div className="space-y-5 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 7 — Inventory Stock Levels</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Opening Physical Stock
                </label>
                <input
                  type="number"
                  value={formData.stockCount || 10}
                  onChange={e => setFormData({ ...formData, stockCount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-serif text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Low Stock Threshold Alert
                </label>
                <input
                  type="number"
                  defaultValue={3}
                  className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-serif text-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                  Inventory Tracking
                </label>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-medium">
                  ✓ Active Automatic Deduction
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: SEO */}
        {step === 8 && (
          <div className="space-y-5">
            <h3 className="font-serif text-xl text-allura-text font-normal">Step 8 — Search Engine Optimization</h3>
            <SeoPreviewEditor
              seo={formData.seo || { metaTitle: '', metaDescription: '', keywords: [] }}
              onChange={updated => setFormData({ ...formData, seo: updated })}
              defaultSlug={formData.slug}
            />
          </div>
        )}

        {/* STEP 9: PREVIEW & PUBLISH */}
        {step === 9 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-allura-border pb-4">
              <div>
                <h3 className="font-serif text-xl text-allura-text font-normal">Step 9 — Final Preview & Verification</h3>
                <p className="text-xs text-allura-muted">Review how this luxury product will appear on both Desktop and Mobile.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 ${
                    previewMode === 'desktop' ? 'bg-allura-darkBrown text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <Monitor size={14} />
                  <span>Desktop View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 ${
                    previewMode === 'mobile' ? 'bg-allura-darkBrown text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>Mobile View</span>
                </button>
              </div>
            </div>

            {/* Preview Box */}
            <div
              className={`mx-auto bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle ${
                previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-6">
                <img
                  src={formData.images?.primary || '/images/best-sellers/classic-cream-anarkali.jpeg'}
                  alt="Preview"
                  className="w-full sm:w-48 h-64 object-cover rounded-xl bg-stone-100 flex-shrink-0"
                />
                <div className="space-y-2 text-xs font-sans">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark">
                    {formData.category} • {formData.occasion}
                  </span>
                  <h4 className="font-serif text-xl font-normal text-allura-text">{formData.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg font-bold text-allura-darkBrown">
                      ₹ {formData.price?.toLocaleString('en-IN')}
                    </span>
                    {formData.originalPrice && (
                      <span className="line-through text-allura-muted">
                        ₹ {formData.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <p className="text-allura-muted leading-relaxed">{formData.description}</p>
                  <p className="pt-2 text-[11px] text-stone-500 font-mono">
                    SKU: {formData.sku} • Stock: {formData.stockCount} in Atelier
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Footers */}
        <div className="flex justify-between items-center pt-6 border-t border-allura-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-muted hover:text-allura-text flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 9 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Next: {steps[step]?.label}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              className="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg"
            >
              <CheckCircle2 size={16} />
              <span>{isEditing ? 'Save & Update Product' : 'Publish Product to Storefront'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
