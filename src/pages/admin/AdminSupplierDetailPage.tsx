import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useSupplierResource } from '../../hooks/useSupplierResource';
import { getSupplierDetails, getSupplierProducts } from '../../service/adminSuppliers';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { InfoTip, SupplierDeletedBadge, SupplierStatusBadge } from '../../components/admin/suppliers/SupplierStatusBadge';
import { useSupplierActions } from '../../hooks/useSupplierActions';
import { PageSpinner, SupplierBreadcrumb, SupplierNotFound } from '../../components/admin/suppliers/SupplierPageChrome';
import { ProductThumb } from '../../components/admin/suppliers/ProductThumb';
import {
  formatCount,
  formatINR,
  formatSupplierDate,
  formatSupplierDateTime,
  getSupplierActivityLabel,
  pluralize,
  SALES_REVENUE_LABEL,
  SALES_REVENUE_SHORT_LABEL,
} from '../../utils/supplierFormat';
import { SUPPLIER_PRODUCT_STATUSES, SUPPLIER_STATUS_LABELS, SUPPLIER_TYPE_LABELS } from '../../types/suppliers';
import type {
  SortOrder,
  Supplier,
  SupplierActivity,
  SupplierDetails,
  SupplierProduct,
  SupplierProductSortField,
  SupplierProductStatus,
} from '../../types/suppliers';

type Tab = 'overview' | 'products';

