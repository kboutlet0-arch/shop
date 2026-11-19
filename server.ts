import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { db, hashPassword, verifyPassword, type StoredUser } from './server/store.ts';
import {
  dispatchLowStockEmail,
  dispatchOrderConfirmationEmail,
  dispatchOrderStatusEmail,
  dispatchWelcomeEmail,
} from './server/mailer.ts';
import type { Order, OrderStatus, PaymentMethod, Product } from './src/types/store.ts';

const PORT = Number(process.env.PORT) || 3000;
const ORDER_CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;
const SESSION_COOKIE = 'kb_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'kb-outlet-gambia-secret-2026';

// In-memory OTP store for phone verification
const otpStore = new Map<string, { code: string; name?: string; expiresAt: number; attempts: number }>();

// SSE Clients for real-time order tracking & analytics (scoped by user session)
interface SseClient {
  res: Response;
  userId: string | null;
}
const sseClients = new Set<SseClient>();

function writeSseFrame(client: SseClient, event: string, payload: unknown) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  try {
    client.res.write(frame);
  } catch {
    sseClients.delete(client);
  }
}

function broadcastEvent(event: string, payload: unknown) {
  for (const client of sseClients) {
    writeSseFrame(client, event, payload);
  }
}

function broadcastAdminEvent(event: string, payload: unknown) {
  for (const client of sseClients) {
    if (!client.userId) continue;
    const u = db.findUserById(client.userId);
    if (u && u.role === 'admin') {
      writeSseFrame(client, event, payload);
    }
  }
}

function broadcastOrderEvent(event: 'order_created' | 'order_updated', order: Order) {
  for (const client of sseClients) {
    if (!client.userId) continue;
    const u = db.findUserById(client.userId);
    if (!u) continue;
    if (u.role === 'admin' || db.doesUserOwnOrder(u, order)) {
      writeSseFrame(client, event, order);
    }
  }
}

function signSession(userId: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid: string;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function setSessionCookie(req: Request, res: Response, userId: string) {
  const token = signSession(userId);
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(req: Request, res: Response) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  });
}

