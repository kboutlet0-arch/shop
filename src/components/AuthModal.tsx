import { AlertTriangle, Clock, LogOut, Mail, Phone, UserCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  BOUTIQUE_PHONE,
  formatPrice,
  formatShortDate,
  getOrderCancellationInfo,
  getOrderStatusLabel,
} from '../lib/format';
import type { CurrencyCode, Language, Order, UserProfile } from '../types/store';

interface AccountPanelProps {
  user: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  userOrders: Order[];
  currency: CurrencyCode;
  lang: Language;
  onTrackOrder: (orderNumber: string) => void;
  onOrderUpdated: (order: Order) => void;
}

export function AccountPanel({
  user,
  onUserChange,
  userOrders,
  currency,
  lang,
  onTrackOrder,
  onOrderUpdated,
}: AccountPanelProps) {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'social'>('email');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+220 ');
  const [password, setPassword] = useState('');

  // Phone OTP flow
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);

  // Social sign-in prompt
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [orderActionFeedback, setOrderActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? { name, email, phone: phone.replace(/\D/g, '').length >= 7 ? phone : undefined, password }
          : { identifier: email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur d’authentification.');
        return;
      }
      onUserChange(data.user);
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Numéro invalide.');
        return;
      }
      setOtpSent(true);
      setOtpHint(data.verificationHint || null);
      setSuccessMsg(data.message);
    } catch {
      setError('Erreur lors de l’envoi du code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Code incorrect.');
        return;
      }
      onUserChange(data.user);
    } catch {
      setError('Impossible de vérifier le code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: socialEmail.trim() || undefined,
          name: socialName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Échec connexion sociale.');
        return;
      }
      onUserChange(data.user);
    } catch {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onUserChange(null);
  };

  const handleCancelOwnOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    setOrderActionFeedback(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderActionFeedback(data.error || 'Impossible d’annuler la commande.');
        return;
      }
      onOrderUpdated(data.order);
      setConfirmCancelOrderId(null);
      setOrderActionFeedback(
        lang === 'fr'
          ? `Commande ${data.order.orderNumber} annulée et stock rétabli.`
          : `Order ${data.order.orderNumber} cancelled.`
      );
    } catch {
      setOrderActionFeedback('Erreur réseau lors de l’annulation.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Signed-In Customer Profile & Order History
  if (user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5E5E3] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#141413] font-display text-lg font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-[#141413]">{user.name}</h1>
                <span className="text-xs text-[#6B6B68]">
                  · {user.role === 'admin' ? 'Gérant KB-OUTLET' : 'Client vérifié'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#6B6B68]">
                {[user.email, user.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#E5E5E3] bg-white px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F8F8F7]"
            >
              <LogOut className="h-4 w-4" />
              <span>{lang === 'fr' ? 'Déconnexion' : 'Sign out'}</span>
            </button>
          </div>
        </div>

        {/* Order history */}
        <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#141413]">
              {lang === 'fr' ? 'Historique de mes commandes' : 'My Order History'}
            </h2>
            <p className="text-xs text-[#6B6B68]">
              {userOrders.length}{' '}
              {lang === 'fr'
                ? 'commande(s) privée(s) liée(s) à votre compte · Annulation libre sous 2h'
                : 'private order(s) linked to your account · Free cancel within 2h'}
            </p>
          </div>

          {orderActionFeedback && (
            <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] px-4 py-3 text-xs font-medium text-[#141413]">
              {orderActionFeedback}
            </div>
          )}

          {userOrders.length === 0 ? (
            <div className="rounded-xl border border-[#E5E5E3] bg-[#F8F8F7] p-8 text-center text-sm text-[#6B6B68]">
              {lang === 'fr'
                ? 'Vous n’avez pas encore passé de commande avec ce compte.'
                : 'No orders placed with this account yet.'}
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E3]">
              {userOrders.map((order) => {
                const cancelInfo = getOrderCancellationInfo(order, nowMs, lang);
                const isConfirming = confirmCancelOrderId === order.id;

                return (
                  <div key={order.id} className="py-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-semibold text-[#141413]">
                            {order.orderNumber}
                          </p>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              order.status === 'cancelled'
                                ? 'bg-[#DC2626]/10 text-[#DC2626]'
                                : order.status === 'delivered'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-[#F8F8F7] text-[#141413]'
                            }`}
                          >
                            {getOrderStatusLabel(order.status, lang)}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6B68]">
                          {formatShortDate(order.createdAt, lang)} · {order.items.length} article(s)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#141413] mr-1">
                          {formatPrice(order.totalGmd, currency)}
                        </span>

                        {cancelInfo.canCancel && !isConfirming && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelOrderId(order.id)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DC2626] bg-white px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {lang === 'fr'
                                ? `Annuler (${cancelInfo.remainingLabel})`
                                : `Cancel (${cancelInfo.remainingLabel})`}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onTrackOrder(order.orderNumber)}
                          className="min-h-[36px] rounded-lg border border-[#E5E5E3] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413]"
                        >
                          {lang === 'fr' ? 'Suivre' : 'Track'}
                        </button>
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3">
                        <p className="text-xs font-medium text-[#141413]">
                          {lang === 'fr'
                            ? `Confirmer l’annulation de ${order.orderNumber} ?`
                            : `Confirm cancellation for ${order.orderNumber}?`}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={cancellingOrderId === order.id}
                            onClick={() => handleCancelOwnOrder(order.id)}
                            className="min-h-[34px] rounded-lg bg-[#DC2626] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
                          >
                            {cancellingOrderId === order.id
                              ? '...'
                              : lang === 'fr'
                              ? 'Oui, annuler'
                              : 'Yes, cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelOrderId(null)}
                            className="min-h-[34px] rounded-lg border border-[#E5E5E3] bg-white px-3 py-1 text-xs font-medium text-[#141413]"
                          >
                            {lang === 'fr' ? 'Non' : 'No'}
                          </button>
                        </div>
                      </div>
                    )}

                    {cancelInfo.expired && (
                      <div className="flex items-center gap-2 text-[11px] text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {lang === 'fr'
                            ? `Délai de 2h dépassé — pour annuler, contactez la boutique : `
                            : `2h cancel window expired — contact store: `}
                          <a
                            href={`tel:${BOUTIQUE_PHONE.replace(/\s/g, '')}`}
                            className="font-mono font-semibold underline"
                          >
                            {BOUTIQUE_PHONE}
                          </a>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sign In / Create Account View
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/kb_57ec25c5.jpeg"
            alt="KB-OUTLET"
            className="h-10 w-10 rounded-full object-cover border border-[#E5E5E3]"
          />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#141413]">
              {lang === 'fr' ? 'Compte client KB-OUTLET' : 'KB-OUTLET Customer Account'}
            </h1>
            <p className="text-xs text-[#6B6B68]">
              {lang === 'fr'
                ? 'Inscrivez-vous par e-mail, numéro de téléphone (+220) ou réseaux sociaux.'
                : 'Sign up with email, phone number (+220), or social accounts.'}
            </p>
          </div>
        </div>

        {/* Auth method tabs */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F8F8F7] p-1 border border-[#E5E5E3]">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setError(null);
            }}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              authMethod === 'email' ? 'bg-white text-[#141413] shadow-xs' : 'text-[#6B6B68]'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>E-mail</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setError(null);
            }}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              authMethod === 'phone' ? 'bg-white text-[#141413] shadow-xs' : 'text-[#6B6B68]'
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{lang === 'fr' ? 'Téléphone' : 'Phone'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('social');
              setError(null);
            }}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              authMethod === 'social' ? 'bg-white text-[#141413] shadow-xs' : 'text-[#6B6B68]'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>{lang === 'fr' ? 'Réseaux' : 'Social'}</span>
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3 text-xs font-medium text-[#DC2626]">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
            {successMsg}
          </div>
        )}

        {/* Email + Password Auth */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="flex items-center gap-4 border-b border-[#E5E5E3] pb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('register')}
                className={mode === 'register' ? 'text-[#DC2626]' : 'text-[#6B6B68]'}
              >
                {lang === 'fr' ? 'Créer un compte' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={mode === 'login' ? 'text-[#DC2626]' : 'text-[#6B6B68]'}
              >
                {lang === 'fr' ? 'Se connecter' : 'Sign in'}
              </button>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                  {lang === 'fr' ? 'Nom complet' : 'Full name'}
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ousman Bah"
                  className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                {mode === 'register' ? 'E-mail' : 'E-mail ou téléphone'}
              </label>
              <input
                required
                type={mode === 'register' ? 'email' : 'text'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.gm"
                className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                  {lang === 'fr' ? 'Téléphone Gambie (optionnel)' : 'Gambia Phone (optional)'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+220 712 18 58"
                  className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                {lang === 'fr' ? 'Mot de passe' : 'Password'}
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
            >
              {mode === 'register'
                ? lang === 'fr'
                  ? 'Créer mon compte'
                  : 'Create my account'
                : lang === 'fr'
                ? 'Se connecter'
                : 'Sign in'}
            </button>
          </form>
        )}

        {/* Phone OTP Auth */}
        {authMethod === 'phone' && (
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                {lang === 'fr' ? 'Votre nom (si nouveau compte)' : 'Your name (if new account)'}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mariama Touray"
                disabled={otpSent}
                className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none disabled:bg-[#F8F8F7]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                {lang === 'fr' ? 'Numéro de téléphone (+220)' : 'Phone number (+220)'}
              </label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpSent}
                placeholder="+220 712 18 58"
                className="min-h-[42px] w-full rounded-lg border border-[#E5E5E3] px-3 font-mono text-sm focus:border-[#141413] focus:outline-none disabled:bg-[#F8F8F7]"
              />
            </div>

            {otpSent && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#141413]">
                  {lang === 'fr' ? 'Code de vérification à 6 chiffres' : '6-digit verification code'}
                </label>
                <input
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="min-h-[42px] w-full rounded-lg border border-[#141413] px-3 font-mono text-base tracking-widest focus:outline-none"
                />
                {otpHint && (
                  <p className="text-xs text-[#6B6B68]">
                    {lang === 'fr' ? 'Code SMS reçu :' : 'SMS code:'}{' '}
                    <button
                      type="button"
                      onClick={() => setOtpCode(otpHint)}
                      className="font-mono font-semibold text-[#DC2626] underline"
                    >
                      {otpHint}
                    </button>
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {otpSent && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setSuccessMsg(null);
                  }}
                  className="min-h-[44px] rounded-lg border border-[#E5E5E3] px-4 text-xs font-medium text-[#141413]"
                >
                  {lang === 'fr' ? 'Modifier' : 'Edit'}
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 min-h-[44px] rounded-lg bg-[#141413] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors"
              >
                {otpSent
                  ? lang === 'fr'
                    ? 'Valider le code & connecter'
                    : 'Verify code & sign in'
                  : lang === 'fr'
                  ? 'Recevoir le code SMS'
                  : 'Send verification code'}
              </button>
            </div>
          </form>
        )}

        {/* Social Auth */}
        {authMethod === 'social' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                  {lang === 'fr' ? 'Nom affiché' : 'Display name'}
                </label>
                <input
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  placeholder="Fatou Njie"
                  className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B6B68] mb-1">
                  {lang === 'fr' ? 'E-mail du profil social' : 'Social profile email'}
                </label>
                <input
                  type="email"
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  placeholder="fatou.njie@gmail.com"
                  className="min-h-[40px] w-full rounded-lg border border-[#E5E5E3] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialLogin('google')}
                className="min-h-[44px] rounded-lg border border-[#E5E5E3] bg-white px-4 py-2.5 text-sm font-semibold text-[#141413] hover:bg-[#F8F8F7]"
              >
                Google
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialLogin('facebook')}
                className="min-h-[44px] rounded-lg border border-[#E5E5E3] bg-white px-4 py-2.5 text-sm font-semibold text-[#141413] hover:bg-[#F8F8F7]"
              >
                Facebook
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialLogin('apple')}
                className="min-h-[44px] rounded-lg bg-[#141413] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#27272A]"
              >
                Apple
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
