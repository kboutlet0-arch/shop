import { CheckCircle2, CreditCard, Lock, Mail, Minus, Plus, Smartphone, Trash2, Truck, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  formatPrice,
  FREE_DELIVERY_THRESHOLD_GMD,
  GAMBIA_DELIVERY_ZONES,
  getPaymentLabel,
} from '../lib/format';
import type { CurrencyCode, Language, Order, PaymentMethod, Product, UserProfile } from '../types/store';
import { ProductIllustration } from './ProductIllustration';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  currency: CurrencyCode;
  lang: Language;
  user: UserProfile | null;
  onOrderComplete: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
  onGoToAccount: () => void;
}

export function CartCheckoutDrawer({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  currency,
  lang,
  user,
  onOrderComplete,
  onTrackOrder,
  onGoToAccount,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+220 ');
  const [deliveryZone, setDeliveryZone] = useState<string>(
    user?.defaultZone || GAMBIA_DELIVERY_ZONES[0].name
  );
  const [deliveryAddress, setDeliveryAddress] = useState(user?.defaultAddress || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');
  const [walletPhone, setWalletPhone] = useState(user?.phone || '+220 ');
  const [cardLast4, setCardLast4] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerEmail && user.email) setCustomerEmail(user.email);
      if ((!customerPhone || customerPhone === '+220 ') && user.phone) {
        setCustomerPhone(user.phone);
        setWalletPhone(user.phone);
      }
      if (!deliveryAddress && user.defaultAddress) setDeliveryAddress(user.defaultAddress);
      if (user.defaultZone) setDeliveryZone(user.defaultZone);
    }
  }, [user]);

  if (!open) return null;

  const subtotalGmd = items.reduce((sum, item) => sum + item.product.priceGmd * item.quantity, 0);
  const zoneObj = GAMBIA_DELIVERY_ZONES.find((z) => z.name === deliveryZone) || GAMBIA_DELIVERY_ZONES[0];
  const deliveryFeeGmd =
    zoneObj.id === 'pickup' || subtotalGmd >= FREE_DELIVERY_THRESHOLD_GMD ? 0 : zoneObj.feeGmd;
  const totalGmd = subtotalGmd + deliveryFeeGmd;

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (paymentMethod === 'card' && cardLast4.replace(/\D/g, '').length < 12) {
      setError(
        lang === 'fr'
          ? 'Veuillez saisir un numéro de carte valide (16 chiffres).'
          : 'Please enter a valid 16-digit card number.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          deliveryZone,
          deliveryAddress,
          paymentMethod,
          walletPhone,
          currency,
          deliveryFeeGmd,
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors du paiement.');
        return;
      }

      setCompletedOrder(data.order);
      onOrderComplete(data.order);
      onClearCart();
      setStep('success');
    } catch {
      setError(
        lang === 'fr'
          ? 'Impossible de contacter le serveur de paiement.'
          : 'Unable to reach payment gateway.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('cart');
    setError(null);
    onClose();
  };

  const paymentOptions: { id: PaymentMethod; title: string; subtitle: string }[] = [
    {
      id: 'wave',
      title: 'Wave Gambie',
      subtitle: lang === 'fr' ? 'Confirmation mobile instantanée (0% frais)' : 'Instant mobile push (0% fee)',
    },
    {
      id: 'qmoney',
      title: 'QMoney (QCell)',
      subtitle: lang === 'fr' ? 'Portefeuille mobile QCell Gambie' : 'QCell Gambia mobile wallet',
    },
    {
      id: 'afrimoney',
      title: 'AfriMoney (Africell)',
      subtitle: lang === 'fr' ? 'Paiement mobile Africell Gambie' : 'Africell Gambia mobile money',
    },
    {
      id: 'card',
      title: 'Visa / Mastercard',
      subtitle: lang === 'fr' ? 'Trust Bank · Ecobank · Carte internationale' : 'Trust Bank · Ecobank · Global cards',
    },
    {
      id: 'cod',
      title: lang === 'fr' ? 'Paiement à la livraison' : 'Cash on Delivery',
      subtitle: lang === 'fr' ? 'Réglez en Dalasi (GMD) à la réception' : 'Pay cash in GMD upon delivery',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-lg flex-col bg-white border-l border-[#E5E5E3] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E3] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#141413]">
              {step === 'cart'
                ? lang === 'fr'
                  ? 'Votre panier'
                  : 'Your Bag'
                : step === 'checkout'
                ? lang === 'fr'
                  ? 'Paiement sécurisé Gambie'
                  : 'Secure Gambia Checkout'
                : lang === 'fr'
                ? 'Commande confirmée'
                : 'Order Confirmed'}
            </h2>
            <p className="text-xs text-[#6B6B68]">
              {step === 'cart' &&
                `${items.reduce((s, i) => s + i.quantity, 0)} ${lang === 'fr' ? 'article(s)' : 'item(s)'}`}
              {step === 'checkout' &&
                (lang === 'fr' ? 'Transaction chiffrée · GMD & multi-devises' : 'Encrypted transaction · GMD')}
              {step === 'success' && completedOrder?.orderNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Fermer le panier"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E3] text-[#141413] hover:bg-[#F8F8F7]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 'cart' && (
            <>
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-16">
                  <p className="font-display text-lg font-semibold text-[#141413]">
                    {lang === 'fr' ? 'Votre panier est vide' : 'Your bag is empty'}
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-[#6B6B68]">
                    {lang === 'fr'
                      ? 'Ajoutez des produits depuis la boutique KB-OUTLET pour commander.'
                      : 'Add products from the KB-OUTLET storefront to get started.'}
                  </p>
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="mt-5 min-h-[40px] rounded-lg bg-[#141413] px-5 py-2 text-xs font-semibold text-white"
                  >
                    {lang === 'fr' ? 'Voir les produits' : 'Browse catalog'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Free delivery threshold indicator */}
                  <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-3.5 text-xs text-[#141413]">
                    {subtotalGmd >= FREE_DELIVERY_THRESHOLD_GMD ? (
                      <span className="font-medium text-emerald-700">
                        {lang === 'fr'
                          ? 'Livraison gratuite débloquée dans le Grand Banjul / Kombo.'
                          : 'Free delivery unlocked across Greater Banjul.'}
                      </span>
                    ) : (
                      <span>
                        {lang === 'fr' ? 'Plus que ' : 'Add '}
                        <span className="font-mono font-semibold tabular-nums">
                          {formatPrice(FREE_DELIVERY_THRESHOLD_GMD - subtotalGmd, currency)}
                        </span>
                        {lang === 'fr' ? ' pour la livraison gratuite.' : ' more for free delivery.'}
                      </span>
                    )}
                  </div>

                  {items.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex gap-4 rounded-xl border border-[#E5E5E3] bg-white p-3"
                    >
                      <ProductIllustration
                        preset={product.visualPreset}
                        imageUrl={product.imageUrl}
                        alt={product.name}
                        className="h-20 w-24 shrink-0 rounded-lg"
                      />
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#141413]">
                              {lang === 'fr' ? product.name : product.nameEn}
                            </p>
                            <p className="font-mono text-xs tabular-nums text-[#6B6B68]">
                              {formatPrice(product.priceGmd, currency)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            aria-label="Retirer"
                            className="text-[#6B6B68] hover:text-[#DC2626] p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-[#E5E5E3]">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity - 1)}
                              className="inline-flex h-8 w-8 items-center justify-center hover:bg-[#F8F8F7]"
                              aria-label="Diminuer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center font-mono text-xs font-medium tabular-nums">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQty(product.id, Math.min(product.stock, quantity + 1))
                              }
                              className="inline-flex h-8 w-8 items-center justify-center hover:bg-[#F8F8F7]"
                              aria-label="Augmenter"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span className="font-mono text-sm font-semibold tabular-nums text-[#141413]">
                            {formatPrice(product.priceGmd * quantity, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="kb-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-5">
              {!user && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] px-3.5 py-2.5 text-xs text-[#6B6B68]">
                  <span>
                    {lang === 'fr'
                      ? 'Connectez-vous pour suivre et annuler (sous 2h) depuis votre compte.'
                      : 'Sign in to track and cancel (within 2h) in your account.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      resetAndClose();
                      onGoToAccount();
                    }}
                    className="font-semibold text-[#DC2626] underline whitespace-nowrap"
                  >
                    {lang === 'fr' ? 'Me connecter' : 'Sign in'}
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3 text-xs font-medium text-[#DC2626]">
                  {error}
                </div>
              )}

              {/* Step 1: Customer & Delivery in The Gambia */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#141413]">
                  1. {lang === 'fr' ? 'Coordonnées & livraison (Gambie)' : 'Delivery Details (The Gambia)'}
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                      {lang === 'fr' ? 'Nom complet' : 'Full name'}
                    </label>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Aminata Jallow"
                      className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                      {lang === 'fr' ? 'Téléphone (+220)' : 'Phone (+220)'}
                    </label>
                    <input
                      required
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+220 712 18 58"
                      className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm focus:border-[#141413] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    {lang === 'fr' ? 'E-mail (pour reçu et suivi automatique)' : 'Email (for receipt & auto updates)'}
                  </label>
                  <input
                    required
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@exemple.gm"
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    {lang === 'fr' ? 'Zone de livraison' : 'Delivery Zone'}
                  </label>
                  <select
                    value={deliveryZone}
                    onChange={(e) => setDeliveryZone(e.target.value)}
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm focus:border-[#141413] focus:outline-none"
                  >
                    {GAMBIA_DELIVERY_ZONES.map((z) => (
                      <option key={z.id} value={z.name}>
                        {z.name} · {z.feeGmd === 0 ? 'Gratuit' : `${z.feeGmd} D`} ({z.eta})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                    {lang === 'fr' ? 'Adresse / Repère précis' : 'Street / Landmark'}
                  </label>
                  <input
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Kairaba Avenue, près de Westfield..."
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 2: Gambian Payment Gateway */}
              <div className="space-y-3 border-t border-[#E5E5E3] pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#141413]">
                    2. {lang === 'fr' ? 'Passerelle de paiement sécurisée' : 'Secure Payment Gateway'}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs text-[#6B6B68]">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    TLS
                  </span>
                </div>

                <div className="space-y-2">
                  {paymentOptions.map((opt) => {
                    const selected = paymentMethod === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                          selected
                            ? 'border-[#141413] bg-[#F8F8F7]'
                            : 'border-[#E5E5E3] bg-white hover:border-[#141413]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selected}
                            onChange={() => setPaymentMethod(opt.id)}
                            className="h-4 w-4 accent-[#DC2626]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#141413]">{opt.title}</p>
                            <p className="text-xs text-[#6B6B68]">{opt.subtitle}</p>
                          </div>
                        </div>
                        {opt.id === 'card' ? (
                          <CreditCard className="h-4 w-4 text-[#6B6B68]" />
                        ) : opt.id === 'cod' ? (
                          <Truck className="h-4 w-4 text-[#6B6B68]" />
                        ) : (
                          <Smartphone className="h-4 w-4 text-[#DC2626]" />
                        )}
                      </label>
                    );
                  })}
                </div>

                {['wave', 'qmoney', 'afrimoney'].includes(paymentMethod) && (
                  <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-3.5">
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      {lang === 'fr'
                        ? `Numéro ${getPaymentLabel(paymentMethod, 'fr')} (+220)`
                        : `${getPaymentLabel(paymentMethod, 'en')} Phone (+220)`}
                    </label>
                    <input
                      required
                      type="tel"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder="+220 712 18 58"
                      className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] bg-white px-3 font-mono text-sm focus:border-[#141413] focus:outline-none"
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-3.5 space-y-2">
                    <label className="block text-xs font-medium text-[#141413]">
                      {lang === 'fr' ? 'Numéro de carte bancaire' : 'Card number'}
                    </label>
                    <input
                      required
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="4532 •••• •••• 8891"
                      className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] bg-white px-3 font-mono text-sm focus:border-[#141413] focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </form>
          )}

          {step === 'success' && completedOrder && (
            <div className="space-y-5 py-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-display text-base font-bold text-[#141413]">
                      {lang === 'fr' ? 'Commande confirmée !' : 'Order confirmed!'}
                    </p>
                    <p className="font-mono text-xs text-emerald-800 tabular-nums">
                      {completedOrder.orderNumber} · {completedOrder.paymentReference}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E5E3] bg-white p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B6B68]">{lang === 'fr' ? 'Client' : 'Customer'}</span>
                  <span className="font-medium text-[#141413]">{completedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B68]">{lang === 'fr' ? 'Paiement' : 'Payment'}</span>
                  <span className="font-medium text-[#141413]">
                    {getPaymentLabel(completedOrder.paymentMethod, lang)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B68]">{lang === 'fr' ? 'Total réglé' : 'Total'}</span>
                  <span className="font-mono font-semibold tabular-nums text-[#DC2626]">
                    {formatPrice(completedOrder.totalGmd, 'GMD')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-4 text-xs text-[#6B6B68]">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#141413]" />
                <p>
                  {lang === 'fr'
                    ? `Reçu envoyé à ${completedOrder.customerEmail}. Annulation possible sous 2 heures depuis votre compte client.`
                    : `Receipt sent to ${completedOrder.customerEmail}. Free cancellation available within 2 hours in your account.`}
                </p>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    const num = completedOrder.orderNumber;
                    resetAndClose();
                    onTrackOrder(num);
                  }}
                  className="w-full min-h-[44px] rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C]"
                >
                  {lang === 'fr' ? 'Suivre ma commande en temps réel' : 'Track my order live'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onGoToAccount();
                  }}
                  className="w-full min-h-[44px] rounded-lg bg-[#141413] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626]"
                >
                  {lang === 'fr' ? 'Se connecter pour suivre ma commande' : 'Sign in to track order'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer totals & action */}
        {step !== 'success' && items.length > 0 && (
          <div className="border-t border-[#E5E5E3] bg-[#F8F8F7] px-5 py-4 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-[#6B6B68]">
                <span>{lang === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
                <span className="font-mono tabular-nums">{formatPrice(subtotalGmd, currency)}</span>
              </div>
              {step === 'checkout' && (
                <div className="flex justify-between text-[#6B6B68]">
                  <span>{lang === 'fr' ? 'Livraison' : 'Delivery'}</span>
                  <span className="font-mono tabular-nums">
                    {deliveryFeeGmd === 0 ? 'Gratuit' : formatPrice(deliveryFeeGmd, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E5E5E3] pt-2 text-base font-bold text-[#141413]">
                <span>Total</span>
                <div className="text-right">
                  <span className="font-mono tabular-nums">
                    {formatPrice(step === 'cart' ? subtotalGmd : totalGmd, currency)}
                  </span>
                  {currency !== 'GMD' && (
                    <span className="block font-mono text-xs font-normal tabular-nums text-[#6B6B68]">
                      ≈ {formatPrice(step === 'cart' ? subtotalGmd : totalGmd, 'GMD')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full min-h-[44px] rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C]"
              >
                {lang === 'fr' ? 'Passer la commande' : 'Proceed to Checkout'}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="min-h-[44px] rounded-lg border border-[#E5E5E3] bg-white px-4 py-2.5 text-sm font-medium text-[#141413]"
                >
                  {lang === 'fr' ? 'Retour' : 'Back'}
                </button>
                <button
                  type="submit"
                  form="kb-checkout-form"
                  disabled={submitting}
                  className="flex-1 min-h-[44px] rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60"
                >
                  {submitting
                    ? lang === 'fr'
                      ? 'Validation en cours...'
                      : 'Processing...'
                    : lang === 'fr'
                    ? `Payer ${formatPrice(totalGmd, 'GMD')}`
                    : `Pay ${formatPrice(totalGmd, 'GMD')}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