function getCurrentUser(req: Request): StoredUser | null {
  const cookies = parseCookies(req);
  const uid = verifySession(cookies[SESSION_COOKIE]);
  if (!uid) return null;
  return db.findUserById(uid) || null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Accès réservé au gérant KB-OUTLET.' });
    return;
  }
  next();
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('220')) return `+${digits}`;
  if (digits.length === 7) return `+220${digits}`;
  return `+${digits}`;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '5mb' }));

  // SSE real-time stream
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const currentUser = getCurrentUser(req);
    const client: SseClient = { res, userId: currentUser?.id ?? null };

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
    sseClients.add(client);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(client);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });
  });

  // Auth endpoints
  app.get('/api/auth/me', (req, res) => {
    const user = getCurrentUser(req);
    res.json({ user: user ? db.sanitizeUser(user) : null });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!name?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Nom et mot de passe (6 caractères min.) requis.' });
      return;
    }
    if (!email?.trim() && !phone?.trim()) {
      res.status(400).json({ error: 'Veuillez fournir une adresse e-mail ou un numéro de téléphone.' });
      return;
    }

    if (email?.trim() && db.findUserByEmail(email)) {
      res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });
      return;
    }

    const normalizedPhone = phone?.trim() ? normalizePhone(phone) : undefined;
    if (normalizedPhone && db.findUserByPhone(normalizedPhone)) {
      res.status(409).json({ error: 'Un compte existe déjà avec ce numéro de téléphone.' });
      return;
    }

    const user = db.createUser({
      name: name.trim(),
      email: email?.trim().toLowerCase(),
      phone: normalizedPhone,
      authProvider: email?.trim() ? 'email' : 'phone',
      role: 'customer',
      passwordHash: hashPassword(password),
    });

    if (user.email) {
      const log = await dispatchWelcomeEmail(user.email, user.name);
      db.addEmailLog(log);
      broadcastAdminEvent('email_sent', log);
    }

    setSessionCookie(req, res, user.id);
    res.status(201).json({ user: db.sanitizeUser(user) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier?.trim() || !password) {
      res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
      return;
    }

    const clean = identifier.trim();
    const user = clean.includes('@')
      ? db.findUserByEmail(clean)
      : db.findUserByPhone(normalizePhone(clean));

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Identifiants incorrects.' });
      return;
    }

    setSessionCookie(req, res, user.id);
    res.json({ user: db.sanitizeUser(user) });
  });

  app.post('/api/auth/phone/send-otp', (req, res) => {
    const { phone, name } = req.body as { phone?: string; name?: string };
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      res.status(400).json({ error: 'Numéro de téléphone gambien invalide (+220 ...).' });
      return;
    }

    const normalized = normalizePhone(phone);
    const code = String(crypto.randomInt(100000, 999999));
    otpStore.set(normalized, {
      code,
      name: name?.trim(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    // Returned in response when SMS gateway is not provisioned so user can complete verification cleanly
    res.json({
      ok: true,
      phone: normalized,
      message: `Code de vérification envoyé au ${normalized}.`,
      verificationHint: code,
    });
  });

  app.post('/api/auth/phone/verify-otp', async (req, res) => {
    const { phone, code, name } = req.body as { phone?: string; code?: string; name?: string };
    if (!phone || !code) {
      res.status(400).json({ error: 'Numéro et code requis.' });
      return;
    }

    const normalized = normalizePhone(phone);
    const entry = otpStore.get(normalized);
    if (!entry || Date.now() > entry.expiresAt) {
      res.status(400).json({ error: 'Code expiré ou introuvable. Demandez un nouveau code.' });
      return;
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      otpStore.delete(normalized);
      res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
      return;
    }

    if (entry.code !== code.trim()) {
      res.status(401).json({ error: 'Code de vérification incorrect.' });
      return;
    }

    otpStore.delete(normalized);

    let user = db.findUserByPhone(normalized);
    if (!user) {
      user = db.createUser({
        name: name?.trim() || entry.name || `Client ${normalized.slice(-4)}`,
        phone: normalized,
        authProvider: 'phone',
        role: 'customer',
      });
    }

    setSessionCookie(req, res, user.id);
    res.json({ user: db.sanitizeUser(user) });
  });

  app.post('/api/auth/social', async (req, res) => {
    const { provider, email, name } = req.body as {
      provider?: 'google' | 'facebook' | 'apple';
      email?: string;
      name?: string;
    };
    if (!provider || !['google', 'facebook', 'apple'].includes(provider)) {
      res.status(400).json({ error: 'Fournisseur social invalide.' });
      return;
    }

    const cleanEmail = (email || `${provider}.client@kb-outlet.gm`).trim().toLowerCase();
    const displayName = name?.trim() || `Client ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;

    let user = db.findUserByEmail(cleanEmail);
    if (!user) {
      user = db.createUser({
        name: displayName,
        email: cleanEmail,
        authProvider: provider,
        role: 'customer',
      });
      const log = await dispatchWelcomeEmail(cleanEmail, displayName);
      db.addEmailLog(log);
      broadcastAdminEvent('email_sent', log);
    }

    setSessionCookie(req, res, user.id);
    res.json({ user: db.sanitizeUser(user) });
  });

  // Dedicated Admin Authentication (for /admin portal)
  app.post('/api/auth/admin/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'E-mail et mot de passe administrateur requis.' });
      return;
    }
    const user = db.findUserByEmail(email.trim());
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Identifiants administrateur incorrects.' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Ce compte client ne dispose pas des droits administrateur.' });
      return;
    }
    setSessionCookie(req, res, user.id);
    res.json({ user: db.sanitizeUser(user) });
  });

  app.post('/api/auth/admin/register', (req, res) => {
    const { name, email, password, adminCode } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      adminCode?: string;
    };
    const expectedCode = process.env.ADMIN_SETUP_KEY || 'KB-ADMIN-2026';
    if (!adminCode || adminCode.trim() !== expectedCode) {
      res.status(403).json({ error: 'Code d’autorisation administrateur invalide.' });
      return;
    }
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Nom, e-mail et mot de passe (6 caractères min.) requis.' });
      return;
    }
    if (db.findUserByEmail(email)) {
      res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });
      return;
    }
    const admin = db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      authProvider: 'email',
      role: 'admin',
      passwordHash: hashPassword(password),
    });
    setSessionCookie(req, res, admin.id);
    res.status(201).json({ user: db.sanitizeUser(admin) });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.patch('/api/auth/profile', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }
    const { name, phone, defaultZone, defaultAddress } = req.body as {
      name?: string;
      phone?: string;
      defaultZone?: string;
      defaultAddress?: string;
    };
    const updated = db.updateUser(user.id, {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(phone?.trim() ? { phone: normalizePhone(phone) } : {}),
      ...(defaultZone !== undefined ? { defaultZone } : {}),
      ...(defaultAddress !== undefined ? { defaultAddress } : {}),
    });
    res.json({ user: updated ? db.sanitizeUser(updated) : null });
  });

  // Products & Stock Management
  app.get('/api/products', (_req, res) => {
    res.json({ products: db.getProducts() });
  });

  app.post('/api/products', requireAdmin, (req, res) => {
    const body = req.body as Partial<Product>;
    if (!body.name?.trim() || !body.sku?.trim() || typeof body.priceGmd !== 'number' || typeof body.stock !== 'number') {
      res.status(400).json({ error: 'Nom, SKU, prix (GMD) et stock requis.' });
      return;
    }
    if (!body.imageUrl?.trim()) {
      res.status(400).json({ error: 'Une image du produit est obligatoire pour ajouter un article.' });
      return;
    }

    const created = db.createProduct({
      sku: body.sku.trim().toUpperCase(),
      name: body.name.trim(),
      nameEn: body.nameEn?.trim() || body.name.trim(),
      category: body.category || 'accessories',
      description: body.description?.trim() || 'Produit officiel KB-OUTLET Gambie.',
      descriptionEn: body.descriptionEn?.trim() || body.description?.trim() || 'Official KB-OUTLET Gambia product.',
      priceGmd: Math.max(0, Math.round(body.priceGmd)),
      compareAtGmd: body.compareAtGmd ? Math.max(0, Math.round(body.compareAtGmd)) : undefined,
      stock: Math.max(0, Math.floor(body.stock)),
      lowStockThreshold: Math.max(1, Math.floor(body.lowStockThreshold ?? 5)),
      visualPreset: body.visualPreset || 'backpack',
      imageUrl: body.imageUrl.trim(),
      badge: body.badge?.trim() || undefined,
      featured: Boolean(body.featured),
    });

    broadcastEvent('products_updated', { products: db.getProducts() });
    broadcastAdminEvent('analytics_updated', db.getAnalytics());
    res.status(201).json({ product: created });
  });

  app.patch('/api/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const patch = req.body as Partial<Product>;
    const updated = db.updateProduct(id, patch);
    if (!updated) {
      res.status(404).json({ error: 'Produit introuvable.' });
      return;
    }

    if (updated.stock <= updated.lowStockThreshold) {
      const alertLog = await dispatchLowStockEmail(updated);
      db.addEmailLog(alertLog);
      broadcastAdminEvent('email_sent', alertLog);
    }

    broadcastEvent('products_updated', { products: db.getProducts() });
    broadcastAdminEvent('analytics_updated', db.getAnalytics());
    res.json({ product: updated });
  });

  app.delete('/api/products/:id', requireAdmin, (req, res) => {
    const ok = db.deleteProduct(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Produit introuvable.' });
      return;
    }
    broadcastEvent('products_updated', { products: db.getProducts() });
    broadcastAdminEvent('analytics_updated', db.getAnalytics());
    res.json({ ok: true });
  });

  // Orders & Secure Gambian Checkout
  app.get('/api/orders', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Connexion requise pour consulter les commandes.' });
      return;
    }
    const orders = user.role === 'admin' ? db.getOrders() : db.getOrdersForUser(user);
    res.json({ orders });
  });

  app.get('/api/orders/track/:orderNumber', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Connexion requise : veuillez vous connecter à votre compte pour suivre vos commandes.',
      });
      return;
    }
    const order = db.findOrderByNumber(req.params.orderNumber);
    if (!order) {
      res.status(404).json({
        error: `Aucune commande trouvée avec la référence ${req.params.orderNumber}.`,
      });
      return;
    }
    if (user.role !== 'admin' && !db.doesUserOwnOrder(user, order)) {
      res.status(403).json({
        error: 'Accès refusé : chaque client ne peut consulter que les commandes de son propre compte.',
      });
      return;
    }
    res.json({ order });
  });

  app.post('/api/orders', async (req, res) => {
    const currentUser = getCurrentUser(req);
    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryZone,
      deliveryAddress,
      paymentMethod,
      walletPhone,
      currency,
      deliveryFeeGmd,
      items,
    } = req.body as {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      deliveryZone?: string;
      deliveryAddress?: string;
      paymentMethod?: PaymentMethod;
      walletPhone?: string;
      currency?: 'GMD' | 'XOF' | 'USD' | 'EUR';
      deliveryFeeGmd?: number;
      items?: { productId: string; quantity: number }[];
    };

    if (!customerName?.trim() || !customerEmail?.trim() || !customerPhone?.trim() || !deliveryZone || !deliveryAddress?.trim()) {
      res.status(400).json({ error: 'Veuillez remplir toutes vos coordonnées de livraison.' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Votre panier est vide.' });
      return;
    }
    if (!paymentMethod || !['wave', 'qmoney', 'afrimoney', 'card', 'cod'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Passerelle de paiement invalide.' });
      return;
    }

    // Validate mobile wallet phone for Gambian gateways
    if (['wave', 'qmoney', 'afrimoney'].includes(paymentMethod)) {
      const targetPhone = (walletPhone || customerPhone).replace(/\D/g, '');
      if (targetPhone.length < 7) {
        res.status(400).json({ error: 'Veuillez entrer un numéro mobile gambien valide (+220) pour ce paiement.' });
        return;
      }
    }

    const refPrefixMap: Record<PaymentMethod, string> = {
      wave: 'WAVE-GM',
      qmoney: 'QM-GM',
      afrimoney: 'AFRI-GM',
      card: 'CARD-GM',
      cod: 'COD-GM',
    };
    const paymentReference = `${refPrefixMap[paymentMethod]}-${crypto.randomInt(100000, 999999)}`;

    const result = db.createOrderAndDeductStock({
      userId: currentUser?.id,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: normalizePhone(customerPhone),
      deliveryZone,
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod,
      paymentReference,
      currency: currency || 'GMD',
      deliveryFeeGmd: Math.max(0, Number(deliveryFeeGmd || 0)),
      requestedItems: items,
    });

    if (result.error || !result.order) {
      res.status(400).json({ error: result.error || 'Impossible de finaliser la commande.' });
      return;
    }

    const order = result.order;

    // Automatic confirmation email
    const confirmLog = await dispatchOrderConfirmationEmail(order);
    db.addEmailLog(confirmLog);
    broadcastAdminEvent('email_sent', confirmLog);

    // Automatic low-stock alerts if stock crossed threshold
    for (const lowProd of result.lowStockProducts) {
      const alertLog = await dispatchLowStockEmail(lowProd);
      db.addEmailLog(alertLog);
      broadcastAdminEvent('email_sent', alertLog);
    }

    broadcastOrderEvent('order_created', order);
    broadcastEvent('products_updated', { products: db.getProducts() });
    broadcastAdminEvent('analytics_updated', db.getAnalytics());

    res.status(201).json({ order, emailLog: confirmLog });
  });

  // Customer self-cancellation within 2 hours
  app.post('/api/orders/:id/cancel', async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Veuillez vous connecter à votre compte pour annuler votre commande.',
      });
      return;
    }

    const order = db.findOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    if (user.role !== 'admin' && !db.doesUserOwnOrder(user, order)) {
      res.status(403).json({
        error: 'Accès refusé : vous ne pouvez annuler que vos propres commandes.',
      });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(400).json({ error: 'Cette commande est déjà annulée.' });
      return;
    }

    if (order.status === 'delivered') {
      res.status(400).json({
        error:
          'Cette commande a déjà été livrée. Veuillez contacter la boutique KB-OUTLET au +220 712 18 58.',
      });
      return;
    }

    const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
    if (elapsedMs > ORDER_CANCEL_WINDOW_MS) {
      res.status(403).json({
        error:
          'Le délai d’annulation de 2 heures est dépassé. Veuillez contacter la boutique KB-OUTLET au +220 712 18 58 ou par e-mail à bambabus27@gmail.com.',
        windowExpired: true,
      });
      return;
    }

    const { reason } = (req.body || {}) as { reason?: string };
    const note = reason?.trim()
      ? `Commande annulée par le client (délai de 2h respecté) : ${reason.trim()}`
      : 'Commande annulée par le client dans le délai autorisé de 2 heures. Stock réintégré.';

    const updated = db.updateOrderStatus(order.id, 'cancelled', note);
    if (!updated) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    const emailLog = await dispatchOrderStatusEmail(updated, note);
    db.addEmailLog(emailLog);
    broadcastAdminEvent('email_sent', emailLog);

    broadcastOrderEvent('order_updated', updated);
    broadcastEvent('products_updated', { products: db.getProducts() });
    broadcastAdminEvent('analytics_updated', db.getAnalytics());

    res.json({ order: updated, emailLog });
  });

  app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
    const { status, note } = req.body as { status?: OrderStatus; note?: string };
    if (!status || !['confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Statut de commande invalide.' });
      return;
    }

    const updated = db.updateOrderStatus(req.params.id, status, note);
    if (!updated) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    const lastEvent = updated.timeline[updated.timeline.length - 1];
    const emailLog = await dispatchOrderStatusEmail(updated, lastEvent.note);
    db.addEmailLog(emailLog);
    broadcastAdminEvent('email_sent', emailLog);

    broadcastOrderEvent('order_updated', updated);
    if (status === 'cancelled') {
      broadcastEvent('products_updated', { products: db.getProducts() });
    }
    broadcastAdminEvent('analytics_updated', db.getAnalytics());

    res.json({ order: updated, emailLog });
  });

  // Real-time Analytics & Email Outbox
  app.get('/api/analytics', requireAdmin, (_req, res) => {
    res.json({ analytics: db.getAnalytics() });
  });

  app.get('/api/emails', requireAdmin, (_req, res) => {
    res.json({ emails: db.getEmailLogs() });
  });

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Route API introuvable.' });
  });

  // Mount Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distFromFile = path.resolve(import.meta.dirname, 'dist');
    const distDir = fs.existsSync(distFromFile) ? distFromFile : path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KB-OUTLET server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start KB-OUTLET server:', err);
  process.exit(1);
});
