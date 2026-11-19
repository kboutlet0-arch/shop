import {
  AlertTriangle,
  Check,
  Clock,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  BOUTIQUE_EMAIL,
  BOUTIQUE_PHONE,
  formatPrice,
  formatShortDate,
  getOrderCancellationInfo,
  getOrderStatusLabel,
  getPaymentLabel,
} from '../lib/format';
import type { CurrencyCode, Language, Order, OrderStatus, UserProfile } from '../types/store';
import { ProductIllustration } from './ProductIllustration';

interface OrderTrackerProps {
  user: UserProfile | null;
  initialOrderNumber?: string;
  liveUpdatedOrder?: Order | null;
  userOrders: Order[];
  currency: CurrencyCode;
  lang: Language;
  onGoToAccount: () => void;
  onOrderUpdated: (order: Order) => void;
}

const STAGES: { key: OrderStatus; titleFr: string; titleEn: string }[] = [
  { key: 'confirmed', titleFr: 'Confirmée', titleEn: 'Confirmed' },
  { key: 'preparing', titleFr: 'En préparation', titleEn: 'Preparing' },
  { key: 'shipping', titleFr: 'En livraison', titleEn: 'Out for Delivery' },
  { key: 'delivered', titleFr: 'Livrée', titleEn: 'Delivered' },
];

