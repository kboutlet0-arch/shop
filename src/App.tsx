import { useCallback, useEffect, useState } from 'react';
import { AccountPanel } from './components/AuthModal';
import { CartCheckoutDrawer, type CartItem } from './components/CartCheckoutDrawer';
import { Dashboard } from './components/Dashboard';
import { Navbar, type ActiveTab } from './components/Navbar';
import { OrderTracker } from './components/OrderTracker';
import { Storefront } from './components/Storefront';
import type {
  CurrencyCode,
  EmailLog,
  Language,
  Order,
  Product,
  ProductCategory,
  SalesStats,
  UserProfile,
} from './types/store';

function isAdminPath(): boolean {
  if (typeof window === 'undefined') return false;
  const clean = window.location.pathname.replace(/\/+$/, '');
  return clean === '/admin' || clean.startsWith('/admin/');
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(isAdminPath);
  const [activeTab, setActiveTab] = useState<ActiveTab>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<SalesStats | null>(null);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [currency, setCurrency] = useState<CurrencyCode>('GMD');
  const [lang, setLang] = useState<Language>('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string | undefined>(undefined);
  const [liveUpdatedOrder, setLiveUpdatedOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((current) => (current === msg ? null : current));
    }, 3000);
  }, []);

  useEffect(() => {
    const onPop = () => setIsAdminRoute(isAdminPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigateToStore = useCallback(() => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    setActiveTab('store');
  }, []);

  const fetchUserOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore if unauthenticated
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    try {
      const [ordersRes, analyticsRes, emailsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/analytics'),
        fetch('/api/emails'),
      ]);
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.orders || []);
      }
      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        setAnalytics(d.analytics || null);
      }
      if (emailsRes.ok) {
        const d = await emailsRes.json();
        setEmails(d.emails || []);
      }
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        const [prodRes, meRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/auth/me'),
        ]);
        if (prodRes.ok && mounted) {
          const pData = await prodRes.json();
          setProducts(pData.products || []);
        }
        if (meRes.ok && mounted) {
          const mData = await meRes.json();
          setUser(mData.user || null);
          if (mData.user?.role === 'admin') {
            await refreshAdminData();
          } else if (mData.user) {
            await fetchUserOrders();
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, [fetchUserOrders, refreshAdminData]);

  // Real-Time SSE Subscription
  useEffect(() => {
    const es = new EventSource('/api/stream');

    es.addEventListener('products_updated', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { products: Product[] };
        setProducts(data.products);
      } catch {
        // ignore
      }
    });

    es.addEventListener('order_created', (ev) => {
      try {
        const order = JSON.parse((ev as MessageEvent).data) as Order;
        setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      } catch {
        // ignore
      }
    });

    es.addEventListener('order_updated', (ev) => {
      try {
        const order = JSON.parse((ev as MessageEvent).data) as Order;
        setLiveUpdatedOrder(order);
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      } catch {
        // ignore
      }
    });

    es.addEventListener('analytics_updated', (ev) => {
      try {
        const stats = JSON.parse((ev as MessageEvent).data) as SalesStats;
        setAnalytics(stats);
      } catch {
        // ignore
      }
    });

    es.addEventListener('email_sent', (ev) => {
      try {
        const mail = JSON.parse((ev as MessageEvent).data) as EmailLog;
        setEmails((prev) => [mail, ...prev.filter((m) => m.id !== mail.id)]);
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
    };
  }, [user?.id, user?.role]);

  const handleUserChange = async (nextUser: UserProfile | null) => {
    setUser(nextUser);
    if (!nextUser) {
      setOrders([]);
      setAnalytics(null);
      setEmails([]);
      return;
    }
    if (nextUser.role === 'admin') {
      await refreshAdminData();
    } else {
      await fetchUserOrders();
    }
  };

  const handleAddToCart = (product: Product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { product, quantity: Math.min(product.stock, qty) }];
    });
    showToast(
      lang === 'fr' ? `${product.name} ajouté au panier` : `${product.nameEn} added to bag`
    );
  };

  const handleUpdateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  };

  const handleTrackOrder = (orderNumber: string) => {
    setTrackedOrderNumber(orderNumber);
    setActiveTab('track');
  };

  const handleOrderUpdated = useCallback((updatedOrder: Order) => {
    setLiveUpdatedOrder(updatedOrder);
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    showToast(
      lang === 'fr'
        ? `Commande ${updatedOrder.orderNumber} mise à jour`
        : `Order ${updatedOrder.orderNumber} updated`
    );
  }, [lang, showToast]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isAdminRoute) {
    return (
      <Dashboard
        user={user}
        onUserChange={handleUserChange}
        products={products}
        orders={orders}
        analytics={analytics}
        emails={emails}
        currency={currency}
        lang={lang}
        onRefreshAdminData={refreshAdminData}
        onGoToStore={navigateToStore}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F7] text-[#141413]">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        user={user}
        lang={lang}
        onChangeLang={setLang}
        currency={currency}
        onChangeCurrency={setCurrency}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className="flex-1">
        {loading ? (
          <div className="mx-auto max-w-7xl px-3 py-8 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-64 animate-pulse rounded-xl border border-[#E5E5E3] bg-white"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'store' && (
              <Storefront
                products={products}
                currency={currency}
                lang={lang}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onResetFilters={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                onAddToCart={handleAddToCart}
                onGoToTrack={() => setActiveTab('track')}
              />
            )}

            {activeTab === 'track' && (
              <OrderTracker
                user={user}
                initialOrderNumber={trackedOrderNumber}
                liveUpdatedOrder={liveUpdatedOrder}
                userOrders={orders}
                currency={currency}
                lang={lang}
                onGoToAccount={() => setActiveTab('account')}
                onOrderUpdated={handleOrderUpdated}
              />
            )}

            {activeTab === 'account' && (
              <AccountPanel
                user={user}
                onUserChange={handleUserChange}
                userOrders={orders}
                currency={currency}
                lang={lang}
                onTrackOrder={handleTrackOrder}
                onOrderUpdated={handleOrderUpdated}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-[#E5E5E3] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-6 text-xs text-[#6B6B68] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/kb_57ec25c5.jpeg"
              alt="KB-OUTLET"
              className="h-7 w-7 rounded-full object-cover border border-[#E5E5E3]"
            />
            <span>
              KB-OUTLET Gambie · Serrekunda &amp; Banjul ·{' '}
              <span className="font-mono">+220 712 18 58</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>Wave · QMoney · AfriMoney · Visa / Mastercard</span>
            <span>© {new Date().getFullYear()} KB-OUTLET</span>
          </div>
        </div>
      </footer>

      <CartCheckoutDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={(id) => setCart((prev) => prev.filter((i) => i.product.id !== id))}
        onClearCart={() => setCart([])}
        currency={currency}
        lang={lang}
        user={user}
        onOrderComplete={(order) => {
          if (user) {
            setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
          }
          setTrackedOrderNumber(order.orderNumber);
        }}
        onTrackOrder={handleTrackOrder}
        onGoToAccount={() => setActiveTab('account')}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#141413] px-4 py-3 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