/** Admin › Suppliers › {name} (/admin/suppliers/:id) */
export const AdminSupplierDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'products' ? 'products' : 'overview';
  const { can } = usePermissions();
  const canEdit = can('supplier_management', 'edit');
  const canChangeStatus = can('supplier_management', 'publish');
  const canDelete = can('supplier_management', 'delete');

  const details = useSupplierResource(`details:${id}`, signal => getSupplierDetails(id, { signal }), 'Could not load the supplier');
  const { reload } = details;

  const setTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams);
      if (next === 'overview') {
        ['tab', 'pq', 'pstatus', 'psort', 'ppage'].forEach(k => params.delete(k));
      } else params.set('tab', next);
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const actions = useSupplierActions({
    canChangeStatus,
    onStatusChanged: () => reload(),
    onDeleted: () => navigate('/admin/suppliers'),
    onViewProducts: () => setTab('products'),
  });

  if (details.status === 'loading' && !details.data) return <PageSpinner label="Loading supplier..." />;
  if (details.error?.status === 404 || details.error?.code === 'SUPPLIER_NOT_FOUND') return <SupplierNotFound />;
  if (details.status === 'error' && !details.data) {
    const forbidden = details.error?.status === 403;
    return (
      <div className="space-y-2">
        <AdminErrorBanner title={forbidden ? 'Access denied' : 'Could not load the supplier'} error={details.error?.message} />
        {!forbidden && (
          <button
            type="button"
            onClick={reload}
            className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  const data = details.data;
  if (!data?.profile) return <SupplierNotFound />;

  const { profile } = data;
  const isDeleted = !!profile.isDeleted;
  const productCount = data.productCount ?? 0;
  const deleteHint =
    productCount > 0
      ? `Can't delete: ${pluralize(productCount, 'product')} still use this supplier. Move them or deactivate it instead.`
      : 'Delete supplier';
  const actionTarget = { _id: profile._id, name: profile.name, status: profile.status, productCount };

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div className="min-w-0">
          <SupplierBreadcrumb items={[{ label: 'Suppliers', to: '/admin/suppliers' }, { label: profile.name }]} />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl text-stone-900 font-normal break-words">{profile.name}</h1>
            <SupplierStatusBadge status={profile.status} size="md" />
            {isDeleted && <SupplierDeletedBadge />}
          </div>
          <p className="text-xs font-sans text-stone-500 mt-0.5 break-words">
            <span className="font-mono">{profile.supplierCode}</span>
            {profile.companyName && <> · <span title={profile.companyName}>{profile.companyName}</span></>}
            {profile.supplierType && <> · {SUPPLIER_TYPE_LABELS[profile.supplierType]}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Refresh"
            aria-label="Refresh supplier"
          >
            <RefreshCw size={15} className={details.isRefetching ? 'animate-spin' : ''} />
          </button>
          {!isDeleted && canChangeStatus && (
            <button
              type="button"
              onClick={() => actions.openStatus(actionTarget)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck size={14} />
              <span>Change status</span>
            </button>
          )}
          {!isDeleted && canDelete && (
            <span title={deleteHint} className="inline-flex">
              <button
                type="button"
                onClick={() => void actions.requestDelete(actionTarget)}
                disabled={productCount > 0 || actions.deletingId === profile._id}
                aria-label={productCount > 0 ? deleteHint : 'Delete supplier'}
                className="px-4 py-2 border border-stone-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-stone-600 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-600 disabled:hover:border-stone-200"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </span>
          )}
          {!isDeleted && canEdit && (
            <Link
              to={`/admin/suppliers/${encodeURIComponent(profile._id)}/edit`}
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Edit3 size={14} />
              <span>Edit supplier</span>
            </Link>
          )}
        </div>
      </div>

      {isDeleted && (
        <div role="status" className="p-3.5 bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-sans flex items-start gap-3">
          <AlertTriangle size={16} className="text-stone-500 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">This supplier was deleted</span>
            {profile.deletedAt ? ` on ${formatSupplierDate(profile.deletedAt)}` : ''}. It is kept for history and
            can't be edited or assigned to products.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Supplier sections">
        {(
          [
            ['overview', 'Overview'],
            ['products', `Products (${formatCount(productCount)})`],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`supplier-tab-${key}`}
              aria-selected={active}
              aria-controls={`supplier-panel-${key}`}
              onClick={() => setTab(key)}
              className={`min-h-10 px-4 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${
                active ? 'bg-[#561C08] text-white shadow-xs' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`supplier-panel-${tab}`} aria-labelledby={`supplier-tab-${tab}`}>
        {tab === 'overview' ? (
          <OverviewTab data={data} onViewAll={() => setTab('products')} />
        ) : (
          <ProductsTab supplierId={profile._id} />
        )}
      </div>

      {actions.layer}
    </div>
  );
};

// ── Overview ─────────────────────────────────────────────────────────────────

const Card: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  action,
  children,
  className = '',
}) => (
  <section className={`bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 min-w-0 ${className}`}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-xl font-normal text-stone-900">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const Stat: React.FC<{ label: string; value: string; hint?: React.ReactNode; info?: string; title?: string }> = ({
  label,
  value,
  hint,
  info,
  title,
}) => (
  <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1 min-w-0">
    <span className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase text-stone-400">
      <span className="truncate" title={title ?? label}>
        {label}
      </span>
      <InfoTip text={info} label={label} />
    </span>
    <p className="font-serif text-2xl font-bold text-[#561C08] break-words">{value}</p>
    {hint && <div className="text-[11px] text-stone-500 font-sans">{hint}</div>}
  </div>
);

const OverviewTab: React.FC<{ data: SupplierDetails; onViewAll: () => void }> = ({ data, onViewAll }) => {
  const { profile, salesSummary: sales, inventoryContribution: inv } = data;
  const defs = data.definitions ?? {};
  const missingCost = inv?.unitsInStockWithoutCost ?? 0;
  const distribution = data.productStatusDistribution;
  const distTotal = distribution ? SUPPLIER_PRODUCT_STATUSES.reduce((sum, s) => sum + (distribution[s] ?? 0), 0) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat label="Products" value={formatCount(data.productCount)} />
        <Stat
          label={SALES_REVENUE_SHORT_LABEL}
          title={SALES_REVENUE_LABEL}
          value={formatINR(sales?.salesRevenue)}
          info={defs.salesRevenue}
          hint="Before refunds"
        />
        <Stat label="Units sold" value={formatCount(sales?.unitsSold)} info={defs.unitsSold} />
        <Stat label="Orders" value={formatCount(sales?.orderCount)} info={defs.orderCount} />
        <Stat label="Units in stock" value={formatCount(inv?.unitsInStock)} info={defs.unitsInStock} hint={`${formatCount(inv?.unitsAvailable)} available`} />
        <Stat
          label="Stock value (cost)"
          value={formatINR(inv?.inventoryValueAtCost)}
          info={defs.inventoryValueAtCost}
          hint={
            missingCost > 0 ? (
              <span className="text-amber-700 font-semibold">
                {pluralize(missingCost, 'unit')} {missingCost === 1 ? 'has' : 'have'} no cost price
              </span>
            ) : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card title="Sales">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-sans">
              <Detail label={SALES_REVENUE_LABEL} value={formatINR(sales?.salesRevenue)} />
              <Detail label="Units sold" value={formatCount(sales?.unitsSold)} />
              <Detail label="Orders" value={formatCount(sales?.orderCount)} />
              <Detail label="Products sold" value={formatCount(sales?.productsSold)} />
              <Detail label="Revenue per product" value={formatINR(sales?.avgRevenuePerProduct)} />
              <Detail
                label="First / last sale"
                value={
                  sales?.firstSaleAt
                    ? `${formatSupplierDate(sales.firstSaleAt)} – ${formatSupplierDate(sales.lastSaleAt) || '—'}`
                    : 'No sales yet'
                }
              />
            </dl>
            <p className="text-[11px] text-stone-500 font-sans border-t border-stone-100 pt-3">
              Sales follow the product's current supplier. If a product's supplier changes, its past sales move to the new
              supplier.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Inventory">
              <dl className="grid grid-cols-2 gap-4 text-xs font-sans">
                <Detail label="Units in stock" value={formatCount(inv?.unitsInStock)} />
                <Detail label="Units available" value={formatCount(inv?.unitsAvailable)} />
                <Detail
                  label="Value at cost price"
                  value={formatINR(inv?.inventoryValueAtCost)}
                  className="col-span-2"
                  hint={
                    missingCost > 0
                      ? `${pluralize(missingCost, 'unit')} ${missingCost === 1 ? 'has' : 'have'} no cost price, so this value is lower than it should be.`
                      : undefined
                  }
                />
              </dl>
            </Card>
            <Card title="Purchases">
              <div className="text-center py-4 space-y-1 text-xs font-sans">
                <p className="font-semibold text-stone-700">Not tracked yet</p>
                <p className="text-stone-500">
                  {data.purchaseSummary?.reason || 'Purchase orders from suppliers are not recorded in Allura yet.'}
                </p>
              </div>
            </Card>
          </div>

          <Card
            title="Recent products"
            action={
              data.productCount > 0 ? (
                <button type="button" onClick={onViewAll} className="text-xs font-sans font-bold text-allura-goldDark underline">
                  View all
                </button>
              ) : undefined
            }
          >
            {data.recentProducts?.length ? (
              <ProductTable products={data.recentProducts} compact />
            ) : (
              <EmptyState icon={<Package size={22} />} text="No products use this supplier yet." />
            )}
          </Card>
        </div>

        <div className="space-y-6 min-w-0">
          <ContactCard profile={profile} />

          <Card title="Product status">
            {distTotal === 0 ? (
              <EmptyState text="No products yet." />
            ) : (
              <ul className="space-y-2.5 text-xs font-sans" aria-label="Product status distribution">
                {SUPPLIER_PRODUCT_STATUSES.map(status => {
                  const count = distribution?.[status] ?? 0;
                  const pct = distTotal > 0 ? Math.round((count / distTotal) * 100) : 0;
                  return (
                    <li key={status} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3" aria-label={`${status}: ${count}`}>
                      <span className="font-semibold text-stone-700 capitalize">{status.toLowerCase()}</span>
                      <span className="h-2.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                        <span className="block h-full bg-[#561C08] rounded-full" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-right text-stone-500 tabular-nums">{formatCount(count)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Activity">
            <ActivityTimeline activity={data.recentActivity ?? []} supplierId={profile._id} />
          </Card>
        </div>
      </div>
    </div>
  );
};

const Detail: React.FC<{ label: string; value: React.ReactNode; hint?: string; className?: string }> = ({
  label,
  value,
  hint,
  className = '',
}) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-[10px] font-bold uppercase text-stone-400">{label}</dt>
    <dd className="text-stone-900 font-semibold mt-0.5 break-words">{value}</dd>
    {hint && <dd className="text-[11px] text-amber-700 mt-0.5">{hint}</dd>}
  </div>
);

const EmptyState: React.FC<{ text: string; icon?: React.ReactNode }> = ({ text, icon }) => (
  <div className="py-6 text-center text-xs font-sans text-stone-400 space-y-2">
    {icon && <div className="flex justify-center text-stone-300">{icon}</div>}
    <p>{text}</p>
  </div>
);

const ContactCard: React.FC<{ profile: Supplier }> = ({ profile }) => {
  const addressLine = [profile.address, profile.city, profile.state, profile.postalCode, profile.country]
    .filter(Boolean)
    .join(', ');
  const rows: { icon: React.ReactNode; label: string; value?: React.ReactNode }[] = [
    { icon: <Building2 size={14} />, label: 'Contact person', value: profile.contactPerson },
    {
      icon: <Mail size={14} />,
      label: 'Email',
      value: profile.email ? (
        <a href={`mailto:${profile.email}`} className="hover:text-allura-goldDark hover:underline break-all">
          {profile.email}
        </a>
      ) : undefined,
    },
    {
      icon: <Phone size={14} />,
      label: 'Phone',
      value: profile.phone ? (
        <a href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`} className="font-mono hover:text-allura-goldDark hover:underline">
          {profile.phone}
        </a>
      ) : undefined,
    },
    // Shown only when it has a value
    ...(profile.alternatePhone
      ? [
          {
            icon: <Phone size={14} />,
            label: 'Alternate phone',
            value: (
              <a href={`tel:${profile.alternatePhone.replace(/[^\d+]/g, '')}`} className="font-mono hover:text-allura-goldDark hover:underline">
                {profile.alternatePhone}
              </a>
            ),
          },
        ]
      : []),
    {
      icon: <Globe size={14} />,
      label: 'Website',
      value: profile.website ? (
        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-allura-goldDark hover:underline break-all">
          {profile.website}
        </a>
      ) : undefined,
    },
    { icon: <MapPin size={14} />, label: 'Address', value: addressLine || undefined },
  ];

  return (
    <Card title="Contact & business">
      <ul className="space-y-3 text-xs font-sans">
        {rows.map(row => (
          <li key={row.label} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-stone-400" aria-hidden="true">
              {row.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-stone-400">{row.label}</p>
              <p className="text-stone-900 break-words">{row.value || <span className="text-stone-300">—</span>}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-3 text-xs font-sans border-t border-stone-100 pt-3">
        <Detail label="GSTIN / Tax ID" value={<span className="font-mono">{profile.taxIdentificationNumber || '—'}</span>} />
        <Detail label="Payment terms" value={profile.paymentTerms || '—'} />
        <Detail label="Added" value={formatSupplierDate(profile.createdAt) || '—'} />
        <Detail label="Updated" value={formatSupplierDate(profile.updatedAt) || '—'} />
      </dl>
      {profile.notes && (
        <div className="border-t border-stone-100 pt-3 text-xs font-sans">
          <p className="text-[10px] font-bold uppercase text-stone-400 mb-1">Notes</p>
          <p className="text-stone-700 whitespace-pre-line break-words">{profile.notes}</p>
        </div>
      )}
    </Card>
  );
};

const ActivityTimeline: React.FC<{ activity: SupplierActivity[]; supplierId: string }> = ({ activity, supplierId }) => {
  if (activity.length === 0) return <EmptyState text="No activity yet." />;
  return (
    <ol className="relative space-y-4 text-xs font-sans before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-stone-200">
      {activity.map((entry, idx) => {
        const meta = entry.metadata ?? {};
        const isStatus = entry.action === 'SUPPLIER_STATUS_CHANGED';
        const toStatus = typeof meta.toStatus === 'string' ? meta.toStatus : typeof meta.status === 'string' ? meta.status : undefined;
        return (
          <li key={entry._id ?? `${entry.action}-${entry.createdAt}-${idx}`} className="relative pl-6">
            <span className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2 border-white bg-[#561C08] shadow-xs" aria-hidden="true" />
            <p className="font-semibold text-stone-900">
              {getSupplierActivityLabel(entry, supplierId)}
              {isStatus && toStatus && toStatus in SUPPLIER_STATUS_LABELS && (
                <> to {SUPPLIER_STATUS_LABELS[toStatus as keyof typeof SUPPLIER_STATUS_LABELS].toLowerCase()}</>
              )}
            </p>
            {isStatus && typeof meta.reason === 'string' && meta.reason && (
              <p className="text-stone-600 mt-0.5">Reason: {meta.reason}</p>
            )}
            <p className="text-[10px] text-stone-400 mt-0.5">{formatSupplierDateTime(entry.createdAt)}</p>
          </li>
        );
      })}
    </ol>
  );
};

// ── Products table (same look as the product list) ───────────────────────────

const ProductTable: React.FC<{ products: SupplierProduct[]; compact?: boolean }> = ({ products, compact = false }) => (
  <div className={`overflow-x-auto ${compact ? '-mx-5 sm:-mx-6' : ''}`}>
    <table className="w-full min-w-[560px] text-left text-xs font-sans border-collapse">
      <thead>
        <tr className="bg-stone-50 border-y border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
          <th className="p-4">Product Details</th>
          <th className="p-4">Selling Price</th>
          <th className="p-4">Status</th>
          <th className="p-4">Added</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {products.map(product => {
          return (
            <tr key={product._id} className="hover:bg-stone-50/70 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <ProductThumb product={product} />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-serif text-sm font-medium text-stone-900 leading-tight break-words">{product.name}</p>
                    {product.sku && <p className="font-mono text-[10px] text-stone-400">SKU: {product.sku}</p>}
                  </div>
                </div>
              </td>
              <td className="p-4 font-bold text-[#561C08] whitespace-nowrap">{formatINR(product.pricing?.sellingPrice, true)}</td>
              <td className="p-4">
                <StatusBadge status={product.status} size="sm" />
              </td>
              <td className="p-4 text-stone-500 whitespace-nowrap">{formatSupplierDate(product.createdAt) || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const PRODUCT_SORTS: { value: string; label: string; sortBy: SupplierProductSortField; sortOrder: SortOrder }[] = [
  { value: 'createdAt:desc', label: 'Newest first', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'createdAt:asc', label: 'Oldest first', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'updatedAt:desc', label: 'Recently updated', sortBy: 'updatedAt', sortOrder: 'desc' },
  { value: 'name:asc', label: 'Name (A-Z)', sortBy: 'name', sortOrder: 'asc' },
  { value: 'name:desc', label: 'Name (Z-A)', sortBy: 'name', sortOrder: 'desc' },
  { value: 'pricing.sellingPrice:desc', label: 'Price: High to Low', sortBy: 'pricing.sellingPrice', sortOrder: 'desc' },
  { value: 'pricing.sellingPrice:asc', label: 'Price: Low to High', sortBy: 'pricing.sellingPrice', sortOrder: 'asc' },
];
const PRODUCTS_LIMIT = 20;

const ProductsTab: React.FC<{ supplierId: string }> = ({ supplierId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('pq')?.trim() || undefined;
  const statusParam = searchParams.get('pstatus')?.toUpperCase();
  const status = (SUPPLIER_PRODUCT_STATUSES as readonly string[]).includes(statusParam || '')
    ? (statusParam as SupplierProductStatus)
    : undefined;
  const sort = PRODUCT_SORTS.find(s => s.value === searchParams.get('psort')) ?? PRODUCT_SORTS[0];
  const pageNum = Number(searchParams.get('ppage'));
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;

  const params = useMemo(
    () => ({ search, status, sortBy: sort.sortBy, sortOrder: sort.sortOrder, page, limit: PRODUCTS_LIMIT }),
    [search, status, sort, page]
  );
  const list = useSupplierResource(
    `products:${supplierId}:${JSON.stringify(params)}`,
    signal => getSupplierProducts(supplierId, params, { signal }),
    'Could not load products'
  );

  const update = useCallback(
    (changes: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([k, v]) => {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      if (!('ppage' in changes) || next.get('ppage') === '1') next.delete('ppage');
      if (next.get('psort') === PRODUCT_SORTS[0].value) next.delete('psort');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Debounced search box
  const [draft, setDraft] = useState(search ?? '');
  useEffect(() => {
    if (draft.trim() === (search ?? '')) return;
    const t = setTimeout(() => update({ pq: draft.trim() || undefined }), 350);
    return () => clearTimeout(t);
  }, [draft, search, update]);

  const rows = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const hasFilters = !!(search || status);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Search by name, SKU or slug..."
            aria-label="Search this supplier's products"
            className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800"
          />
          {draft && (
            <button
              type="button"
              onClick={() => setDraft('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status ?? ''}
            onChange={e => update({ pstatus: e.target.value || undefined })}
            aria-label="Filter products by status"
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none cursor-pointer"
          >
            <option value="">Status: All</option>
            {SUPPLIER_PRODUCT_STATUSES.map(s => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-2.5 py-1.5 bg-stone-50 text-xs text-stone-700">
            <ArrowUpDown size={13} className="text-stone-400" aria-hidden="true" />
            <select
              value={sort.value}
              onChange={e => update({ psort: e.target.value })}
              aria-label="Sort products"
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
            >
              {PRODUCT_SORTS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {list.status === 'error' ? (
        <div className="space-y-2">
          <AdminErrorBanner title="Could not load products" error={list.error?.message} />
          <button
            type="button"
            onClick={list.reload}
            className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          {list.status === 'loading' && !list.isRefetching ? (
            <PageSpinner label="Loading products..." />
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-xs font-sans text-stone-500 space-y-2">
              <p>{hasFilters ? 'No products match these filters.' : 'No products use this supplier yet.'}</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    update({ pq: undefined, pstatus: undefined });
                  }}
                  className="font-bold text-allura-goldDark underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className={list.isRefetching ? 'opacity-60 transition-opacity' : ''}>
              <ProductTable products={rows} />
            </div>
          )}
          {list.data && total > 0 && (
            <AdminPagination currentPage={page} totalItems={total} pageSize={PRODUCTS_LIMIT} onPageChange={p => update({ ppage: p })} />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSupplierDetailPage;
