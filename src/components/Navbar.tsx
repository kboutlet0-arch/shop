import {
  Backpack,
  Footprints,
  Headphones,
  LayoutGrid,
  Menu,
  PackageSearch,
  Search,
  Shirt,
  ShoppingBag,
  User,
  Watch,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getCategoryLabel } from '../lib/format';
import type { CurrencyCode, Language, ProductCategory, UserProfile } from '../types/store';

export type ActiveTab = 'store' | 'track' | 'account';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  cartCount: number;
  onOpenCart: () => void;
  user: UserProfile | null;
  lang: Language;
  onChangeLang: (lang: Language) => void;
  currency: CurrencyCode;
  onChangeCurrency: (currency: CurrencyCode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: 'all' | ProductCategory;
  onSelectCategory: (cat: 'all' | ProductCategory) => void;
}

const CATEGORY_ITEMS: {
  id: 'all' | ProductCategory;
  icon: typeof LayoutGrid;
}[] = [
  { id: 'all', icon: LayoutGrid },
  { id: 'audio', icon: Headphones },
  { id: 'wearables', icon: Watch },
  { id: 'streetwear', icon: Shirt },
  { id: 'footwear', icon: Footprints },
  { id: 'accessories', icon: Backpack },
];

export function Navbar({
  activeTab,
  onSelectTab,
  cartCount,
  onOpenCart,
  user,
  lang,
  onChangeLang,
  currency,
  onChangeCurrency,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'store') {
      onSelectTab('store');
    }
    setMobileMenuOpen(false);
  };

  const handleCategoryClick = (cat: 'all' | ProductCategory) => {
    onSelectCategory(cat);
    if (activeTab !== 'store') {
      onSelectTab('store');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_#E5E5E3]">
      {/* Tier 1: Compact Utility Strip */}
      <div className="border-b border-[#E5E5E3] bg-[#F8F8F7]">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-3 sm:px-6 text-[11px] text-[#6B6B68]">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-[#DC2626]">KB-OUTLET</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {lang === 'fr' ? 'Livraison Gambie & Retrait Serrekunda' : 'Gambia Delivery & Serrekunda Pickup'}
            </span>
            <span className="hidden md:inline" aria-hidden="true">·</span>
            <span className="hidden md:inline font-mono tabular-nums text-[#141413]">+220 712 18 58</span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              aria-label="Devise"
              value={currency}
              onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent font-mono text-[11px] font-semibold text-[#141413] focus:outline-none cursor-pointer"
            >
              <option value="GMD">GMD (D)</option>
              <option value="XOF">XOF (CFA)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>

            <span className="text-[#E5E5E3]" aria-hidden="true">|</span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChangeLang('fr')}
                className={`px-1 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  lang === 'fr' ? 'bg-[#141413] text-white' : 'text-[#6B6B68] hover:text-[#141413]'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`px-1 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  lang === 'en' ? 'bg-[#141413] text-white' : 'text-[#6B6B68] hover:text-[#141413]'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Brand + Search Bar + User Actions */}
      <div className="border-b border-[#E5E5E3] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:gap-5">
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('store');
              onSelectCategory('all');
              onSearchChange('');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141413]"
          >
            <img
              src="/assets/aistudio/kb_57ec25c5.jpeg"
              alt="KB-OUTLET Logo"
              className="h-9 w-9 rounded-full object-cover border border-[#E5E5E3]"
            />
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#141413]">
              KB-OUTLET
            </span>
          </button>

          {/* Center Search Bar (Desktop & Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="order-3 w-full md:order-2 md:flex-1 md:max-w-2xl flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B68]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeTab !== 'store') onSelectTab('store');
                }}
                placeholder={
                  lang === 'fr'
                    ? 'Cherchez un produit, une catégorie ou SKU...'
                    : 'Search a product, category or SKU...'
                }
                className="h-10 w-full rounded-lg border border-[#E5E5E3] bg-[#F8F8F7] pl-10 pr-3 text-sm text-[#141413] placeholder:text-[#6B6B68] focus:border-[#DC2626] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#DC2626] px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 shadow-xs transition-colors hover:bg-[#B91C1C]"
            >
              {lang === 'fr' ? 'Rechercher' : 'Search'}
            </button>
          </form>

          {/* Right Action Links */}
          <div className="order-2 md:order-3 flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('track')}
              className={`hidden sm:inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'track'
                  ? 'bg-[#F8F8F7] text-[#DC2626]'
                  : 'text-[#141413] hover:bg-[#F8F8F7]'
              }`}
            >
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'fr' ? 'Suivi' : 'Track'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('account')}
              className={`hidden sm:inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'account'
                  ? 'bg-[#F8F8F7] text-[#DC2626]'
                  : 'text-[#141413] hover:bg-[#F8F8F7]'
              }`}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>
                {user
                  ? user.name.split(' ')[0]
                  : lang === 'fr'
                  ? 'Se connecter'
                  : 'Sign in'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#141413] px-3 sm:px-3.5 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#27272A]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">{lang === 'fr' ? 'Panier' : 'Bag'}</span>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1.5 font-mono text-[11px] font-bold tabular-nums text-white">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E3] text-[#141413] sm:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Secondary Quick Nav Drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-[#E5E5E3] bg-white px-3 py-2.5 sm:hidden">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('store');
                  setMobileMenuOpen(false);
                }}
                className={`h-10 rounded-lg text-xs font-semibold ${
                  activeTab === 'store' ? 'bg-[#141413] text-white' : 'bg-[#F8F8F7] text-[#141413]'
                }`}
              >
                {lang === 'fr' ? 'Boutique' : 'Store'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('track');
                  setMobileMenuOpen(false);
                }}
                className={`h-10 rounded-lg text-xs font-semibold ${
                  activeTab === 'track' ? 'bg-[#141413] text-white' : 'bg-[#F8F8F7] text-[#141413]'
                }`}
              >
                {lang === 'fr' ? 'Suivi' : 'Track'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('account');
                  setMobileMenuOpen(false);
                }}
                className={`h-10 rounded-lg text-xs font-semibold ${
                  activeTab === 'account' ? 'bg-[#141413] text-white' : 'bg-[#F8F8F7] text-[#141413]'
                }`}
              >
                {user ? user.name.split(' ')[0] : lang === 'fr' ? 'Compte' : 'Account'}
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Tier 3: Horizontal Scrollable Category Icon Strip */}
      <div className="border-b border-[#E5E5E3] bg-white">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-2">
            {CATEGORY_ITEMS.map(({ id, icon: Icon }) => {
              const isActive = activeTab === 'store' && selectedCategory === id;
              const label =
                id === 'all'
                  ? lang === 'fr'
                    ? 'Tout voir'
                    : 'All'
                  : getCategoryLabel(id, lang);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCategoryClick(id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#141413] text-white'
                      : 'text-[#6B6B68] hover:bg-[#F8F8F7] hover:text-[#141413]'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#F87171]' : ''}`} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
