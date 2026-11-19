import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  EmailLog,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  SalesStats,
  UserProfile,
} from '../src/types/store.ts';

export interface StoredUser extends UserProfile {
  passwordHash?: string;
}

interface DatabaseSchema {
  products: Product[];
  orders: Order[];
  users: StoredUser[];
  emails: EmailLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'kb-outlet-db.json');

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(hash, 'hex');
  if (derived.length !== target.length) return false;
  return crypto.timingSafeEqual(derived, target);
}

function daysAgoIso(daysAgo: number, hour = 14): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 25, 0, 0);
  return d.toISOString();
}

function createInitialData(): DatabaseSchema {
  const now = new Date().toISOString();
  const products: Product[] = [
    {
      id: 'prod_01',
      sku: 'KB-AUD-101',
      name: 'Casque Studio ANC Pro',
      nameEn: 'Studio ANC Pro Headphones',
      category: 'audio',
      description: 'Réduction de bruit active hybride, 45h d’autonomie, charge rapide USB-C et coussinets acoustiques en mousse à mémoire.',
      descriptionEn: 'Hybrid active noise cancellation, 45h battery life, USB-C fast charge and memory foam cushions.',
      priceGmd: 6850,
      compareAtGmd: 7900,
      stock: 18,
      lowStockThreshold: 5,
      visualPreset: 'headphones',
      badge: 'Best-seller',
      featured: true,
      createdAt: daysAgoIso(14),
      updatedAt: now,
    },
    {
      id: 'prod_02',
      sku: 'KB-FTW-204',
      name: 'Sneakers Kombo Runner V2',
      nameEn: 'Kombo Runner V2 Sneakers',
      category: 'footwear',
      description: 'Tige en maille respirante, semelle intermédiaire amortissante double densité et finition urbaine blanche & graphite.',
      descriptionEn: 'Breathable knit upper, dual-density cushioned midsole and crisp white & graphite finish.',
      priceGmd: 5400,
      compareAtGmd: 6200,
      stock: 14,
      lowStockThreshold: 4,
      visualPreset: 'sneakers',
      badge: 'Nouvelle collection',
      featured: true,
      createdAt: daysAgoIso(12),
      updatedAt: now,
    },
    {
      id: 'prod_03',
      sku: 'KB-WTC-309',
      name: 'Montre Chronographe Senegambia',
      nameEn: 'Senegambia Chronograph Watch',
      category: 'wearables',
      description: 'Boîtier acier brossé 41mm, verre saphir résistant aux rayures, étanche 5 ATM et bracelet interchangeable.',
      descriptionEn: '41mm brushed steel case, scratch-resistant sapphire crystal, 5 ATM water resistance and quick-release strap.',
      priceGmd: 9200,
      stock: 9,
      lowStockThreshold: 3,
      visualPreset: 'watch',
      badge: 'Édition limitée',
      featured: true,
      createdAt: daysAgoIso(10),
      updatedAt: now,
    },
    {
      id: 'prod_04',
      sku: 'KB-STR-412',
      name: 'Hoodie Heavyweight Kotu 420g',
      nameEn: 'Kotu 420g Heavyweight Hoodie',
      category: 'streetwear',
      description: 'Coton peigné 420g/m², coupe structurée décontractée, broderie poitrine ton sur ton et coutures renforcées.',
      descriptionEn: '420gsm combed cotton fleece, relaxed structured cut, tonal chest embroidery and reinforced seams.',
      priceGmd: 3600,
      stock: 24,
      lowStockThreshold: 6,
      visualPreset: 'hoodie',
      createdAt: daysAgoIso(9),
      updatedAt: now,
    },
    {
      id: 'prod_05',
      sku: 'KB-AUD-118',
      name: 'Écouteurs Sans Fil Banjul Pods',
      nameEn: 'Banjul Pods Wireless Earbuds',
      category: 'audio',
      description: 'Boîtier compact USB-C, résistance IPX5 à la pluie et à la transpiration, appel clair à double micro.',
      descriptionEn: 'Compact USB-C charging case, IPX5 sweat and rain resistance, dual-mic clear voice pickup.',
      priceGmd: 2950,
      compareAtGmd: 3500,
      stock: 4,
      lowStockThreshold: 5,
      visualPreset: 'earbuds',
      badge: 'Stock limité',
      createdAt: daysAgoIso(8),
      updatedAt: now,
    },
    {
      id: 'prod_06',
      sku: 'KB-ACC-502',
      name: 'Sac à Dos Tech Imperméable',
      nameEn: 'Waterproof Tech Backpack',
      category: 'accessories',
      description: 'Compartiment ordinateur 16 pouces matelassé, tissu balistique déperlant et port de charge externe.',
      descriptionEn: 'Padded 16-inch laptop sleeve, water-repellent ballistic fabric and external pass-through charging port.',
      priceGmd: 4100,
      stock: 11,
      lowStockThreshold: 4,
      visualPreset: 'backpack',
      createdAt: daysAgoIso(7),
      updatedAt: now,
    },
    {
      id: 'prod_07',
      sku: 'KB-ACC-519',
      name: 'Batterie Externe Solar 20 000 mAh',
      nameEn: '20,000mAh Fast PowerBank',
      category: 'accessories',
      description: 'Charge rapide Power Delivery 22.5W avec double sortie USB-C / USB-A, idéale pour déplacements en Gambie.',
      descriptionEn: '22.5W Power Delivery fast charging with dual USB-C / USB-A ports, built for daily travel across The Gambia.',
      priceGmd: 2450,
      stock: 22,
      lowStockThreshold: 5,
      visualPreset: 'powerbank',
      createdAt: daysAgoIso(6),
      updatedAt: now,
    },
    {
      id: 'prod_08',
      sku: 'KB-ACC-533',
      name: 'Lunettes Polarisées Atlantic',
      nameEn: 'Atlantic Polarized Sunglasses',
      category: 'accessories',
      description: 'Monture acétate sculptée à la main, verres polarisés UV400 anti-reflets avec étui rigide fourni.',
      descriptionEn: 'Hand-sculpted acetate frame with anti-glare UV400 polarized lenses and hard protective case.',
      priceGmd: 2150,
      stock: 16,
      lowStockThreshold: 4,
      visualPreset: 'sunglasses',
      createdAt: daysAgoIso(5),
      updatedAt: now,
    },
  ];

  const users: StoredUser[] = [
    {
      id: 'usr_admin_kb',
      name: 'Bamba (KB-OUTLET)',
      email: 'bambabus27@gmail.com',
      phone: '+2207121858',
      authProvider: 'email',
      role: 'admin',
      defaultZone: 'Serrekunda / Kanifing',
      defaultAddress: 'Kairaba Avenue, Serrekunda',
      passwordHash: hashPassword('kboutlet2026'),
      createdAt: daysAgoIso(20),
    },
    {
      id: 'usr_cust_01',
      name: 'Aminata Jallow',
      email: 'aminata.jallow@example.gm',
      phone: '+2203456789',
      authProvider: 'phone',
      role: 'customer',
      defaultZone: 'Kololi / Senegambia / Bijilo',
      defaultAddress: 'Bertil Harding Hwy, Kololi',
      passwordHash: hashPassword('client123'),
      createdAt: daysAgoIso(10),
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord_1001',
      orderNumber: 'KB-2026-1001',
      userId: 'usr_cust_01',
      customerName: 'Aminata Jallow',
      customerEmail: 'aminata.jallow@example.gm',
      customerPhone: '+2203456789',
      deliveryZone: 'Kololi / Senegambia / Bijilo',
      deliveryAddress: 'Bertil Harding Hwy, près de Senegambia',
      paymentMethod: 'wave',
      paymentReference: 'WAVE-GM-884120',
      paymentStatus: 'paid',
      currency: 'GMD',
      items: [
        {
          productId: 'prod_01',
          sku: 'KB-AUD-101',
          name: 'Casque Studio ANC Pro',
          unitPriceGmd: 6850,
          quantity: 1,
          visualPreset: 'headphones',
        },
        {
          productId: 'prod_07',
          sku: 'KB-ACC-519',
          name: 'Batterie Externe Solar 20 000 mAh',
          unitPriceGmd: 2450,
          quantity: 1,
          visualPreset: 'powerbank',
        },
      ],
      subtotalGmd: 9300,
      deliveryFeeGmd: 200,
      totalGmd: 9500,
      status: 'delivered',
      timeline: [
        { status: 'confirmed', label: 'Confirmée', note: 'Paiement Wave Gambie validé.', timestamp: daysAgoIso(5, 10) },
        { status: 'preparing', label: 'En préparation', note: 'Colis emballé au dépôt KB-OUTLET Serrekunda.', timestamp: daysAgoIso(5, 11) },
        { status: 'shipping', label: 'En livraison', note: 'Coursier en route vers Kololi.', timestamp: daysAgoIso(5, 13) },
        { status: 'delivered', label: 'Livrée', note: 'Remis en main propre à Aminata Jallow.', timestamp: daysAgoIso(5, 15) },
      ],
      createdAt: daysAgoIso(5, 10),
      updatedAt: daysAgoIso(5, 15),
    },
    {
      id: 'ord_1002',
      orderNumber: 'KB-2026-1002',
      customerName: 'Lamin Ceesay',
      customerEmail: 'lamin.ceesay@example.gm',
      customerPhone: '+2207882211',
      deliveryZone: 'Serrekunda / Kanifing',
      deliveryAddress: 'Westfield Junction, Serrekunda',
      paymentMethod: 'qmoney',
      paymentReference: 'QM-GM-501933',
      paymentStatus: 'paid',
      currency: 'GMD',
      items: [
        {
          productId: 'prod_03',
          sku: 'KB-WTC-309',
          name: 'Montre Chronographe Senegambia',
          unitPriceGmd: 9200,
          quantity: 1,
          visualPreset: 'watch',
        },
      ],
      subtotalGmd: 9200,
      deliveryFeeGmd: 150,
      totalGmd: 9350,
      status: 'delivered',
      timeline: [
        { status: 'confirmed', label: 'Confirmée', note: 'Paiement QMoney reçu.', timestamp: daysAgoIso(4, 14) },
        { status: 'preparing', label: 'En préparation', note: 'Contrôle qualité effectué.', timestamp: daysAgoIso(4, 15) },
        { status: 'shipping', label: 'En livraison', note: 'En route vers Westfield.', timestamp: daysAgoIso(4, 16) },
        { status: 'delivered', label: 'Livrée', note: 'Livraison terminée.', timestamp: daysAgoIso(4, 17) },
      ],
      createdAt: daysAgoIso(4, 14),
      updatedAt: daysAgoIso(4, 17),
    },
    {
      id: 'ord_1003',
      orderNumber: 'KB-2026-1003',
      customerName: 'Mariama Touray',
      customerEmail: 'mariama.touray@example.gm',
      customerPhone: '+2209910452',
      deliveryZone: 'Banjul / Bakau / Fajara',
      deliveryAddress: 'Atlantic Road, Fajara',
      paymentMethod: 'afrimoney',
      paymentReference: 'AFRI-GM-330219',
      paymentStatus: 'paid',
      currency: 'GMD',
      items: [
        {
          productId: 'prod_02',
          sku: 'KB-FTW-204',
          name: 'Sneakers Kombo Runner V2',
          unitPriceGmd: 5400,
          quantity: 2,
          visualPreset: 'sneakers',
        },
        {
          productId: 'prod_04',
          sku: 'KB-STR-412',
          name: 'Hoodie Heavyweight Kotu 420g',
          unitPriceGmd: 3600,
          quantity: 1,
          visualPreset: 'hoodie',
        },
      ],
      subtotalGmd: 14400,
      deliveryFeeGmd: 0,
      totalGmd: 14400,
      status: 'delivered',
      timeline: [
        { status: 'confirmed', label: 'Confirmée', note: 'Paiement AfriMoney validé (livraison gratuite).', timestamp: daysAgoIso(2, 11) },
        { status: 'delivered', label: 'Livrée', note: 'Livré à Fajara.', timestamp: daysAgoIso(2, 16) },
      ],
      createdAt: daysAgoIso(2, 11),
      updatedAt: daysAgoIso(2, 16),
    },
    {
      id: 'ord_1004',
      orderNumber: 'KB-2026-1004',
      customerName: 'Ebrima Sanyang',
      customerEmail: 'ebrima.sanyang@example.gm',
      customerPhone: '+2207045198',
      deliveryZone: 'Brusubi / Brufut / Sukuta',
      deliveryAddress: 'Brusubi Phase 2, Turntable',
      paymentMethod: 'wave',
      paymentReference: 'WAVE-GM-912044',
      paymentStatus: 'paid',
      currency: 'GMD',
      items: [
        {
          productId: 'prod_06',
          sku: 'KB-ACC-502',
          name: 'Sac à Dos Tech Imperméable',
          unitPriceGmd: 4100,
          quantity: 1,
          visualPreset: 'backpack',
        },
        {
          productId: 'prod_05',
          sku: 'KB-AUD-118',
          name: 'Écouteurs Sans Fil Banjul Pods',
          unitPriceGmd: 2950,
          quantity: 1,
          visualPreset: 'earbuds',
        },
      ],
      subtotalGmd: 7050,
      deliveryFeeGmd: 250,
      totalGmd: 7300,
      status: 'shipping',
      timeline: [
        { status: 'confirmed', label: 'Confirmée', note: 'Paiement Wave Gambie confirmé.', timestamp: daysAgoIso(0, 9) },
        { status: 'preparing', label: 'En préparation', note: 'Commande préparée et vérifiée.', timestamp: daysAgoIso(0, 10) },
        { status: 'shipping', label: 'En livraison', note: 'Coursier KB-OUTLET en route vers Brusubi Turntable.', timestamp: daysAgoIso(0, 11) },
      ],
      createdAt: daysAgoIso(0, 9),
      updatedAt: daysAgoIso(0, 11),
    },
    {
      id: 'ord_1005',
      orderNumber: 'KB-2026-1005',
      customerName: 'Fatou Njie',
      customerEmail: 'fatou.njie@example.gm',
      customerPhone: '+2203128890',
      deliveryZone: 'Serrekunda / Kanifing',
      deliveryAddress: 'Pipeline Mosque Road, Kanifing',
      paymentMethod: 'card',
      paymentReference: 'VISA-GM-774109',
      paymentStatus: 'paid',
      currency: 'GMD',
      items: [
        {
          productId: 'prod_08',
          sku: 'KB-ACC-533',
          name: 'Lunettes Polarisées Atlantic',
          unitPriceGmd: 2150,
          quantity: 2,
          visualPreset: 'sunglasses',
        },
      ],
      subtotalGmd: 4300,
      deliveryFeeGmd: 150,
      totalGmd: 4450,
      status: 'preparing',
      timeline: [
        { status: 'confirmed', label: 'Confirmée', note: 'Paiement par carte Visa validé.', timestamp: daysAgoIso(0, 12) },
        { status: 'preparing', label: 'En préparation', note: 'Emballage en cours à la boutique.', timestamp: daysAgoIso(0, 13) },
      ],
      createdAt: daysAgoIso(0, 12),
      updatedAt: daysAgoIso(0, 13),
    },
  ];

  const emails: EmailLog[] = [
    {
      id: 'mail_seed_1',
      to: 'ebrima.sanyang@example.gm',
      subject: '[KB-OUTLET] Mise à jour KB-2026-1004 : En livraison',
      type: 'status_update',
      orderNumber: 'KB-2026-1004',
      status: 'delivered_outbox',
      previewText: 'Votre commande KB-2026-1004 est en route vers Brusubi Turntable.',
      htmlBody: '<p>Coursier KB-OUTLET en route vers Brusubi Turntable (+220 712 18 58).</p>',
      sentAt: daysAgoIso(0, 11),
    },
    {
      id: 'mail_seed_2',
      to: 'bambabus27@gmail.com',
      subject: '[KB-OUTLET Stock] Alerte niveau bas : Écouteurs Sans Fil Banjul Pods (4 restants)',
      type: 'low_stock_alert',
      status: 'delivered_outbox',
      previewText: 'Le produit Écouteurs Sans Fil Banjul Pods (KB-AUD-118) a atteint 4 unités.',
      htmlBody: '<p>Stock faible détecté pour KB-AUD-118 (4 unités restantes).</p>',
      sentAt: daysAgoIso(0, 9),
    },
  ];

  return { products, orders, users, emails };
}

class StoreDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[KB-OUTLET Store] Failed to read disk DB, seeding fresh store:', err);
    }
    const initial = createInitialData();
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmp = `${DB_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, DB_PATH);
    } catch (err) {
      console.error('[KB-OUTLET Store] Disk write error:', err);
    }
  }

  private commit() {
    this.saveData(this.data);
  }

  // Products
  getProducts(): Product[] {
    return [...this.data.products];
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  createProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const now = new Date().toISOString();
    const product: Product = {
      ...input,
      id: `prod_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.products.unshift(product);
    this.commit();
    return product;
  }

  updateProduct(id: string, patch: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const updated: Product = {
      ...this.data.products[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.data.products[idx] = updated;
    this.commit();
    return updated;
  }

  deleteProduct(id: string): boolean {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length === before) return false;
    this.commit();
    return true;
  }

  // Orders
  getOrders(): Order[] {
    return [...this.data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  doesUserOwnOrder(user: UserProfile, order: Order): boolean {
    if (order.userId && order.userId === user.id) return true;
    if (user.email && order.customerEmail.toLowerCase() === user.email.toLowerCase()) return true;
    if (user.phone) {
      const userDigits = user.phone.replace(/\D/g, '');
      const orderDigits = order.customerPhone.replace(/\D/g, '');
      if (userDigits && orderDigits && userDigits === orderDigits) return true;
    }
    return false;
  }

  getOrdersForUser(user: UserProfile): Order[] {
    return this.getOrders().filter((o) => this.doesUserOwnOrder(user, o));
  }

  findOrderByNumber(orderNumber: string): Order | undefined {
    const normalized = orderNumber.trim().toUpperCase();
    return this.data.orders.find((o) => o.orderNumber.toUpperCase() === normalized);
  }

  findOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  createOrderAndDeductStock(params: {
    userId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryZone: string;
    deliveryAddress: string;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    currency: Order['currency'];
    deliveryFeeGmd: number;
    requestedItems: { productId: string; quantity: number }[];
  }): { order?: Order; lowStockProducts: Product[]; error?: string } {
    // 1. Validate all items & stock atomically before deducting
    const resolvedItems: Order['items'] = [];
    let subtotalGmd = 0;

    for (const reqItem of params.requestedItems) {
      const product = this.data.products.find((p) => p.id === reqItem.productId);
      if (!product) {
        return { lowStockProducts: [], error: `Produit introuvable (${reqItem.productId}).` };
      }
      if (reqItem.quantity <= 0 || !Number.isInteger(reqItem.quantity)) {
        return { lowStockProducts: [], error: `Quantité invalide pour ${product.name}.` };
      }
      if (product.stock < reqItem.quantity) {
        return {
          lowStockProducts: [],
          error: `Stock insuffisant pour ${product.name} (${product.stock} disponible(s)).`,
        };
      }
      resolvedItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPriceGmd: product.priceGmd,
        quantity: reqItem.quantity,
        visualPreset: product.visualPreset,
        imageUrl: product.imageUrl,
      });
      subtotalGmd += product.priceGmd * reqItem.quantity;
    }

    // 2. Deduct stock and collect low-stock alerts
    const now = new Date().toISOString();
    const lowStockProducts: Product[] = [];
    for (const item of resolvedItems) {
      const product = this.data.products.find((p) => p.id === item.productId)!;
      product.stock -= item.quantity;
      product.updatedAt = now;
      if (product.stock <= product.lowStockThreshold) {
        lowStockProducts.push({ ...product });
      }
    }

    // 3. Generate unique Order Number
    const nextNum = 1001 + this.data.orders.length;
    const orderNumber = `KB-2026-${nextNum}`;
    const totalGmd = subtotalGmd + params.deliveryFeeGmd;

    const paymentNoteMap: Record<PaymentMethod, string> = {
      wave: 'Paiement instantané Wave Gambie vérifié.',
      qmoney: 'Transaction QMoney validée.',
      afrimoney: 'Transaction AfriMoney validée.',
      card: 'Paiement sécurisé Visa / Mastercard autorisé.',
      cod: 'Commande confirmée — paiement en espèces à la livraison.',
    };

    const order: Order = {
      id: `ord_${crypto.randomUUID().slice(0, 8)}`,
      orderNumber,
      userId: params.userId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      deliveryZone: params.deliveryZone,
      deliveryAddress: params.deliveryAddress,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference,
      paymentStatus: params.paymentMethod === 'cod' ? 'pending_cod' : 'paid',
      currency: params.currency,
      items: resolvedItems,
      subtotalGmd,
      deliveryFeeGmd: params.deliveryFeeGmd,
      totalGmd,
      status: 'confirmed',
      timeline: [
        {
          status: 'confirmed',
          label: 'Confirmée',
          note: paymentNoteMap[params.paymentMethod],
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.data.orders.unshift(order);
    this.commit();
    return { order, lowStockProducts };
  }

  updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Order | null {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const defaultNotes: Record<OrderStatus, string> = {
      confirmed: 'Commande confirmée par KB-OUTLET.',
      preparing: 'Colis en cours de préparation à notre boutique de Serrekunda.',
      shipping: 'Coursier KB-OUTLET en route pour la livraison.',
      delivered: 'Colis livré au client avec succès.',
      cancelled: 'Commande annulée et stock réintégré.',
    };

    const labels: Record<OrderStatus, string> = {
      confirmed: 'Confirmée',
      preparing: 'En préparation',
      shipping: 'En livraison',
      delivered: 'Livrée',
      cancelled: 'Annulée',
    };

    const now = new Date().toISOString();

    // Restore stock if transitioning to cancelled from non-cancelled
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const prod = this.data.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
          prod.updatedAt = now;
        }
      }
    }

    order.status = status;
    order.updatedAt = now;
    order.timeline.push({
      status,
      label: labels[status],
      note: note?.trim() || defaultNotes[status],
      timestamp: now,
    });

    this.commit();
    return order;
  }

  // Users
  findUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  findUserByEmail(email: string): StoredUser | undefined {
    const norm = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email?.toLowerCase() === norm);
  }

  findUserByPhone(phone: string): StoredUser | undefined {
    const norm = phone.replace(/\D/g, '');
    return this.data.users.find((u) => u.phone?.replace(/\D/g, '') === norm);
  }

  createUser(input: Omit<StoredUser, 'id' | 'createdAt'>): StoredUser {
    const user: StoredUser = {
      ...input,
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.commit();
    return user;
  }

  updateUser(id: string, patch: Partial<StoredUser>): StoredUser | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...patch, id };
    this.commit();
    return this.data.users[idx];
  }

  sanitizeUser(u: StoredUser): UserProfile {
    const { passwordHash: _ignored, ...safe } = u;
    return safe;
  }

  // Emails
  addEmailLog(log: EmailLog) {
    this.data.emails.unshift(log);
    if (this.data.emails.length > 100) {
      this.data.emails = this.data.emails.slice(0, 100);
    }
    this.commit();
  }

  getEmailLogs(): EmailLog[] {
    return [...this.data.emails];
  }

  // Real-time Analytics
  getAnalytics(): SalesStats {
    const validOrders = this.data.orders.filter((o) => o.status !== 'cancelled');
    const todayKey = new Date().toISOString().slice(0, 10);

    let totalRevenueGmd = 0;
    let todayRevenueGmd = 0;
    let todayOrders = 0;
    let activeOrdersCount = 0;
    let totalUnitsSold = 0;

    const gatewayMap = new Map<PaymentMethod, { count: number; revenueGmd: number }>([
      ['wave', { count: 0, revenueGmd: 0 }],
      ['qmoney', { count: 0, revenueGmd: 0 }],
      ['afrimoney', { count: 0, revenueGmd: 0 }],
      ['card', { count: 0, revenueGmd: 0 }],
      ['cod', { count: 0, revenueGmd: 0 }],
    ]);

    const productSales = new Map<string, { productId: string; name: string; unitsSold: number; revenueGmd: number }>();

    for (const order of validOrders) {
      totalRevenueGmd += order.totalGmd;
      if (order.createdAt.slice(0, 10) === todayKey) {
        todayRevenueGmd += order.totalGmd;
        todayOrders += 1;
      }
      if (order.status !== 'delivered') {
        activeOrdersCount += 1;
      }
      const gw = gatewayMap.get(order.paymentMethod) || { count: 0, revenueGmd: 0 };
      gw.count += 1;
      gw.revenueGmd += order.totalGmd;
      gatewayMap.set(order.paymentMethod, gw);

      for (const item of order.items) {
        totalUnitsSold += item.quantity;
        const existing = productSales.get(item.productId) || {
          productId: item.productId,
          name: item.name,
          unitsSold: 0,
          revenueGmd: 0,
        };
        existing.unitsSold += item.quantity;
        existing.revenueGmd += item.unitPriceGmd * item.quantity;
        productSales.set(item.productId, existing);
      }
    }

    const dailySeries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = validOrders.filter((o) => o.createdAt.slice(0, 10) === dateStr);
      const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }).format(d);
      dailySeries.push({
        date: dateStr,
        label,
        revenueGmd: dayOrders.reduce((acc, o) => acc + o.totalGmd, 0),
        ordersCount: dayOrders.length,
      });
    }

    const gatewayLabels: Record<PaymentMethod, string> = {
      wave: 'Wave Gambie',
      qmoney: 'QMoney',
      afrimoney: 'AfriMoney',
      card: 'Carte Visa/MC',
      cod: 'Livraison (COD)',
    };

    const paymentBreakdown = Array.from(gatewayMap.entries()).map(([method, stats]) => ({
      method,
      label: gatewayLabels[method],
      count: stats.count,
      revenueGmd: stats.revenueGmd,
    }));

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenueGmd - a.revenueGmd)
      .slice(0, 5);

    const lowStockCount = this.data.products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const outOfStockCount = this.data.products.filter((p) => p.stock === 0).length;

    return {
      totalRevenueGmd,
      todayRevenueGmd,
      totalOrders: validOrders.length,
      todayOrders,
      activeOrdersCount,
      averageOrderGmd: validOrders.length > 0 ? Math.round(totalRevenueGmd / validOrders.length) : 0,
      lowStockCount,
      outOfStockCount,
      totalUnitsSold,
      dailySeries,
      paymentBreakdown,
      topProducts,
    };
  }
}

export const db = new StoreDatabase();
