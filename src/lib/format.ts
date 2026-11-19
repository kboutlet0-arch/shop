import type {
  CurrencyCode,
  Language,
  Order,
  OrderStatus,
  PaymentMethod,
  ProductCategory,
} from '../types/store';

export const ORDER_CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;
export const BOUTIQUE_PHONE = '+220 712 18 58';
export const BOUTIQUE_EMAIL = 'bambabus27@gmail.com';

// Exchange rates anchored to Gambian Dalasi (GMD)
export const CURRENCY_RATES: Record<CurrencyCode, { rate: number; symbol: string; label: string }> = {
  GMD: { rate: 1, symbol: 'D', label: 'Dalasi (GMD)' },
  XOF: { rate: 8.65, symbol: 'CFA', label: 'Franc CFA (XOF)' },
  USD: { rate: 0.0142, symbol: '$', label: 'Dollar (USD)' },
  EUR: { rate: 0.0132, symbol: '€', label: 'Euro (EUR)' },
};

export function formatPrice(amountGmd: number, currency: CurrencyCode = 'GMD'): string {
  const cfg = CURRENCY_RATES[currency];
  const converted = amountGmd * cfg.rate;

  if (currency === 'GMD') {
    return `${Math.round(converted).toLocaleString('fr-FR')} D`;
  }
  if (currency === 'XOF') {
    return `${Math.round(converted).toLocaleString('fr-FR')} CFA`;
  }
  if (currency === 'USD') {
    return `$${converted.toFixed(2)}`;
  }
  return `${converted.toFixed(2)} €`;
}

export const GAMBIA_DELIVERY_ZONES = [
  { id: 'serrekunda', name: 'Serrekunda / Kanifing', feeGmd: 150, eta: '2 – 4h' },
  { id: 'kololi', name: 'Kololi / Senegambia / Bijilo', feeGmd: 200, eta: '2 – 5h' },
  { id: 'brusubi', name: 'Brusubi / Brufut / Sukuta', feeGmd: 250, eta: '3 – 6h' },
  { id: 'banjul', name: 'Banjul / Bakau / Fajara', feeGmd: 175, eta: '2 – 4h' },
  { id: 'brikama', name: 'Brikama / West Coast', feeGmd: 350, eta: '24h' },
  { id: 'pickup', name: 'Retrait en boutique (KB-OUTLET)', feeGmd: 0, eta: 'Prêt en 1h' },
] as const;

export const FREE_DELIVERY_THRESHOLD_GMD = 12000;

export function getCategoryLabel(category: ProductCategory, lang: Language = 'fr'): string {
  const labels: Record<ProductCategory, { fr: string; en: string }> = {
    audio: { fr: 'Audio & Son', en: 'Audio' },
    wearables: { fr: 'Montres & Tech', en: 'Watches & Tech' },
    streetwear: { fr: 'Mode Urbaine', en: 'Streetwear' },
    footwear: { fr: 'Chaussures', en: 'Footwear' },
    accessories: { fr: 'Accessoires', en: 'Accessories' },
  };
  return labels[category][lang];
}

export function getPaymentLabel(method: PaymentMethod, lang: Language = 'fr'): string {
  const labels: Record<PaymentMethod, { fr: string; en: string }> = {
    wave: { fr: 'Wave Gambie', en: 'Wave Gambia' },
    qmoney: { fr: 'QMoney (QCell)', en: 'QMoney (QCell)' },
    afrimoney: { fr: 'AfriMoney (Africell)', en: 'AfriMoney (Africell)' },
    card: { fr: 'Carte Visa / Mastercard', en: 'Visa / Mastercard' },
    cod: { fr: 'Paiement à la livraison', en: 'Cash on Delivery' },
  };
  return labels[method][lang];
}

export function getOrderStatusLabel(status: OrderStatus, lang: Language = 'fr'): string {
  const labels: Record<OrderStatus, { fr: string; en: string }> = {
    confirmed: { fr: 'Confirmée', en: 'Confirmed' },
    preparing: { fr: 'En préparation', en: 'Preparing' },
    shipping: { fr: 'En livraison', en: 'Out for Delivery' },
    delivered: { fr: 'Livrée', en: 'Delivered' },
    cancelled: { fr: 'Annulée', en: 'Cancelled' },
  };
  return labels[status][lang];
}

export function normalizeGambiaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('220')) return `+${digits}`;
  if (digits.length === 7) return `+220${digits}`;
  return raw.trim();
}

export function formatShortDate(iso: string, lang: Language = 'fr'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function getOrderCancellationInfo(order: Order, nowMs: number, lang: Language = 'fr') {
  if (order.status === 'cancelled' || order.status === 'delivered') {
    return {
      canCancel: false,
      expired: false,
      remainingMs: 0,
      remainingLabel: '',
    };
  }

  const createdMs = new Date(order.createdAt).getTime();
  const deadlineMs = createdMs + ORDER_CANCEL_WINDOW_MS;
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const canCancel = remainingMs > 0;
  const expired = remainingMs <= 0;

  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const remainingLabel =
    hours > 0
      ? lang === 'fr'
        ? `${hours}h ${String(minutes).padStart(2, '0')}min`
        : `${hours}h ${String(minutes).padStart(2, '0')}m`
      : lang === 'fr'
      ? `${totalMinutes} min`
      : `${totalMinutes} min`;

  return {
    canCancel,
    expired,
    remainingMs,
    remainingLabel,
  };
}