export function OrderTracker({
  user,
  initialOrderNumber,
  liveUpdatedOrder,
  userOrders,
  currency,
  lang,
  onGoToAccount,
  onOrderUpdated,
}: OrderTrackerProps) {
  const [query, setQuery] = useState(initialOrderNumber || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2-hour cancellation state
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrder = async (orderNumber: string) => {
    const clean = orderNumber.trim().toUpperCase();
    if (!clean || !user) return;
    setLoading(true);
    setError(null);
    setCancelMsg(null);
    setConfirmCancelOpen(false);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setError(data.error || 'Commande introuvable.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Erreur de connexion au suivi temps réel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setOrder(null);
      setQuery('');
      setError(null);
      return;
    }
    if (initialOrderNumber) {
      setQuery(initialOrderNumber);
      fetchOrder(initialOrderNumber);
    } else if (userOrders.length > 0) {
      setQuery(userOrders[0].orderNumber);
      setOrder(userOrders[0]);
      setError(null);
    } else {
      setOrder(null);
    }
  }, [user?.id, initialOrderNumber]);

  // Keep selected order synced if userOrders updates
  useEffect(() => {
    if (!user) return;
    if (!order && !initialOrderNumber && userOrders.length > 0) {
      setQuery(userOrders[0].orderNumber);
      setOrder(userOrders[0]);
    } else if (order) {
      const fresh = userOrders.find((o) => o.id === order.id);
      if (fresh) setOrder(fresh);
    }
  }, [userOrders]);

  // Apply live SSE updates automatically if the currently tracked order changes
  useEffect(() => {
    if (liveUpdatedOrder && order && liveUpdatedOrder.id === order.id) {
      setOrder(liveUpdatedOrder);
    }
  }, [liveUpdatedOrder, order?.id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchOrder(query);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    setError(null);
    setCancelMsg(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible d’annuler cette commande.');
        return;
      }
      setOrder(data.order);
      onOrderUpdated(data.order);
      setConfirmCancelOpen(false);
      setCancelReason('');
      setCancelMsg(
        lang === 'fr'
          ? 'Commande annulée avec succès. Un e-mail de confirmation vous a été envoyé.'
          : 'Order cancelled successfully. A confirmation email has been sent.'
      );
    } catch {
      setError('Erreur réseau lors de l’annulation.');
    } finally {
      setCancelling(false);
    }
  };

  // Strict privacy gate: customer must sign into their own account to track orders
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#141413] text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#141413]">
            {lang === 'fr' ? 'Suivi réservé à votre compte' : 'Account Required for Tracking'}
          </h1>
          <p className="mx-auto max-w-md text-sm text-[#6B6B68]">
            {lang === 'fr'
              ? 'Pour protéger votre confidentialité, chaque client ne peut consulter, suivre et annuler que ses propres commandes depuis son compte.'
              : 'For your privacy, each customer can only view, track, and cancel their own orders from their account.'}
          </p>
          <button
            type="button"
            onClick={onGoToAccount}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#DC2626] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] transition-colors"
          >
            {lang === 'fr' ? 'Me connecter à mon compte' : 'Sign in to my account'}
          </button>
        </div>
      </div>
    );
  }

  const currentStageIndex = order ? STAGES.findIndex((s) => s.key === order.status) : -1;
  const cancelInfo = order ? getOrderCancellationInfo(order, nowMs, lang) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
      {/* Search Header scoped strictly to this customer's account */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium text-[#6B6B68]">
              {user.name} · {lang === 'fr' ? 'Mes commandes personnelles' : 'My Private Orders'}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
              {lang === 'fr' ? 'Suivi de mes commandes' : 'Track My Orders'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B68]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="KB-2026-..."
                className="min-h-[44px] w-full rounded-lg border border-[#E5E5E3] pl-9 pr-3 font-mono text-sm uppercase focus:border-[#141413] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] rounded-lg bg-[#141413] px-5 text-sm font-semibold text-white whitespace-nowrap shrink-0 hover:bg-[#DC2626] transition-colors"
            >
              {lang === 'fr' ? 'Consulter' : 'View'}
            </button>
          </form>
        </div>

        {/* Own Orders Quick Switcher */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6B6B68]">
          <span>{lang === 'fr' ? 'Vos commandes :' : 'Your orders:'}</span>
          {userOrders.length === 0 ? (
            <span className="text-[#6B6B68]">
              {lang === 'fr'
                ? 'Aucune commande enregistrée sur ce compte.'
                : 'No orders placed on this account yet.'}
            </span>
          ) : (
            userOrders.map((uo) => (
              <button
                key={uo.id}
                type="button"
                onClick={() => {
                  setQuery(uo.orderNumber);
                  setOrder(uo);
                  setError(null);
                  setCancelMsg(null);
                  setConfirmCancelOpen(false);
                }}
                className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                  order?.id === uo.id
                    ? 'bg-[#141413] text-white'
                    : 'border border-[#E5E5E3] bg-[#F8F8F7] text-[#141413] hover:border-[#141413]'
                }`}
              >
                {uo.orderNumber}
              </button>
            ))
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#DC2626]/30 bg-white p-5 text-sm font-medium text-[#DC2626]">
          {error}
        </div>
      )}

      {cancelMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {cancelMsg}
        </div>
      )}

      {order && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 8 cols: Live Timeline & 2-Hour Cancellation */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E3] pb-5">
                <div>
                  <p className="font-mono text-xs text-[#6B6B68]">
                    {order.orderNumber} · {formatShortDate(order.createdAt, lang)}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#141413]">
                    {getOrderStatusLabel(order.status, lang)}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6B6B68]">
                    {getPaymentLabel(order.paymentMethod, lang)}
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-[#141413]">
                    {formatPrice(order.totalGmd, currency)}
                  </p>
                </div>
              </div>

              {/* 4-Stage Progress Bar */}
              {order.status === 'cancelled' ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-4 text-sm font-medium text-[#DC2626]">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    {lang === 'fr'
                      ? 'Cette commande a été annulée et les articles ont été réintégrés en stock.'
                      : 'This order was cancelled and inventory has been restored.'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {STAGES.map((stage, idx) => {
                    const reached = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    return (
                      <div key={stage.key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                              reached
                                ? isCurrent
                                  ? 'border-[#DC2626] bg-[#DC2626] text-white'
                                  : 'border-[#141413] bg-[#141413] text-white'
                                : 'border-[#E5E5E3] bg-[#F8F8F7] text-[#6B6B68]'
                            }`}
                          >
                            {reached ? <Check className="h-4 w-4" /> : idx + 1}
                          </div>
                          <div
                            className={`hidden sm:block h-0.5 flex-1 ${
                              idx < currentStageIndex ? 'bg-[#141413]' : 'bg-[#E5E5E3]'
                            }`}
                          />
                        </div>
                        <p
                          className={`text-xs font-semibold ${
                            reached ? 'text-[#141413]' : 'text-[#6B6B68]'
                          }`}
                        >
                          {lang === 'fr' ? stage.titleFr : stage.titleEn}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2-Hour Customer Self-Cancellation Section */}
              {cancelInfo && order.status !== 'cancelled' && order.status !== 'delivered' && (
                <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-4 space-y-3">
                  {cancelInfo.canCancel ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-[#141413]">
                            {lang === 'fr'
                              ? 'Annulation directe disponible (délai de 2 heures)'
                              : 'Direct cancellation available (2-hour window)'}
                          </p>
                          <p className="font-mono text-xs text-[#DC2626]">
                            {lang === 'fr'
                              ? `Temps restant : ${cancelInfo.remainingLabel}`
                              : `Time remaining: ${cancelInfo.remainingLabel}`}
                          </p>
                        </div>

                        {!confirmCancelOpen && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelOpen(true)}
                            className="min-h-[38px] rounded-lg border border-[#DC2626] bg-white px-4 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors"
                          >
                            {lang === 'fr' ? 'Annuler ma commande' : 'Cancel my order'}
                          </button>
                        )}
                      </div>

                      {confirmCancelOpen && (
                        <div className="border-t border-[#E5E5E3] pt-3 space-y-3">
                          <input
                            type="text"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder={
                              lang === 'fr'
                                ? 'Motif d’annulation (optionnel)...'
                                : 'Cancellation reason (optional)...'
                            }
                            className="min-h-[38px] w-full rounded-lg border border-[#E5E5E3] bg-white px-3 text-xs focus:border-[#141413] focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={cancelling}
                              onClick={handleCancelOrder}
                              className="min-h-[38px] rounded-lg bg-[#DC2626] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
                            >
                              {cancelling
                                ? lang === 'fr'
                                  ? 'Annulation...'
                                  : 'Cancelling...'
                                : lang === 'fr'
                                ? 'Confirmer l’annulation'
                                : 'Confirm cancellation'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmCancelOpen(false);
                                setCancelReason('');
                              }}
                              className="min-h-[38px] rounded-lg border border-[#E5E5E3] bg-white px-4 py-1.5 text-xs font-medium text-[#141413]"
                            >
                              {lang === 'fr' ? 'Garder la commande' : 'Keep order'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold text-[#141413]">
                          {lang === 'fr'
                            ? 'Délai d’annulation de 2 heures dépassé'
                            : '2-hour cancellation window expired'}
                        </p>
                        <p className="text-[#6B6B68]">
                          {lang === 'fr'
                            ? 'Pour annuler ou modifier cette commande, veuillez contacter directement la boutique KB-OUTLET :'
                            : 'To cancel or modify this order, please contact KB-OUTLET directly:'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-0.5 font-mono font-semibold text-[#141413]">
                          <a href={`tel:${BOUTIQUE_PHONE.replace(/\s/g, '')}`} className="underline hover:text-[#DC2626]">
                            {BOUTIQUE_PHONE}
                          </a>
                          <span>·</span>
                          <a href={`mailto:${BOUTIQUE_EMAIL}`} className="underline hover:text-[#DC2626]">
                            {BOUTIQUE_EMAIL}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Event Feed */}
              <div className="border-t border-[#E5E5E3] pt-5 space-y-4">
                <h3 className="text-xs font-semibold text-[#6B6B68]">
                  {lang === 'fr' ? 'Historique en direct' : 'Live Timeline'}
                </h3>
                <ol className="space-y-4">
                  {[...order.timeline].reverse().map((ev, i) => (
                    <li key={`${ev.timestamp}-${i}`} className="flex items-start gap-3">
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E5E5E3] bg-[#F8F8F7]">
                        {ev.status === 'shipping' ? (
                          <Truck className="h-3.5 w-3.5 text-[#DC2626]" />
                        ) : ev.status === 'delivered' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                        ) : ev.status === 'cancelled' ? (
                          <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-[#141413]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-[#141413]">{ev.label}</span>
                          <span className="font-mono text-xs tabular-nums text-[#6B6B68]">
                            {formatShortDate(ev.timestamp, lang)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-[#6B6B68]">{ev.note}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Itemized Order Breakdown */}
            <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#141413]">
                <Package className="h-4 w-4" />
                <span>{lang === 'fr' ? 'Articles commandés' : 'Ordered Items'}</span>
              </div>
              <div className="divide-y divide-[#E5E5E3]">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProductIllustration
                        preset={item.visualPreset}
                        imageUrl={item.imageUrl}
                        alt={item.name}
                        className="h-12 w-14 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#141413]">{item.name}</p>
                        <p className="font-mono text-xs tabular-nums text-[#6B6B68]">
                          {item.sku} · × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-[#141413]">
                      {formatPrice(item.unitPriceGmd * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 4 cols: Delivery, Email Notification & Support */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#141413]">
                {lang === 'fr' ? 'Livraison & Destinataire' : 'Delivery & Recipient'}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <div>
                    <p className="font-medium text-[#141413]">{order.deliveryZone}</p>
                    <p className="text-xs text-[#6B6B68]">{order.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#141413]" />
                  <div>
                    <p className="font-medium text-[#141413]">{order.customerName}</p>
                    <p className="font-mono text-xs text-[#6B6B68]">{order.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#141413]" />
                  <div>
                    <p className="font-medium text-[#141413]">
                      {lang === 'fr' ? 'Notifications e-mail actives' : 'Automatic email alerts'}
                    </p>
                    <p className="break-all text-xs text-[#6B6B68]">{order.customerEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E5E3] bg-[#141413] p-5 text-white space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/kb_57ec25c5.jpeg"
                  alt="KB-OUTLET"
                  className="h-10 w-10 rounded-full object-cover border border-white/20"
                />
                <div>
                  <p className="text-sm font-semibold">Boutique KB-OUTLET</p>
                  <p className="font-mono text-xs text-white/75">{BOUTIQUE_PHONE}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-white/70">
                {lang === 'fr'
                  ? 'Annulation libre sous 2 heures. Passé ce délai, contactez notre boutique par téléphone ou e-mail.'
                  : 'Free cancellation within 2 hours. After 2 hours, please reach our store by phone or email.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
