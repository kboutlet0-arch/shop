import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Box,
  Edit3,
  Eye,
  LogOut,
  Mail,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  formatPrice,
  formatShortDate,
  getCategoryLabel,
  getOrderStatusLabel,
  getPaymentLabel,
} from '../lib/format';
import type {
  CurrencyCode,
  EmailLog,
  Language,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  SalesStats,
  UserProfile,
  VisualPreset,
} from '../types/store';
import { ProductIllustration } from './ProductIllustration';

interface DashboardProps {
  user: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  products: Product[];
  orders: Order[];
  analytics: SalesStats | null;
  emails: EmailLog[];
  currency: CurrencyCode;
  lang: Language;
  onRefreshAdminData: () => Promise<void>;
  onGoToStore: () => void;
}

type DashTab = 'analytics' | 'inventory' | 'orders' | 'emails';

export function Dashboard({
  user,
  onUserChange,
  products,
  orders,
  analytics,
  emails,
  currency,
  lang,
  onRefreshAdminData,
  onGoToStore,
}: DashboardProps) {
  const [dashTab, setDashTab] = useState<DashTab>('analytics');
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // Add / Edit Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('accessories');
  const [formPriceGmd, setFormPriceGmd] = useState('2500');
  const [formStock, setFormStock] = useState('10');
  const [formThreshold, setFormThreshold] = useState('5');
  const [formPreset, setFormPreset] = useState<VisualPreset>('headphones');
  const [formDesc, setFormDesc] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Email HTML preview modal
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);

  // Admin Login / Register state
  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'register'>('login');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && p.stock > 0 && p.stock <= p.lowStockThreshold) ||
        (stockFilter === 'out' && p.stock === 0);
      return matchSearch && matchStock;
    });
  }, [products, stockSearch, stockFilter]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Identifiants administrateur incorrects.');
        return;
      }
      onUserChange(data.user);
      await onRefreshAdminData();
    } catch {
      setAuthError('Erreur de connexion au serveur.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          adminCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Impossible de créer le compte administrateur.');
        return;
      }
      onUserChange(data.user);
      await onRefreshAdminData();
    } catch {
      setAuthError('Erreur de connexion au serveur.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onUserChange(null);
  };

  // Dedicated Admin Gate on /admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex flex-col justify-center px-4 py-10">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onGoToStore}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B6B68] hover:text-[#141413]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{lang === 'fr' ? 'Retour à la boutique' : 'Back to Store'}</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#E5E5E3] bg-white p-7 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/kb_57ec25c5.jpeg"
                alt="KB-OUTLET Admin"
                className="h-11 w-11 rounded-full object-cover border border-[#E5E5E3]"
              />
              <div>
                <h1 className="font-display text-xl font-bold text-[#141413]">
                  KB-OUTLET Admin
                </h1>
                <p className="text-xs text-[#6B6B68]">
                  {lang === 'fr'
                    ? 'Accès sécurisé au tableau de bord et à la gestion du stock.'
                    : 'Secure access to analytics and inventory console.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-1">
              <button
                type="button"
                onClick={() => {
                  setAdminAuthMode('login');
                  setAuthError(null);
                }}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                  adminAuthMode === 'login' ? 'bg-white text-[#141413] shadow-xs' : 'text-[#6B6B68]'
                }`}
              >
                {lang === 'fr' ? 'Connexion Admin' : 'Admin Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminAuthMode('register');
                  setAuthError(null);
                }}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                  adminAuthMode === 'register' ? 'bg-white text-[#141413] shadow-xs' : 'text-[#6B6B68]'
                }`}
              >
                {lang === 'fr' ? 'Créer compte Admin' : 'Create Admin'}
              </button>
            </div>

            {user && user.role !== 'admin' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {lang === 'fr'
                  ? `Vous êtes actuellement connecté en tant que client (${user.email || user.phone}). Connectez-vous avec un compte administrateur pour continuer.`
                  : `Signed in as customer (${user.email || user.phone}). Please sign in with an admin account.`}
              </div>
            )}

            {authError && (
              <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3 text-xs font-medium text-[#DC2626]">
                {authError}
              </div>
            )}

            {adminAuthMode === 'login' ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    E-mail administrateur
                  </label>
                  <input
                    required
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="bambabus27@gmail.com"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    Mot de passe
                  </label>
                  <input
                    required
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#141413] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {authBusy
                      ? lang === 'fr'
                        ? 'Vérification...'
                        : 'Verifying...'
                      : lang === 'fr'
                      ? 'Se connecter à l’administration'
                      : 'Sign in to Admin'}
                  </span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    Nom complet
                  </label>
                  <input
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Gérant KB-OUTLET"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    E-mail administrateur
                  </label>
                  <input
                    required
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@kb-outlet.gm"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    Mot de passe (6 caractères min.)
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    Code d’autorisation propriétaire
                  </label>
                  <input
                    required
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="KB-ADMIN-2026"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] transition-colors disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {authBusy
                      ? lang === 'fr'
                        ? 'Création...'
                        : 'Creating...'
                      : lang === 'fr'
                      ? 'Créer le compte administrateur'
                      : 'Create Admin Account'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductError(null);
    setFormName('');
    setFormSku(`KB-NEW-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategory('accessories');
    setFormPriceGmd('3500');
    setFormStock('15');
    setFormThreshold('5');
    setFormPreset('headphones');
    setFormDesc('');
    setFormImageUrl('');
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductError(null);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategory(p.category);
    setFormPriceGmd(String(p.priceGmd));
    setFormStock(String(p.stock));
    setFormThreshold(String(p.lowStockThreshold));
    setFormPreset(p.visualPreset);
    setFormDesc(p.description);
    setFormImageUrl(p.imageUrl || '');
    setProductModalOpen(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;

      // Compress/resize large photos via canvas so persistence & storefront rendering stay snappy
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setFormImageUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setFormImageUrl(dataUrl);
        }
      };
      img.onerror = () => {
        setFormImageUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setProductError(null);

    if (!editingProduct && !formImageUrl.trim()) {
      setProductError(
        lang === 'fr'
          ? 'Veuillez importer une photo du produit (ou coller une URL d’image) avant d’enregistrer.'
          : 'Please upload a product image (or provide an image URL) before saving.'
      );
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        name: formName,
        nameEn: formName,
        sku: formSku,
        category: formCategory,
        priceGmd: Number(formPriceGmd),
        stock: Number(formStock),
        lowStockThreshold: Number(formThreshold),
        visualPreset: formPreset,
        description: formDesc,
        descriptionEn: formDesc,
        imageUrl: formImageUrl.trim() || undefined,
      };
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setProductError(data.error || 'Erreur lors de l’enregistrement du produit.');
        return;
      }
      setProductModalOpen(false);
      await onRefreshAdminData();
    } catch {
      setProductError('Impossible de joindre le serveur.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: nextStock }),
    });
  };

  const handleDeleteProduct = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await onRefreshAdminData();
  };

  const maxDailyRev = analytics
    ? Math.max(1000, ...analytics.dailySeries.map((d) => d.revenueGmd))
    : 1000;

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      {/* Dedicated Admin Header Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E5E5E3] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/kb_57ec25c5.jpeg"
              alt="KB-OUTLET Admin"
              className="h-9 w-9 rounded-full object-cover border border-[#E5E5E3]"
            />
            <div>
              <span className="font-display text-base font-bold text-[#141413]">
                KB-OUTLET Admin
              </span>
              <span className="hidden sm:inline text-xs text-[#6B6B68] ml-2">
                · {user.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGoToStore}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E5E5E3] bg-white px-3.5 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F8F8F7]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{lang === 'fr' ? 'Boutique' : 'Storefront'}</span>
            </button>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#141413] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#DC2626] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{lang === 'fr' ? 'Déconnexion' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* Header + Sub-nav */}
        <div className="flex flex-col gap-4 border-b border-[#E5E5E3] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium text-[#6B6B68]">
              KB-OUTLET Gambie · Administration
            </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#141413]">
            {lang === 'fr' ? 'Tableau de bord analytique & stock' : 'Analytics & Inventory Console'}
          </h1>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#E5E5E3] bg-white p-1">
          {[
            { id: 'analytics' as DashTab, label: lang === 'fr' ? 'Statistiques' : 'Analytics', icon: BarChart3 },
            { id: 'inventory' as DashTab, label: lang === 'fr' ? 'Stock' : 'Inventory', icon: Box },
            { id: 'orders' as DashTab, label: `${lang === 'fr' ? 'Commandes' : 'Orders'} (${orders.length})`, icon: Truck },
            { id: 'emails' as DashTab, label: `E-mails (${emails.length})`, icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = dashTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDashTab(tab.id)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'bg-[#141413] text-white' : 'text-[#6B6B68] hover:text-[#141413]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time KPI Strip */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E5E5E3] bg-white p-5">
            <p className="text-xs text-[#6B6B68]">
              {lang === 'fr' ? 'Chiffre d’affaires total' : 'Total Revenue'}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#141413]">
              {formatPrice(analytics.totalRevenueGmd, currency)}
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-[#6B6B68]">
              {analytics.totalOrders} {lang === 'fr' ? 'commandes validées' : 'orders'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E3] bg-white p-5">
            <p className="text-xs text-[#6B6B68]">
              {lang === 'fr' ? 'Ventes du jour' : 'Today Revenue'}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#DC2626]">
              {formatPrice(analytics.todayRevenueGmd, currency)}
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-[#6B6B68]">
              {analytics.todayOrders} {lang === 'fr' ? 'commande(s) aujourd’hui' : 'today'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E3] bg-white p-5">
            <p className="text-xs text-[#6B6B68]">
              {lang === 'fr' ? 'Panier moyen' : 'Average Order'}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#141413]">
              {formatPrice(analytics.averageOrderGmd, currency)}
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-[#6B6B68]">
              {analytics.activeOrdersCount} {lang === 'fr' ? 'en cours de livraison' : 'in fulfillment'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E3] bg-white p-5">
            <p className="text-xs text-[#6B6B68]">
              {lang === 'fr' ? 'Santé du stock' : 'Stock Health'}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#141413]">
              {analytics.lowStockCount + analytics.outOfStockCount}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {analytics.lowStockCount} {lang === 'fr' ? 'faible(s)' : 'low'} · {analytics.outOfStockCount}{' '}
              {lang === 'fr' ? 'rupture(s)' : 'out'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: Real-Time Analytics */}
      {dashTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 7-Day Revenue SVG Chart */}
          <div className="lg:col-span-8 rounded-2xl border border-[#E5E5E3] bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-[#141413]">
                  {lang === 'fr' ? 'Recettes des 7 derniers jours (GMD)' : 'Last 7 Days Revenue (GMD)'}
                </h2>
                <p className="text-xs text-[#6B6B68]">
                  {lang === 'fr'
                    ? 'Actualisation instantanée à chaque nouvelle commande'
                    : 'Updates live on every new checkout'}
                </p>
              </div>
              {hoveredDayIndex !== null && analytics.dailySeries[hoveredDayIndex] && (
                <div className="text-right font-mono text-xs tabular-nums">
                  <span className="font-semibold text-[#141413]">
                    {formatPrice(analytics.dailySeries[hoveredDayIndex].revenueGmd, currency)}
                  </span>
                  <span className="ml-2 text-[#6B6B68]">
                    ({analytics.dailySeries[hoveredDayIndex].ordersCount} cmd)
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-7 gap-3 items-end h-52 pt-6 border-t border-[#E5E5E3]">
              {analytics.dailySeries.map((day, idx) => {
                const heightPct = Math.max(8, Math.round((day.revenueGmd / maxDailyRev) * 100));
                const isToday = idx === analytics.dailySeries.length - 1;
                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    className="flex h-full flex-col items-center justify-end gap-2 group"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-[#6B6B68] opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.revenueGmd > 0 ? `${Math.round(day.revenueGmd / 1000)}k` : '0'}
                    </span>
                    <div className="w-full max-w-[44px] flex-1 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-md transition-colors duration-150 ${
                          isToday
                            ? 'bg-[#DC2626]'
                            : 'bg-[#141413]/85 group-hover:bg-[#141413]'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#6B6B68] truncate max-w-full">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gambian Payment Gateways Breakdown */}
          <div className="lg:col-span-4 rounded-2xl border border-[#E5E5E3] bg-white p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#141413]">
              {lang === 'fr' ? 'Passerelles de paiement' : 'Payment Gateways'}
            </h2>
            <div className="space-y-3.5">
              {analytics.paymentBreakdown.map((gw) => {
                const pct =
                  analytics.totalRevenueGmd > 0
                    ? Math.round((gw.revenueGmd / analytics.totalRevenueGmd) * 100)
                    : 0;
                return (
                  <div key={gw.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#141413]">
                        {gw.label} ({gw.count})
                      </span>
                      <span className="font-mono tabular-nums text-[#6B6B68]">
                        {formatPrice(gw.revenueGmd, currency)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F2F1EE]">
                      <div
                        className="h-full rounded-full bg-[#141413]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="lg:col-span-12 rounded-2xl border border-[#E5E5E3] bg-white p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#141413]">
              {lang === 'fr' ? 'Produits les plus vendus' : 'Top Selling Products'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E3] text-xs text-[#6B6B68]">
                    <th className="py-2.5 font-medium">{lang === 'fr' ? 'Produit' : 'Product'}</th>
                    <th className="py-2.5 font-medium text-right">{lang === 'fr' ? 'Unités' : 'Units'}</th>
                    <th className="py-2.5 font-medium text-right">{lang === 'fr' ? 'Recettes' : 'Revenue'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E3]">
                  {analytics.topProducts.map((tp) => (
                    <tr key={tp.productId} className="hover:bg-[#F8F8F7]">
                      <td className="py-3 font-medium text-[#141413]">{tp.name}</td>
                      <td className="py-3 text-right font-mono tabular-nums text-[#6B6B68]">
                        {tp.unitsSold}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold tabular-nums text-[#141413]">
                        {formatPrice(tp.revenueGmd, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Intuitive Stock Management */}
      {dashTab === 'inventory' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B68]" />
                <input
                  type="search"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder={lang === 'fr' ? 'Filtrer SKU ou nom...' : 'Filter SKU or name...'}
                  className="min-h-[40px] w-56 rounded-lg border border-[#E5E5E3] bg-white pl-9 pr-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>

              <div className="flex items-center rounded-lg border border-[#E5E5E3] bg-white p-0.5 text-xs">
                {[
                  { id: 'all' as const, label: lang === 'fr' ? 'Tous' : 'All' },
                  { id: 'low' as const, label: lang === 'fr' ? 'Stock faible' : 'Low' },
                  { id: 'out' as const, label: lang === 'fr' ? 'Rupture' : 'Out' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStockFilter(f.id)}
                    className={`rounded-md px-3 py-1.5 font-medium ${
                      stockFilter === f.id ? 'bg-[#141413] text-white' : 'text-[#6B6B68]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateProduct}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C]"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'fr' ? 'Nouveau produit' : 'Add Product'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E5E5E3] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#F8F8F7] text-xs text-[#6B6B68]">
                  <th className="px-4 py-3 font-medium">{lang === 'fr' ? 'Article' : 'Item'}</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium text-right">{lang === 'fr' ? 'Prix' : 'Price'}</th>
                  <th className="px-4 py-3 font-medium text-center">{lang === 'fr' ? 'Stock rapide' : 'Quick Stock'}</th>
                  <th className="px-4 py-3 font-medium text-right">{lang === 'fr' ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3]">
                {filteredProducts.map((product) => {
                  const isOut = product.stock === 0;
                  const isLow = product.stock > 0 && product.stock <= product.lowStockThreshold;
                  return (
                    <tr key={product.id} className="hover:bg-[#F8F8F7]/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductIllustration
                            preset={product.visualPreset}
                            imageUrl={product.imageUrl}
                            alt={product.name}
                            className="h-11 w-14 shrink-0 rounded-lg border border-[#E5E5E3]"
                          />
                          <div>
                            <p className="font-semibold text-[#141413]">{product.name}</p>
                            <p className="text-xs text-[#6B6B68]">
                              {getCategoryLabel(product.category, lang)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#6B6B68]">{product.sku}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#141413]">
                        {formatPrice(product.priceGmd, currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickStockAdjust(product, -1)}
                            disabled={product.stock === 0}
                            aria-label="Retirer 1 du stock"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E3] bg-white hover:bg-[#F8F8F7] disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={`w-10 text-center font-mono text-sm font-semibold tabular-nums ${
                              isOut ? 'text-[#DC2626]' : isLow ? 'text-amber-700' : 'text-[#141413]'
                            }`}
                          >
                            {product.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStockAdjust(product, 1)}
                            aria-label="Ajouter 1 au stock"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E3] bg-white hover:bg-[#F8F8F7]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          {isLow && (
                            <AlertTriangle
                              className="h-4 w-4 text-amber-600"
                              aria-label="Stock faible"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditProduct(product)}
                            aria-label="Modifier"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E3] bg-white text-[#141413] hover:bg-[#F8F8F7]"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            aria-label="Supprimer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E3] bg-white text-[#6B6B68] hover:text-[#DC2626]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Live Orders Queue */}
      {dashTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setOrderFilter(status)}
                  className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    orderFilter === status
                      ? 'bg-[#141413] text-white'
                      : 'border border-[#E5E5E3] bg-white text-[#6B6B68] hover:text-[#141413]'
                  }`}
                >
                  {status === 'all' ? (lang === 'fr' ? 'Toutes' : 'All') : getOrderStatusLabel(status, lang)}
                </button>
              )
            )}
          </div>

          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E3] bg-white p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B68]">
                    <span className="font-mono font-semibold text-[#141413]">
                      {order.orderNumber}
                    </span>
                    <span>·</span>
                    <span>{formatShortDate(order.createdAt, lang)}</span>
                    <span>·</span>
                    <span>{getPaymentLabel(order.paymentMethod, lang)}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#141413]">
                    {order.customerName} ({order.customerPhone}) — {order.deliveryZone}
                  </p>
                  <p className="text-xs text-[#6B6B68]">
                    {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-base font-bold tabular-nums text-[#141413]">
                    {formatPrice(order.totalGmd, currency)}
                  </span>

                  <select
                    aria-label="Statut de commande"
                    value={order.status}
                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                    className="min-h-[38px] rounded-lg border border-[#E5E5E3] bg-[#F8F8F7] px-3 text-xs font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                  >
                    <option value="confirmed">Confirmée</option>
                    <option value="preparing">En préparation</option>
                    <option value="shipping">En livraison</option>
                    <option value="delivered">Livrée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Automatic Email Outbox */}
      {dashTab === 'emails' && (
        <div className="rounded-2xl border border-[#E5E5E3] bg-white divide-y divide-[#E5E5E3]">
          {emails.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6B6B68]">
              {lang === 'fr' ? 'Aucun e-mail envoyé pour le moment.' : 'No emails dispatched yet.'}
            </div>
          ) : (
            emails.map((mail) => (
              <div
                key={mail.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6 hover:bg-[#F8F8F7]/60"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B68]">
                    <span className="font-medium text-[#141413]">{mail.to}</span>
                    <span>·</span>
                    <span className="font-mono">{formatShortDate(mail.sentAt, lang)}</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-medium">
                      {mail.status === 'sent_smtp' ? 'SMTP envoyé' : 'Notifié (Outbox)'}
                    </span>
                  </div>
                  <p className="truncate text-sm font-semibold text-[#141413]">{mail.subject}</p>
                  <p className="truncate text-xs text-[#6B6B68]">{mail.previewText}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewEmail(mail)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E5E5E3] bg-white px-3 text-xs font-medium text-[#141413] hover:border-[#141413]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{lang === 'fr' ? 'Aperçu' : 'Preview'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E5E3] bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#141413]">
                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E3]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              {productError && (
                <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 px-3.5 py-2.5 text-xs font-medium text-[#DC2626]">
                  {productError}
                </div>
              )}

              {/* Mandatory Product Image Upload + Live Preview */}
              <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#141413]">
                    Image du produit {!editingProduct && <span className="text-[#DC2626]">*</span>}
                  </label>
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="text-xs font-medium text-[#DC2626] hover:underline"
                    >
                      Retirer l’image
                    </button>
                  )}
                </div>

                {formImageUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-[#E5E5E3] bg-white">
                    <img
                      src={formImageUrl}
                      alt="Aperçu du produit"
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full max-h-48 object-cover"
                    />
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#6B6B68]/40 bg-white px-4 py-6 text-center hover:border-[#141413] transition-colors">
                    <Upload className="h-5 w-5 text-[#6B6B68]" />
                    <span className="mt-2 text-xs font-semibold text-[#141413]">
                      Importer une photo du produit
                    </span>
                    <span className="mt-0.5 text-[11px] text-[#6B6B68]">
                      JPG, PNG ou WebP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#E5E5E3] bg-white px-3 text-xs font-medium text-[#141413] hover:bg-[#F8F8F7]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{formImageUrl ? 'Changer la photo' : 'Choisir un fichier'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="url"
                    value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                    onChange={(e) => {
                      setFormImageUrl(e.target.value);
                      setProductError(null);
                    }}
                    placeholder="Ou coller l’URL d’une image..."
                    className="min-h-[38px] w-full rounded-lg border border-[#E5E5E3] bg-white px-3 text-xs focus:border-[#141413] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B6B68] mb-1">Nom du produit</label>
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">SKU</label>
                  <input
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">Catégorie</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm"
                  >
                    <option value="audio">Audio &amp; Son</option>
                    <option value="wearables">Montres &amp; Tech</option>
                    <option value="streetwear">Mode Urbaine</option>
                    <option value="footwear">Chaussures</option>
                    <option value="accessories">Accessoires</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">Prix (GMD)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={formPriceGmd}
                    onChange={(e) => setFormPriceGmd(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">Stock</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">Seuil alerte</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B6B68] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E3] p-3 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="min-h-[40px] rounded-lg border border-[#E5E5E3] px-4 text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="min-h-[40px] rounded-lg bg-[#DC2626] px-5 text-xs font-semibold text-white"
                >
                  {savingProduct ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email HTML Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E5E5E3] bg-white overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-[#141413]">{previewEmail.subject}</p>
                <p className="text-xs text-[#6B6B68]">À : {previewEmail.to}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E3]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="max-h-[70vh] overflow-y-auto bg-[#F8F8F7] p-4"
              dangerouslySetInnerHTML={{ __html: previewEmail.htmlBody }}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
