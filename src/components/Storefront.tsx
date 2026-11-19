import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice, getCategoryLabel } from '../lib/format';
import type { CurrencyCode, Language, Product, ProductCategory } from '../types/store';
import { ProductIllustration } from './ProductIllustration';

interface StorefrontProps {
  products: Product[];
  currency: CurrencyCode;
  lang: Language;
  searchQuery: string;
  selectedCategory: 'all' | ProductCategory;
  onResetFilters: () => void;
  onAddToCart: (product: Product, qty?: number) => void;
  onGoToTrack: () => void;
}

export function Storefront({
  products,
  currency,
  lang,
  searchQuery,
  selectedCategory,
  onResetFilters,
  onAddToCart,
  onGoToTrack,
}: StorefrontProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [heroIndex, setHeroIndex] = useState(0);

  const flashRailRef = useRef<HTMLDivElement | null>(null);
  const arrivalsRailRef = useRef<HTMLDivElement | null>(null);

  const heroSlides = useMemo(() => {
    const featured = products.filter((p) => p.featured && p.stock > 0);
    const fallback = products.filter((p) => p.stock > 0);
    return (featured.length > 0 ? featured : fallback).slice(0, 5);
  }, [products]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroIndex >= heroSlides.length && heroSlides.length > 0) {
      setHeroIndex(0);
    }
  }, [heroIndex, heroSlides.length]);

  const flashDeals = useMemo(() => {
    const discounted = products.filter(
      (p) => p.stock > 0 && p.compareAtGmd && p.compareAtGmd > p.priceGmd
    );
    return discounted.length >= 4 ? discounted : products.filter((p) => p.stock > 0).slice(0, 8);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const title = (lang === 'fr' ? p.name : p.nameEn).toLowerCase();
      const desc = (lang === 'fr' ? p.description : p.descriptionEn).toLowerCase();
      const matchesSearch =
        !q || title.includes(q) || desc.includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery, lang]);

  const scrollRail = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return;
    const amount = dir === 'left' ? -340 : 340;
    ref.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalQty(1);
  };

  const activeSlide = heroSlides[heroIndex] || products[0];
  const isFiltering = selectedCategory !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-6">
      {/* Section 1: Sleek Full-Width Dark Promo Hero Carousel (No long paragraphs) */}
      {!isFiltering && activeSlide && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#141413] via-[#1E1415] to-[#2B1215] text-white shadow-sm">
          <div className="grid grid-cols-1 items-center gap-5 p-5 sm:p-8 lg:grid-cols-12 lg:gap-8">
            {/* Left Copy & Price Badge */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#DC2626] px-2.5 py-1 text-white">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'fr' ? 'Offres du jour' : 'Flash Picks'}</span>
                </span>
                <span className="text-white/75">
                  {getCategoryLabel(activeSlide.category, lang)} · Wave · QMoney · AfriMoney
                </span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(1.65rem, 3.4vw, 2.75rem)' }}
              >
                {lang === 'fr' ? activeSlide.name : activeSlide.nameEn}
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-[#DC2626] px-4 py-1.5 font-mono text-lg sm:text-xl font-bold tabular-nums text-white">
                  {formatPrice(activeSlide.priceGmd, currency)}
                </span>
                {activeSlide.compareAtGmd && activeSlide.compareAtGmd > activeSlide.priceGmd && (
                  <span className="font-mono text-sm tabular-nums text-white/60 line-through">
                    {formatPrice(activeSlide.compareAtGmd, currency)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openProductModal(activeSlide)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-5 py-2 text-xs sm:text-sm font-bold text-[#141413] transition-colors hover:bg-white/90"
                >
                  <span>{lang === 'fr' ? 'Voir l’offre' : 'View deal'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={activeSlide.stock <= 0}
                  onClick={() => onAddToCart(activeSlide, 1)}
                  className="inline-flex min-h-[40px] items-center rounded-full border border-white/25 bg-white/10 px-5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  {lang === 'fr' ? 'Ajouter au panier' : 'Add to bag'}
                </button>
              </div>
            </div>

            {/* Right Showcase Product Image */}
            <div className="lg:col-span-5">
              <button
                type="button"
                onClick={() => openProductModal(activeSlide)}
                className="block w-full overflow-hidden rounded-xl border border-white/15 bg-white shadow-lg transition-transform duration-200 hover:scale-[1.01]"
              >
                <ProductIllustration
                  preset={activeSlide.visualPreset}
                  imageUrl={activeSlide.imageUrl}
                  alt={lang === 'fr' ? activeSlide.name : activeSlide.nameEn}
                  className="aspect-[16/10] w-full"
                />
              </button>
            </div>
          </div>

          {/* Carousel Controls */}
          {heroSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
                }
                aria-label={lang === 'fr' ? 'Offre précédente' : 'Previous deal'}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-xs transition-colors hover:bg-black/75"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setHeroIndex((prev) => (prev + 1) % heroSlides.length)}
                aria-label={lang === 'fr' ? 'Offre suivante' : 'Next deal'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-xs transition-colors hover:bg-black/75"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="flex items-center justify-center gap-1.5 pb-3.5">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Slide ${idx + 1}`}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === heroIndex ? 'w-6 bg-[#DC2626]' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Compact Trust Strip (Single-line scannable) */}
      {!isFiltering && (
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
          <div className="flex items-center gap-2 rounded-xl border border-[#E5E5E3] bg-white px-3.5 py-2.5 shrink-0">
            <Smartphone className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
            <span className="text-xs font-semibold text-[#141413]">Wave · QMoney · AfriMoney</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#E5E5E3] bg-white px-3.5 py-2.5 shrink-0">
            <Truck className="h-4 w-4 text-[#141413]" aria-hidden="true" />
            <span className="text-xs font-semibold text-[#141413]">
              {lang === 'fr' ? 'Livraison rapide Gambie' : 'Fast Gambia Delivery'}
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToTrack}
            className="flex items-center gap-2 rounded-xl border border-[#E5E5E3] bg-white px-3.5 py-2.5 shrink-0 transition-colors hover:border-[#141413]"
          >
            <ShieldCheck className="h-4 w-4 text-[#141413]" aria-hidden="true" />
            <span className="text-xs font-semibold text-[#141413]">
              {lang === 'fr' ? 'Suivi temps réel & E-mail' : 'Live Track & Email'}
            </span>
          </button>
        </div>
      )}

      {/* Section 2: Horizontal Smooth-Scrolling Deals Rail (Jumia-style compact dark cards) */}
      {!isFiltering && flashDeals.length > 0 && (
        <section className="rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#DC2626] text-white">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#141413]">
                {lang === 'fr' ? 'Sélection Flash · Prix Gambie' : 'Flash Deals · Gambia'}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRail(flashRailRef, 'left')}
                aria-label={lang === 'fr' ? 'Défiler à gauche' : 'Scroll left'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E3] bg-white text-[#141413] transition-colors hover:bg-[#F8F8F7]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(flashRailRef, 'right')}
                aria-label={lang === 'fr' ? 'Défiler à droite' : 'Scroll right'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E3] bg-white text-[#141413] transition-colors hover:bg-[#F8F8F7]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={flashRailRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-1"
          >
            {flashDeals.map((product) => {
              const title = lang === 'fr' ? product.name : product.nameEn;
              return (
                <article
                  key={`flash-${product.id}`}
                  className="group relative flex w-[180px] sm:w-[205px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl bg-[#141413] p-3 text-white transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => openProductModal(product)}
                      className="block w-full text-left"
                    >
                      <h3 className="line-clamp-2 min-h-[2.25rem] font-display text-xs sm:text-sm font-semibold text-white group-hover:text-[#F87171] transition-colors">
                        {title}
                      </h3>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[#DC2626] px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-white">
                        {formatPrice(product.priceGmd, currency)}
                      </span>
                      {product.compareAtGmd && product.compareAtGmd > product.priceGmd && (
                        <span className="font-mono text-[11px] tabular-nums text-white/55 line-through">
                          {formatPrice(product.compareAtGmd, currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-3 overflow-hidden rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => openProductModal(product)}
                      className="block w-full"
                    >
                      <ProductIllustration
                        preset={product.visualPreset}
                        imageUrl={product.imageUrl}
                        alt={title}
                        className="aspect-[4/3] w-full"
                      />
                    </button>
                    <button
                      type="button"
                      disabled={product.stock <= 0}
                      onClick={() => onAddToCart(product, 1)}
                      aria-label={lang === 'fr' ? `Ajouter ${title}` : `Add ${title}`}
                      className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#141413] text-white shadow-sm transition-colors hover:bg-[#DC2626] disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 3: Horizontal Arrivals Rail (quick horizontal browse) */}
      {!isFiltering && products.length > 4 && (
        <section className="rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#141413]">
              {lang === 'fr' ? 'Nouveautés en stock' : 'Fresh in Stock'}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRail(arrivalsRailRef, 'left')}
                aria-label={lang === 'fr' ? 'Défiler à gauche' : 'Scroll left'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E3] bg-white text-[#141413] transition-colors hover:bg-[#F8F8F7]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(arrivalsRailRef, 'right')}
                aria-label={lang === 'fr' ? 'Défiler à droite' : 'Scroll right'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E3] bg-white text-[#141413] transition-colors hover:bg-[#F8F8F7]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={arrivalsRailRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-1"
          >
            {[...products].reverse().map((product) => {
              const title = lang === 'fr' ? product.name : product.nameEn;
              const isOut = product.stock <= 0;
              return (
                <article
                  key={`rail-${product.id}`}
                  className="flex w-[165px] sm:w-[190px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl border border-[#E5E5E3] bg-white transition-colors hover:border-[#141413]"
                >
                  <button
                    type="button"
                    onClick={() => openProductModal(product)}
                    className="block w-full text-left"
                  >
                    <ProductIllustration
                      preset={product.visualPreset}
                      imageUrl={product.imageUrl}
                      alt={title}
                      className="aspect-[4/3] w-full border-b border-[#E5E5E3]"
                    />
                    <div className="p-2.5 space-y-1">
                      <p className="truncate text-[10px] font-medium text-[#6B6B68]">
                        {getCategoryLabel(product.category, lang)}
                      </p>
                      <h3 className="line-clamp-2 min-h-[2rem] font-display text-xs font-semibold text-[#141413]">
                        {title}
                      </h3>
                      <p className="font-mono text-xs sm:text-sm font-bold tabular-nums text-[#DC2626]">
                        {formatPrice(product.priceGmd, currency)}
                      </p>
                    </div>
                  </button>
                  <div className="px-2.5 pb-2.5">
                    <button
                      type="button"
                      disabled={isOut}
                      onClick={() => onAddToCart(product, 1)}
                      className="w-full rounded-lg bg-[#141413] py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#DC2626] disabled:bg-[#E5E5E3] disabled:text-[#6B6B68]"
                    >
                      {isOut ? (lang === 'fr' ? 'Épuisé' : 'Out') : lang === 'fr' ? 'Ajouter' : 'Add'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 4: Compact Vertical Product Grid (Zero paragraphs on cards) */}
      <section id="catalogue" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#141413]">
              {selectedCategory === 'all'
                ? lang === 'fr'
                  ? 'Tous les produits'
                  : 'All products'
                : getCategoryLabel(selectedCategory, lang)}
            </h2>
            <span className="font-mono text-xs tabular-nums text-[#6B6B68]">
              ({filteredProducts.length})
            </span>
          </div>

          {isFiltering && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-lg border border-[#E5E5E3] bg-white px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F8F8F7]"
            >
              {lang === 'fr' ? 'Réinitialiser' : 'Reset'}
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E3] bg-white p-10 text-center">
            <p className="text-sm font-semibold text-[#141413]">
              {lang === 'fr' ? 'Aucun article trouvé' : 'No matching items found'}
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-3 inline-flex min-h-[38px] items-center rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white"
            >
              {lang === 'fr' ? 'Voir tout le catalogue' : 'Show all products'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {filteredProducts.map((product) => {
              const title = lang === 'fr' ? product.name : product.nameEn;
              const isOut = product.stock <= 0;
              const isLow = product.stock > 0 && product.stock <= product.lowStockThreshold;

              return (
                <article
                  key={product.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E5E3] bg-white transition-all duration-150 hover:border-[#141413] hover:shadow-xs"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => openProductModal(product)}
                      className="relative block w-full text-left"
                    >
                      <ProductIllustration
                        preset={product.visualPreset}
                        imageUrl={product.imageUrl}
                        alt={title}
                        className="aspect-[4/3] w-full border-b border-[#E5E5E3]"
                      />
                      {(isOut || isLow) && (
                        <span
                          className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                            isOut ? 'bg-[#141413]' : 'bg-[#DC2626]'
                          }`}
                        >
                          {isOut
                            ? lang === 'fr'
                              ? 'Rupture'
                              : 'Sold out'
                            : lang === 'fr'
                            ? `${product.stock} restants`
                            : `${product.stock} left`}
                        </span>
                      )}
                    </button>

                    <div className="p-3 pb-2 space-y-1">
                      <p className="truncate text-[11px] font-medium text-[#6B6B68]">
                        {getCategoryLabel(product.category, lang)}
                      </p>

                      <button
                        type="button"
                        onClick={() => openProductModal(product)}
                        className="block w-full text-left"
                      >
                        <h3 className="line-clamp-2 min-h-[2.25rem] font-display text-xs sm:text-sm font-semibold text-[#141413] group-hover:text-[#DC2626] transition-colors">
                          {title}
                        </h3>
                      </button>

                      <div className="flex flex-wrap items-baseline gap-1.5 pt-0.5">
                        <span className="font-mono text-sm sm:text-base font-bold tabular-nums text-[#141413]">
                          {formatPrice(product.priceGmd, currency)}
                        </span>
                        {product.compareAtGmd && product.compareAtGmd > product.priceGmd && (
                          <span className="font-mono text-[11px] tabular-nums text-[#6B6B68] line-through">
                            {formatPrice(product.compareAtGmd, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3 pt-1">
                    <button
                      type="button"
                      disabled={isOut}
                      onClick={() => onAddToCart(product, 1)}
                      className="w-full min-h-[36px] rounded-lg bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:bg-[#E5E5E3] disabled:text-[#6B6B68]"
                    >
                      {isOut
                        ? lang === 'fr'
                          ? 'Indisponible'
                          : 'Unavailable'
                        : lang === 'fr'
                        ? 'Ajouter'
                        : 'Add'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Product Detail Modal (Full description lives cleanly inside modal only) */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-title"
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#E5E5E3] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              aria-label="Fermer"
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E3] bg-white text-[#141413] hover:bg-[#F8F8F7]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <ProductIllustration
                preset={selectedProduct.visualPreset}
                imageUrl={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="aspect-[4/3] md:aspect-auto md:h-full min-h-[260px]"
              />

              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <p className="text-xs text-[#6B6B68]">
                    {getCategoryLabel(selectedProduct.category, lang)} · {selectedProduct.sku}
                  </p>
                  <h3 id="pdp-title" className="mt-2 font-display text-2xl font-bold text-[#141413]">
                    {lang === 'fr' ? selectedProduct.name : selectedProduct.nameEn}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-mono text-2xl font-semibold tabular-nums text-[#141413]">
                      {formatPrice(selectedProduct.priceGmd, currency)}
                    </span>
                    {currency !== 'GMD' && (
                      <span className="font-mono text-xs tabular-nums text-[#6B6B68]">
                        ({formatPrice(selectedProduct.priceGmd, 'GMD')})
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#6B6B68]">
                    {lang === 'fr' ? selectedProduct.description : selectedProduct.descriptionEn}
                  </p>

                  <div className="mt-5 border-t border-[#E5E5E3] pt-4 text-xs text-[#6B6B68] space-y-1">
                    <p>
                      {lang === 'fr' ? 'Disponibilité' : 'Availability'} :{' '}
                      <span className="font-semibold text-[#141413] tabular-nums">
                        {selectedProduct.stock} {lang === 'fr' ? 'en stock' : 'in stock'}
                      </span>
                    </p>
                    <p>
                      {lang === 'fr'
                        ? 'Paiements : Wave, QMoney, AfriMoney, Visa/MC, Espèces'
                        : 'Payments: Wave, QMoney, AfriMoney, Visa/MC, COD'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-[#E5E5E3]">
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                      aria-label="Diminuer la quantité"
                      className="inline-flex h-11 w-10 items-center justify-center text-[#141413] hover:bg-[#F8F8F7]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm font-medium tabular-nums">
                      {modalQty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setModalQty((q) => Math.min(selectedProduct.stock || 1, q + 1))
                      }
                      aria-label="Augmenter la quantité"
                      className="inline-flex h-11 w-10 items-center justify-center text-[#141413] hover:bg-[#F8F8F7]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={selectedProduct.stock <= 0}
                    onClick={() => {
                      onAddToCart(selectedProduct, modalQty);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 min-h-[44px] rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
                  >
                    {lang === 'fr' ? 'Ajouter au panier' : 'Add to bag'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
