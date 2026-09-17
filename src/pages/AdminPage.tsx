import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  MessageSquare, 
  Image as ImageIcon, 
  Settings, 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Phone, 
  ChevronRight, 
  ArrowLeft 
} from 'lucide-react';
import { productsData as initialProducts } from '../data/products';
import type { Product } from '../types';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'leads' | 'media' | 'settings'>('dashboard');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    originalPrice: '',
    category: 'Ethnic Wear',
    occasion: 'Festive',
    stockCount: '10',
    image: '/images/best-sellers/classic-cream-anarkali.jpeg',
    description: '',
  });

  // Mock Orders Data
  const [orders] = useState([
    {
      id: 'ALR-ORD-8821',
      customer: 'Amina Fathima',
      phone: '+91 98471 23456',
      city: 'Perinthalmanna, Malappuram',
      items: 'Classic Cream Anarkali Gown (M)',
      total: 8999,
      payment: 'UPI (Paid)',
      status: 'Shipped',
      date: 'Today, 2:40 PM',
    },
    {
      id: 'ALR-ORD-8820',
      customer: 'Dr. Shahina K.',
      phone: '+91 97450 88912',
      city: 'Kozhikode',
      items: 'Emerald Festive Silk Kurta Set (L)',
      total: 7999,
      payment: 'Card (Paid)',
      status: 'Processing',
      date: 'Today, 11:15 AM',
    },
    {
      id: 'ALR-ORD-8819',
      customer: 'Zainab Nabeel',
      phone: '+91 99955 67890',
      city: 'Kochi, Ernakulam',
      items: 'Blush Parisian Modest Pleated Set (S)',
      total: 5499,
      payment: 'COD',
      status: 'Delivered',
      date: 'Yesterday',
    },
    {
      id: 'ALR-ORD-8818',
      customer: 'Roshna Mariyam',
      phone: '+91 94470 11223',
      city: 'Manjeri, Malappuram',
      items: 'Elegant Cream Embroidered Dress (XL)',
      total: 6499,
      payment: 'UPI (Paid)',
      status: 'Delivered',
      date: '11 Sep 2026',
    },
    {
      id: 'ALR-ORD-8817',
      customer: 'Farzana Rafeeq',
      phone: '+91 98950 33445',
      city: 'Dubai (International Express)',
      items: 'Royal Crimson Modest Bridal Lehenga (Custom)',
      total: 18999,
      payment: 'Bank Transfer (Paid)',
      status: 'Processing',
      date: '10 Sep 2026',
    },
  ]);

  // Mock Bridal & Sizing Leads
  const leads = [
    {
      id: 'LEAD-101',
      name: 'Aysha Minhath',
      phone: '+91 90379 91774',
      type: 'Bridal Consultation',
      notes: 'Looking for bespoke wedding lehenga fitting at Perinthalmanna boutique for Dec wedding.',
      date: '13 Sep 2026',
      status: 'New',
    },
    {
      id: 'LEAD-102',
      name: 'Nadha Parveen',
      phone: '+91 97441 55667',
      type: 'Custom Sizing Query',
      notes: 'Needs custom length adjustment (+3 inches) for Classic Cream Anarkali.',
      date: '12 Sep 2026',
      status: 'Followed Up',
    },
    {
      id: 'LEAD-103',
      name: 'Fathima Lubna',
      phone: '+91 98956 77889',
      type: 'Store Visit Booking',
      notes: 'Visiting Ooty Road boutique this Saturday with family for Eid pre-orders.',
      date: '11 Sep 2026',
      status: 'Confirmed',
    },
  ];

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const added: Product = {
      id: `prod-${Date.now()}`,
      slug: newProduct.name.toLowerCase().replace(/\s+/g, '-'),
      name: newProduct.name,
      price: Number(newProduct.price),
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : Number(newProduct.price) * 1.15,
      category: newProduct.category as any,
      occasion: newProduct.occasion as any,
      rating: 5.0,
      reviewsCount: 1,
      isBestSeller: true,
      inStock: true,
      stockCount: Number(newProduct.stockCount) || 10,
      colors: [{ name: 'Default', hex: '#EBE3D5' }],
      sizes: ['S', 'M', 'L', 'XL'],
      images: {
        primary: newProduct.image || '/images/best-sellers/classic-cream-anarkali.jpeg',
        secondary: newProduct.image || '/images/best-sellers/aura-cream-embroidered.jpeg',
        gallery: [newProduct.image || '/images/best-sellers/classic-cream-anarkali.jpeg']
      },
      description: newProduct.description || 'Curated luxury garment from Allura Boutique.',
      fabricDetails: 'Premium Fabric with full modest inner lining.',
      careInstructions: 'Dry clean only.',
      stylingTips: 'Pair with modest accessories and statement heels.',
      sku: `ALR-${Date.now().toString().slice(-4)}`
    };

    setProducts([added, ...products]);
    setIsAddModalOpen(false);
    setNewProduct({
      name: '',
      price: '',
      originalPrice: '',
      category: 'Ethnic Wear',
      occasion: 'Festive',
      stockCount: '10',
      image: '/images/best-sellers/classic-cream-anarkali.jpeg',
      description: '',
    });
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleToggleStock = (id: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, inStock: !p.inStock } : p));
  };

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[#F7F1E7] text-[#2C2926] flex flex-col font-sans">
      {/* Top Admin Header Bar */}
      <header className="bg-[#2C2926] text-[#FCFAF6] border-b border-[#3E3833] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-xs text-[#DED2C1] hover:text-[#FCFAF6] transition-colors border-r border-[#4A423B] pr-4">
              <ArrowLeft size={14} />
              <span>Back to Store</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#8B6335] flex items-center justify-center font-serif text-sm font-bold text-[#FCFAF6]">
                A
              </div>
              <div>
                <h1 className="font-serif text-base tracking-wider leading-none">ALLURA BOUTIQUE</h1>
                <span className="text-[10px] text-[#A77B43] tracking-widest font-sans uppercase font-bold">ADMIN PORTAL</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#3E3833] text-[#DED2C1] px-3 py-1.5 rounded-full border border-[#4A423B]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Perinthalmanna Flagship Online
            </span>
            <div className="w-8 h-8 rounded-full bg-[#8B6335]/30 border border-[#8B6335] flex items-center justify-center font-bold text-xs text-[#FCFAF6]">
              ST
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Admin Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-2">
          <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] p-3 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#8B6335] text-[#FCFAF6] shadow-xs'
                  : 'text-[#2C2926] hover:bg-[#EFE5D5]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Overview & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'products'
                  ? 'bg-[#8B6335] text-[#FCFAF6] shadow-xs'
                  : 'text-[#2C2926] hover:bg-[#EFE5D5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package size={16} />
                <span>Products & Stock</span>
              </div>
              <span className="bg-[#2C2926]/10 px-2 py-0.5 rounded-full text-[10px]">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'orders'
                  ? 'bg-[#8B6335] text-[#FCFAF6] shadow-xs'
                  : 'text-[#2C2926] hover:bg-[#EFE5D5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={16} />
                <span>Orders</span>
              </div>
              <span className="bg-amber-500/20 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'leads'
                  ? 'bg-[#8B6335] text-[#FCFAF6] shadow-xs'
                  : 'text-[#2C2926] hover:bg-[#EFE5D5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={16} />
                <span>Bridal & Stylist Leads</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'media'
                  ? 'bg-[#8B6335] text-[#FCFAF6] shadow-xs'
                  : 'text-[#2C2926] hover:bg-[#EFE5D5]'
              }`}
            >
              <ImageIcon size={16} />
              <span>Banners & Media</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#8B6335] text-[#FCFAF6] shadow-xs'
                  : 'text-[#2C2926] hover:bg-[#EFE5D5]'
              }`}
            >
              <Settings size={16} />
              <span>Boutique Settings</span>
            </button>
          </div>

          {/* Quick Support Card */}
          <div className="bg-[#EFE5D5] rounded-xl border border-[#DED2C1] p-4 text-xs space-y-2">
            <h4 className="font-serif text-sm font-semibold text-[#2C2926]">Perinthalmanna Stylist Desk</h4>
            <p className="text-[#746A60]">WhatsApp helpline is actively receiving bridal inquiries.</p>
            <a
              href="https://wa.me/919037991774"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#8B6335] font-bold hover:underline"
            >
              <Phone size={13} />
              <span>+91 9037991774</span>
            </a>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#FCFAF6] p-5 rounded-xl border border-[#DED2C1] shadow-xs space-y-1.5">
                  <span className="text-[11px] font-sans font-bold text-[#746A60] tracking-wider uppercase">Total Revenue</span>
                  <div className="font-serif text-2xl sm:text-3xl text-[#2C2926]">₹3,48,200</div>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                    <TrendingUp size={12} /> +18.4% this month
                  </span>
                </div>

                <div className="bg-[#FCFAF6] p-5 rounded-xl border border-[#DED2C1] shadow-xs space-y-1.5">
                  <span className="text-[11px] font-sans font-bold text-[#746A60] tracking-wider uppercase">Total Orders</span>
                  <div className="font-serif text-2xl sm:text-3xl text-[#2C2926]">84</div>
                  <span className="text-[10px] text-[#8B6335] font-semibold">5 orders in processing</span>
                </div>

                <div className="bg-[#FCFAF6] p-5 rounded-xl border border-[#DED2C1] shadow-xs space-y-1.5">
                  <span className="text-[11px] font-sans font-bold text-[#746A60] tracking-wider uppercase">Live Products</span>
                  <div className="font-serif text-2xl sm:text-3xl text-[#2C2926]">{products.length}</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">All in stock</span>
                </div>

                <div className="bg-[#FCFAF6] p-5 rounded-xl border border-[#DED2C1] shadow-xs space-y-1.5">
                  <span className="text-[11px] font-sans font-bold text-[#746A60] tracking-wider uppercase">Bridal Leads</span>
                  <div className="font-serif text-2xl sm:text-3xl text-[#2C2926]">{leads.length}</div>
                  <span className="text-[10px] text-[#A77B43] font-semibold">3 appointments pending</span>
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DED2C1]">
                  <div>
                    <h3 className="font-serif text-lg text-[#2C2926] font-medium">Recent Boutique Orders</h3>
                    <p className="text-xs text-[#746A60]">Latest orders placed online and via WhatsApp desk</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-sans font-bold text-[#8B6335] hover:underline flex items-center gap-1"
                  >
                    <span>View All Orders</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#DED2C1]/70 text-[#746A60] font-semibold tracking-wider uppercase text-[10px]">
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED2C1]/50">
                      {orders.slice(0, 4).map(order => (
                        <tr key={order.id} className="hover:bg-[#EFE5D5]/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-[#2C2926]">{order.id}</td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-[#2C2926]">{order.customer}</div>
                            <div className="text-[10px] text-[#746A60]">{order.city}</div>
                          </td>
                          <td className="py-3 px-3 text-[#746A60] max-w-xs truncate">{order.items}</td>
                          <td className="py-3 px-3 font-bold text-[#8B6335]">₹{order.total.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'Shipped'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <a
                              href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${order.customer}, this is Allura Boutique regarding your order ${order.id}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs"
                            >
                              <Phone size={10} />
                              <span>WhatsApp</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS & STOCK */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FCFAF6] p-4 rounded-xl border border-[#DED2C1]">
                {/* Search & Filter */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#746A60]" />
                    <input
                      type="text"
                      placeholder="Search product name or SKU..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#8B6335]"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#8B6335]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Ethnic Wear">Ethnic Wear</option>
                    <option value="Modest Wear">Modest Wear</option>
                    <option value="Party Wear">Party Wear</option>
                  </select>
                </div>

                {/* Add Product Button */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#8B6335] hover:bg-[#2C2926] text-[#FCFAF6] text-xs font-sans font-bold tracking-wider uppercase px-4 py-2 rounded-lg shadow-xs transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Product Grid Table */}
              <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#EFE5D5]/50 border-b border-[#DED2C1] text-[#746A60] font-semibold tracking-wider uppercase text-[10px]">
                      <th className="py-3 px-4">Garment</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DED2C1]/50">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-[#EFE5D5]/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images.primary}
                              alt={product.name}
                              className="w-12 h-14 object-cover rounded-md border border-[#DED2C1] bg-[#EFE5D5]"
                            />
                            <div>
                              <div className="font-semibold text-[#2C2926]">{product.name}</div>
                              <div className="text-[10px] text-[#746A60]">SKU: {product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-[#EFE5D5] text-[#8B6335] px-2 py-0.5 rounded text-[10px] font-semibold">
                            {product.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#8B6335]">
                          ₹{product.price.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#2C2926]">{product.stockCount} units</span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStock(product.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              product.inStock
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            {product.inStock ? 'In Stock' : 'Out of Stock'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/product/${product.slug}`}
                              target="_blank"
                              className="p-1.5 rounded hover:bg-[#EFE5D5] text-[#746A60] hover:text-[#2C2926]"
                              title="View on Store"
                            >
                              <Eye size={14} />
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 rounded hover:bg-rose-100 text-rose-600 hover:text-rose-800"
                              title="Delete Product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] p-6 shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#DED2C1]">
                <div>
                  <h3 className="font-serif text-xl text-[#2C2926] font-medium">Boutique Orders</h3>
                  <p className="text-xs text-[#746A60]">Manage all client orders and dispatch statuses</p>
                </div>
                <div className="text-xs text-[#8B6335] font-bold">
                  Total Orders: {orders.length}
                </div>
              </div>

              <div className="divide-y divide-[#DED2C1]/60">
                {orders.map(order => (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2C2926]">{order.id}</span>
                        <span className="text-[10px] text-[#746A60]">• {order.date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'Shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#2C2926] font-medium">
                        {order.customer} ({order.phone})
                      </div>
                      <div className="text-[11px] text-[#746A60]">
                        {order.items} — {order.city}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="font-serif text-base font-bold text-[#8B6335]">₹{order.total.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-[#746A60]">{order.payment}</div>
                      </div>

                      <a
                        href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${order.customer}, this is Allura Boutique updating you on your order ${order.id}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs"
                      >
                        <Phone size={12} />
                        <span>Chat</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LEADS & BRIDAL CONSULTATIONS */}
          {activeTab === 'leads' && (
            <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] p-6 shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#DED2C1]">
                <div>
                  <h3 className="font-serif text-xl text-[#2C2926] font-medium">Bridal & Stylist Desk Leads</h3>
                  <p className="text-xs text-[#746A60]">Requests captured via WhatsApp stylist and contact forms</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {leads.map(lead => (
                  <div key={lead.id} className="p-4 rounded-xl border border-[#DED2C1] bg-[#EFE5D5]/30 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#8B6335]">
                          {lead.type}
                        </span>
                        <span className="text-[10px] bg-[#8B6335]/15 text-[#8B6335] px-2 py-0.5 rounded-full font-bold">
                          {lead.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#2C2926]">{lead.name}</h4>
                      <p className="text-xs text-[#746A60] leading-relaxed">{lead.notes}</p>
                    </div>

                    <div className="pt-2 border-t border-[#DED2C1]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#746A60]">{lead.date}</span>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${lead.name}, this is Allura Boutique following up on your ${lead.type} request.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-[#25D366] text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-xs"
                      >
                        <Phone size={10} />
                        <span>Connect</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BANNERS & MEDIA */}
          {activeTab === 'media' && (
            <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] p-6 shadow-xs space-y-6 animate-fade-in">
              <div>
                <h3 className="font-serif text-xl text-[#2C2926] font-medium">Boutique Media & Banners</h3>
                <p className="text-xs text-[#746A60]">Preview active hero banners and boutique photography</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl overflow-hidden border border-[#DED2C1] bg-[#EFE5D5] space-y-2 p-3">
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-black/5">
                    <img src="/images/hero-banners/slide-1.jpeg" alt="Hero Slide 1" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs font-semibold text-[#2C2926]">Hero Slide 1 (Banner.jpeg)</div>
                  <div className="text-[10px] text-[#746A60]">Path: /images/hero-banners/slide-1.jpeg</div>
                </div>

                <div className="rounded-xl overflow-hidden border border-[#DED2C1] bg-[#EFE5D5] space-y-2 p-3">
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-black/5">
                    <img src="/images/hero-banners/slide-2.jpeg" alt="Hero Slide 2" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs font-semibold text-[#2C2926]">Hero Slide 2 (Women's Designer)</div>
                  <div className="text-[10px] text-[#746A60]">Path: /images/hero-banners/slide-2.jpeg</div>
                </div>

                <div className="rounded-xl overflow-hidden border border-[#DED2C1] bg-[#EFE5D5] space-y-2 p-3">
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-black/5">
                    <img src="/images/hero-banners/slide-3.jpeg" alt="Hero Slide 3" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs font-semibold text-[#2C2926]">Hero Slide 3 (Download 6)</div>
                  <div className="text-[10px] text-[#746A60]">Path: /images/hero-banners/slide-3.jpeg</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-[#FCFAF6] rounded-xl border border-[#DED2C1] p-6 shadow-xs space-y-6 animate-fade-in max-w-2xl">
              <div>
                <h3 className="font-serif text-xl text-[#2C2926] font-medium">Boutique Configuration</h3>
                <p className="text-xs text-[#746A60]">Store details and contact numbers</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#746A60] uppercase mb-1">Boutique Name</label>
                  <input
                    type="text"
                    defaultValue="Allura Boutique"
                    className="w-full bg-[#EFE5D5]/50 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs text-[#2C2926]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#746A60] uppercase mb-1">Location / Address</label>
                  <input
                    type="text"
                    defaultValue="Ooty Road, Perinthalmanna, Kerala, India"
                    className="w-full bg-[#EFE5D5]/50 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs text-[#2C2926]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#746A60] uppercase mb-1">WhatsApp Stylist Hotline</label>
                  <input
                    type="text"
                    defaultValue="+91 9037991774"
                    className="w-full bg-[#EFE5D5]/50 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs text-[#2C2926]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#746A60] uppercase mb-1">Free Shipping Order Threshold</label>
                  <input
                    type="text"
                    defaultValue="₹2,999"
                    className="w-full bg-[#EFE5D5]/50 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs text-[#2C2926]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    className="bg-[#8B6335] hover:bg-[#2C2926] text-[#FCFAF6] text-xs font-bold tracking-wider uppercase px-5 py-2.5 rounded-lg shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ADD NEW PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FCFAF6] w-full max-w-lg rounded-2xl border border-[#DED2C1] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#DED2C1]">
              <h3 className="font-serif text-xl font-medium text-[#2C2926]">Add New Boutique Product</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs font-bold text-[#746A60] hover:text-[#2C2926]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#2C2926] mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Zari Embroidered Silk Anarkali"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C2926] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="7999"
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2C2926] mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    placeholder="8999"
                    value={newProduct.originalPrice}
                    onChange={e => setNewProduct({ ...newProduct, originalPrice: e.target.value })}
                    className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C2926] mb-1">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                  >
                    <option value="Ethnic Wear">Ethnic Wear</option>
                    <option value="Modest Wear">Modest Wear</option>
                    <option value="Party Wear">Party Wear</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#2C2926] mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={newProduct.stockCount}
                    onChange={e => setNewProduct({ ...newProduct, stockCount: e.target.value })}
                    className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C2926] mb-1">Image URL / Path</label>
                <input
                  type="text"
                  placeholder="/images/best-sellers/classic-cream-anarkali.jpeg"
                  value={newProduct.image}
                  onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2C2926] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Artisanal modest embroidery with organza dupatta..."
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-[#EFE5D5]/60 border border-[#DED2C1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8B6335]"
                />
              </div>

              <div className="pt-3 border-t border-[#DED2C1] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#746A60] hover:bg-[#EFE5D5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#8B6335] hover:bg-[#2C2926] text-[#FCFAF6] text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-lg shadow-xs transition-colors"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
