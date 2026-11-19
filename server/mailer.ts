import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import type { EmailLog, Order, OrderStatus, Product } from '../src/types/store.ts';

function getOrderStatusFr(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    confirmed: 'Confirmée',
    preparing: 'En préparation',
    shipping: 'En livraison',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };
  return map[status];
}

function getPaymentLabelFr(method: Order['paymentMethod']): string {
  const map: Record<Order['paymentMethod'], string> = {
    wave: 'Wave Gambie',
    qmoney: 'QMoney (QCell)',
    afrimoney: 'AfriMoney (Africell)',
    card: 'Carte Visa / Mastercard',
    cod: 'Paiement à la livraison',
  };
  return map[method];
}

function wrapEmailLayout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background:#F8F8F7; padding:32px 16px; color:#141413;">
    <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border:1px solid #E5E5E3; border-radius:12px; overflow:hidden;">
      <div style="background:#141413; color:#FFFFFF; padding:20px 24px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <span style="font-size:18px; font-weight:700; letter-spacing:-0.02em;">KB-OUTLET</span>
          <span style="display:block; font-size:12px; color:#A3A3A0; margin-top:2px;">Banjul &amp; Serrekunda, The Gambia · +220 712 18 58</span>
        </div>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px 0; font-size:20px; color:#141413;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:16px 24px; background:#F8F8F7; border-top:1px solid #E5E5E3; font-size:12px; color:#6B6B68;">
        KB-OUTLET Gambie · Service client : +220 712 18 58 · Notification automatique
      </div>
    </div>
  </div>`;
}

async function trySendSmtp(to: string, subject: string, html: string, text: string): Promise<'sent_smtp' | 'delivered_outbox'> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || '587');
  const from = process.env.SMTP_FROM || 'KB-OUTLET <no-reply@kb-outlet.gm>';

  if (!host || !user || !pass) {
    return 'delivered_outbox';
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, text, html });
    return 'sent_smtp';
  } catch (err) {
    console.warn('[KB-OUTLET Mailer] SMTP dispatch failed, logged to outbox:', err instanceof Error ? err.message : err);
    return 'delivered_outbox';
  }
}

export async function dispatchOrderConfirmationEmail(order: Order): Promise<EmailLog> {
  const itemsRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0; border-bottom:1px solid #E5E5E3;">${item.name} × ${item.quantity}</td>
          <td style="padding:8px 0; border-bottom:1px solid #E5E5E3; text-align:right; font-family:monospace;">${(
            item.unitPriceGmd * item.quantity
          ).toLocaleString('fr-FR')} D</td>
        </tr>`
    )
    .join('');

  const subject = `[KB-OUTLET] Confirmation de commande ${order.orderNumber}`;
  const previewText = `Merci ${order.customerName} ! Votre commande ${order.orderNumber} de ${order.totalGmd.toLocaleString('fr-FR')} D est confirmée.`;
  const htmlBody = wrapEmailLayout(
    `Commande ${order.orderNumber} confirmée`,
    `<p style="margin:0 0 16px 0; color:#444440;">Bonjour <strong>${order.customerName}</strong>,</p>
     <p style="margin:0 0 16px 0; color:#444440;">Nous avons bien reçu votre commande passée via <strong>${getPaymentLabelFr(order.paymentMethod)}</strong> (Réf. <code>${order.paymentReference}</code>).</p>
     <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
       ${itemsRows}
       <tr>
         <td style="padding:8px 0; color:#6B6B68;">Livraison (${order.deliveryZone})</td>
         <td style="padding:8px 0; text-align:right; font-family:monospace;">${order.deliveryFeeGmd === 0 ? 'Gratuit' : `${order.deliveryFeeGmd.toLocaleString('fr-FR')} D`}</td>
       </tr>
       <tr>
         <td style="padding:12px 0 0 0; font-weight:700;">Total</td>
         <td style="padding:12px 0 0 0; text-align:right; font-weight:700; font-family:monospace; color:#DC2626;">${order.totalGmd.toLocaleString('fr-FR')} GMD</td>
       </tr>
     </table>
     <p style="margin:16px 0 0 0; font-size:13px; color:#6B6B68;">Suivez votre commande en temps réel sur KB-OUTLET avec le code <strong>${order.orderNumber}</strong>.</p>`
  );

  const status = await trySendSmtp(order.customerEmail, subject, htmlBody, previewText);
  return {
    id: `mail_${crypto.randomUUID().slice(0, 8)}`,
    to: order.customerEmail,
    subject,
    type: 'order_confirmation',
    orderNumber: order.orderNumber,
    status,
    previewText,
    htmlBody,
    sentAt: new Date().toISOString(),
  };
}

export async function dispatchOrderStatusEmail(order: Order, note: string): Promise<EmailLog> {
  const statusLabel = getOrderStatusFr(order.status);
  const subject = `[KB-OUTLET] Mise à jour ${order.orderNumber} : ${statusLabel}`;
  const previewText = `Votre commande ${order.orderNumber} est désormais : ${statusLabel}. ${note}`;
  const htmlBody = wrapEmailLayout(
    `Statut mis à jour : ${statusLabel}`,
    `<p style="margin:0 0 14px 0; color:#444440;">Bonjour <strong>${order.customerName}</strong>,</p>
     <p style="margin:0 0 14px 0; color:#444440;">Votre commande <strong>${order.orderNumber}</strong> vient de passer à l'étape : <strong style="color:#DC2626;">${statusLabel}</strong>.</p>
     <p style="margin:0 0 16px 0; padding:12px 14px; background:#F8F8F7; border:1px solid #E5E5E3; border-radius:8px; font-size:14px;">${note}</p>
     <p style="margin:0; font-size:13px; color:#6B6B68;">Adresse : ${order.deliveryAddress} (${order.deliveryZone}) · Contact livreur : +220 712 18 58</p>`
  );

  const status = await trySendSmtp(order.customerEmail, subject, htmlBody, previewText);
  return {
    id: `mail_${crypto.randomUUID().slice(0, 8)}`,
    to: order.customerEmail,
    subject,
    type: 'status_update',
    orderNumber: order.orderNumber,
    status,
    previewText,
    htmlBody,
    sentAt: new Date().toISOString(),
  };
}

export async function dispatchWelcomeEmail(to: string, name: string): Promise<EmailLog> {
  const subject = `Bienvenue chez KB-OUTLET, ${name} !`;
  const previewText = `Votre compte client KB-OUTLET est activé. Profitez du paiement Wave, QMoney, AfriMoney et du suivi en temps réel.`;
  const htmlBody = wrapEmailLayout(
    `Bienvenue chez KB-OUTLET`,
    `<p style="margin:0 0 14px 0; color:#444440;">Bonjour <strong>${name}</strong>,</p>
     <p style="margin:0 0 14px 0; color:#444440;">Votre compte client KB-OUTLET est prêt. Vous pouvez désormais commander rapidement, payer avec Wave, QMoney, AfriMoney ou Carte Bancaire, et suivre vos livraisons en direct partout en Gambie.</p>`
  );

  const status = await trySendSmtp(to, subject, htmlBody, previewText);
  return {
    id: `mail_${crypto.randomUUID().slice(0, 8)}`,
    to,
    subject,
    type: 'welcome',
    status,
    previewText,
    htmlBody,
    sentAt: new Date().toISOString(),
  };
}

export async function dispatchLowStockEmail(product: Product): Promise<EmailLog> {
  const ownerEmail = process.env.OWNER_ALERT_EMAIL || 'bambabus27@gmail.com';
  const subject = `[KB-OUTLET Stock] Alerte niveau bas : ${product.name} (${product.stock} restants)`;
  const previewText = `Le produit ${product.name} (${product.sku}) n'a plus que ${product.stock} unité(s) en stock.`;
  const htmlBody = wrapEmailLayout(
    `Alerte de stock faible`,
    `<p style="margin:0 0 14px 0; color:#444440;">Le produit <strong>${product.name}</strong> (SKU: <code>${product.sku}</code>) a atteint un niveau critique.</p>
     <p style="margin:0 0 14px 0; font-size:15px;">Stock actuel : <strong style="color:#DC2626;">${product.stock} unité(s)</strong> (seuil : ${product.lowStockThreshold}).</p>
     <p style="margin:0; font-size:13px; color:#6B6B68;">Connectez-vous au tableau de bord KB-OUTLET pour réapprovisionner.</p>`
  );

  const status = await trySendSmtp(ownerEmail, subject, htmlBody, previewText);
  return {
    id: `mail_${crypto.randomUUID().slice(0, 8)}`,
    to: ownerEmail,
    subject,
    type: 'low_stock_alert',
    status,
    previewText,
    htmlBody,
    sentAt: new Date().toISOString(),
  };
}
