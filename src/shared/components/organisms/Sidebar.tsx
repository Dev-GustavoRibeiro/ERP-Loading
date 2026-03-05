'use client';

import React, { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Building2,
  Users,
  ShoppingCart,
  TrendingUp,
  FileText,
  DollarSign,
  Wrench,
  Receipt,
  Warehouse,
  Menu,
  Bell,
  Camera
} from 'lucide-react';
import { useSupabaseAuth } from '@/shared/hooks/useSupabaseAuth';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { SidebarProps } from '@/shared/types';
import { cn } from '@/shared/lib';
import { EmpresaSelector } from './EmpresaSelector';
import { useResponsiveScreen } from '@/shared/hooks/useResponsiveScreen';
import { useAllowedModules } from '@/shared/hooks/useAllowedModules';

// Definição de breakpoints
const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

/**
 * Animações da sidebar
 */
const getSidebarVariants = (screenSize: string) => ({
  open: {
    width: screenSize === 'xs' ? 240 :
      screenSize === 'sm' ? 250 :
        screenSize === 'md' ? 260 : 260,
    transition: {
      type: 'tween',
      duration: 0.12,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  closed: {
    width: screenSize === 'xs' ? 60 :
      screenSize === 'sm' ? 65 : 70,
    transition: {
      type: 'tween',
      duration: 0.12,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
});

const getItemVariants = () => ({
  open: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.08,
      delay: 0.02,
    },
  },
  closed: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.06,
    },
  },
});

const sidebarStyle: CSSProperties = {
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  willChange: 'width',
  isolation: 'isolate',
  transform: 'translateZ(0)',
};

const scrollbarHideStyles: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  WebkitOverflowScrolling: 'touch',
};

/**
 * Componente da Sidebar
 */
export const Sidebar = ({ isOpen, closeSidebar }: SidebarProps) => {
  const { logout } = useSupabaseAuth();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { screenSize, isMobile, isSmallMobile } = useResponsiveScreen();
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const { allowedModules, isLoading: isLoadingModules } = useAllowedModules();

  // Mobile header state & hooks
  const { profile, isUploading, uploadAvatar } = useUserProfile();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [showMobileNotifications, setShowMobileNotifications] = React.useState(false);
  const [showMobileProfile, setShowMobileProfile] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
      setShowMobileProfile(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fecha todos os painéis móveis
  const closeMobilePanels = () => {
    setShowMobileNotifications(false);
    setShowMobileProfile(false);
    setActiveSection(null);
  };

  const sidebarVariants = getSidebarVariants(screenSize);
  const itemVariants = getItemVariants();

  const navigate = (href: string) => {
    router.push(href);
    if (isMobile) {
      closeSidebar();
      setActiveSection(null);
    }
  };

  const getIconSize = () => {
    if (isSmallMobile) return 16;
    if (screenSize === 'xs') return 18;
    if (screenSize === 'sm') return 20;
    return 22;
  };

  const getSpacing = () => ({
    containerPadding: isSmallMobile ? 'top-0.5 bottom-0.5 left-0.5 right-0.5' :
      screenSize === 'xs' ? 'top-1 bottom-1 left-1 right-1' :
        screenSize === 'sm' ? 'top-1.5 bottom-1.5 left-1.5 right-1.5' :
          'top-2 bottom-2 left-2 right-2',

    logoPadding: isSmallMobile ? 'p-1.5' :
      screenSize === 'xs' ? 'p-2' :
        isOpen ? 'p-3' : 'p-2',

    menuPadding: isSmallMobile ? 'px-1 py-1' :
      screenSize === 'xs' ? 'px-1.5 py-1.5' :
        screenSize === 'sm' ? 'px-2 py-2' :
          'px-3 py-2',

    itemPadding: isSmallMobile ? 'px-1.5 py-1 gap-2' :
      screenSize === 'xs' ? 'px-2 py-1.5 gap-2' :
        screenSize === 'sm' ? 'px-2.5 py-2 gap-2.5' :
          'px-3 py-2 gap-3',

    sectionMargin: isSmallMobile ? 'mb-1' :
      screenSize === 'xs' ? 'mb-1.5' :
        'mb-3',

    itemMargin: isSmallMobile ? 'mb-0.5' :
      screenSize === 'xs' ? 'mb-0.5' :
        'mb-1',

    itemSpacing: isSmallMobile ? 'space-y-0.5' :
      'space-y-0.5',

    logoutPadding: isSmallMobile ? 'px-1 pt-1 pb-1' :
      screenSize === 'xs' ? 'px-1.5 pt-1.5 pb-1.5' :
        screenSize === 'sm' ? 'px-2 pt-2 pb-2' :
          'px-3 pt-2 pb-2',
  });

  const spacing = getSpacing();
  const iconSize = getIconSize();

  const menuItems = [
    {
      section: 'PRINCIPAL',
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, link: '/dashboard', color: 'blue', key: 'dashboard' },
      ],
    },
    {
      section: 'GESTÃO',
      items: [
        { title: 'Clientes', icon: Users, link: '/dashboard/clientes', color: 'purple', key: 'clientes' },
        { title: 'Financeiro', icon: DollarSign, link: '/dashboard/financeiro', color: 'emerald', key: 'financeiro' },
        { title: 'Inventário', icon: Warehouse, link: '/dashboard/inventario', color: 'violet', key: 'inventario' },
        { title: 'Vendas', icon: ShoppingCart, link: '/dashboard/vendas', color: 'orange', key: 'vendas' },
      ],
    },
    {
      section: 'OPERAÇÕES',
      items: [
        { title: 'CRM', icon: TrendingUp, link: '/dashboard/crm', color: 'blue', key: 'crm' },

        { title: 'Nota Fiscal', icon: FileText, link: '/dashboard/fiscal', color: 'emerald', key: 'fiscal' },
        { title: 'Ordem de Serviço', icon: Wrench, link: '/dashboard/os', color: 'cyan', key: 'os' },
        { title: 'RH', icon: Users, link: '/dashboard/rh', color: 'pink', key: 'rh' },
      ],
    },
    {
      section: 'SISTEMA',
      items: [
        { title: 'Relatórios', icon: FileText, link: '/dashboard/relatorios', color: 'indigo', key: 'relatorios' },
        { title: 'Configurações', icon: Settings, link: '/dashboard/settings', color: 'slate', key: 'settings' },
      ],
    },
  ];

  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item =>
      // If loading, show nothing (or skeleton). If loaded, check key.
      // We'll allow 'dashboard' even if not explicitly in list if list is empty, 
      // but better to rely on what is returned.
      // For now, if allowedModules is empty and not loading, it means NO access.
      allowedModules.includes(item.key)
    )
  })).filter(section => section.items.length > 0);

  const getItemColors = (color: string, active: boolean) => {
    const colorMap: Record<string, { bg: string; hover: string; icon: string; shadow: string }> = {
      blue: {
        bg: active ? 'from-blue-500/20 to-blue-600/15' : '',
        hover: 'hover:from-blue-500/12 hover:to-blue-600/10',
        icon: active ? 'text-blue-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-blue-500/25' : 'hover:shadow-md hover:shadow-blue-500/20'
      },
      purple: {
        bg: active ? 'from-purple-500/20 to-purple-600/15' : '',
        hover: 'hover:from-purple-500/12 hover:to-purple-600/10',
        icon: active ? 'text-purple-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-purple-500/25' : 'hover:shadow-md hover:shadow-purple-500/20'
      },
      emerald: {
        bg: active ? 'from-emerald-500/20 to-emerald-600/15' : '',
        hover: 'hover:from-emerald-500/12 hover:to-emerald-600/10',
        icon: active ? 'text-emerald-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-emerald-500/25' : 'hover:shadow-md hover:shadow-emerald-500/20'
      },
      amber: {
        bg: active ? 'from-amber-500/20 to-amber-600/15' : '',
        hover: 'hover:from-amber-500/12 hover:to-amber-600/10',
        icon: active ? 'text-amber-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-amber-500/25' : 'hover:shadow-md hover:shadow-amber-500/20'
      },
      indigo: {
        bg: active ? 'from-indigo-500/20 to-indigo-600/15' : '',
        hover: 'hover:from-indigo-500/12 hover:to-indigo-600/10',
        icon: active ? 'text-indigo-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-indigo-500/25' : 'hover:shadow-md hover:shadow-indigo-500/20'
      },
      slate: {
        bg: active ? 'from-slate-500/20 to-slate-600/15' : '',
        hover: 'hover:from-slate-500/12 hover:to-slate-600/10',
        icon: active ? 'text-slate-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-slate-500/25' : 'hover:shadow-md hover:shadow-slate-500/20'
      },
      violet: {
        bg: active ? 'from-violet-500/20 to-violet-600/15' : '',
        hover: 'hover:from-violet-500/12 hover:to-violet-600/10',
        icon: active ? 'text-violet-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-violet-500/25' : 'hover:shadow-md hover:shadow-violet-500/20'
      },
      orange: {
        bg: active ? 'from-orange-500/20 to-orange-600/15' : '',
        hover: 'hover:from-orange-500/12 hover:to-orange-600/10',
        icon: active ? 'text-orange-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-orange-500/25' : 'hover:shadow-md hover:shadow-orange-500/20'
      },
      pink: {
        bg: active ? 'from-pink-500/20 to-pink-600/15' : '',
        hover: 'hover:from-pink-500/12 hover:to-pink-600/10',
        icon: active ? 'text-pink-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-pink-500/25' : 'hover:shadow-md hover:shadow-pink-500/20'
      },
      teal: {
        bg: active ? 'from-teal-500/20 to-teal-600/15' : '',
        hover: 'hover:from-teal-500/12 hover:to-teal-600/10',
        icon: active ? 'text-teal-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-teal-500/25' : 'hover:shadow-md hover:shadow-teal-500/20'
      },
      cyan: {
        bg: active ? 'from-cyan-500/20 to-cyan-600/15' : '',
        hover: 'hover:from-cyan-500/12 hover:to-cyan-600/10',
        icon: active ? 'text-cyan-400' : 'text-current',
        shadow: active ? 'shadow-lg shadow-cyan-500/25' : 'hover:shadow-md hover:shadow-cyan-500/20'
      }
    };

    return colorMap[color] || colorMap.blue;
  };

  const renderNavItem = (item: { title: string; icon: any; link: string; color: string }) => {
    const active = pathname === item.link || pathname.startsWith(item.link + '/');
    const colors = getItemColors(item.color, active);
    const Icon = item.icon;

    return (
      <li key={item.title} className={cn(!isOpen && 'flex justify-center')}>
        <motion.div
          whileHover={{
            scale: 1.01,
            x: 1,
            transition: { duration: 0.1 }
          }}
          whileTap={{
            scale: 0.99,
            transition: { duration: 0.05 }
          }}
          data-active={active ? 'true' : 'false'}
          className={cn(spacing.itemMargin, !isOpen && 'w-fit flex-shrink-0')}
        >
          <div
            className={cn(
              'flex cursor-pointer items-center',
              isOpen
                ? cn(isSmallMobile ? 'rounded-lg' : 'rounded-xl', spacing.itemPadding)
                : 'rounded-full size-10 justify-center shrink-0 aspect-square',
              active
                ? `bg-gradient-to-r ${colors.bg} text-white ${colors.shadow}`
                : `text-[#9CA3AF] bg-gradient-to-r ${colors.hover} hover:text-white ${colors.shadow}`,
              'transition-all duration-150 ease-out'
            )}
            onClick={() => navigate(item.link)}
            title={!isOpen ? item.title : undefined}
          >
            <div
              className={cn(
                colors.icon,
                'transition-all duration-150 ease-out flex-shrink-0',
                'flex items-center justify-center',
                !isOpen && 'min-w-[24px] min-h-[24px]'
              )}
            >
              <Icon size={iconSize} strokeWidth={1.5} />
            </div>
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.span
                  key="nav-text"
                  variants={itemVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className={cn(
                    'overflow-hidden font-medium whitespace-nowrap',
                    isSmallMobile ? 'text-xs' :
                      screenSize === 'xs' ? 'text-xs' :
                        screenSize === 'sm' ? 'text-sm' :
                          'text-sm'
                  )}
                >
                  {item.title}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </li>
    );
  };

  const handleLogout = async () => {
    closeMobilePanels();
    logout();
    if (isMobile) closeSidebar();
  };

  // --- Mobile Navbar (Bottom Navigation) ---
  if (isMobile) {
    const activeSectionData = filteredMenuItems.find(s => s.section === activeSection);

    // Helper to get icon for a section
    const getSectionIcon = (sectionName: string) => {
      switch (sectionName) {
        case 'PRINCIPAL': return LayoutDashboard;
        case 'GESTÃO': return Building2;
        case 'OPERAÇÕES': return Wrench;
        case 'SISTEMA': return Settings;
        default: return Menu;
      }
    };

    return (
      <>
        {/* Hidden file input for avatar upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />

        {/* PWA Mobile Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50",
            "bg-[#0A101F]/95 backdrop-blur-xl",
            "border-b border-white/[0.06]",
            "shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
            "safe-area-top"
          )}
        >
          <div className="flex items-center justify-between h-14 px-4">
            {/* Left: Logo + Empresa */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
              <Link href="/dashboard" className="flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain brightness-110" />
              </Link>
              <div className="w-px h-5 bg-white/10 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <EmpresaSelector isOpen={true} isMobile={true} className="w-full" />
              </div>
            </div>

            {/* Right: Notifications + Avatar */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Notification Bell */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setShowMobileNotifications(!showMobileNotifications);
                  setShowMobileProfile(false);
                  setActiveSection(null);
                }}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-10 h-10 rounded-full",
                  "bg-white/[0.06] active:bg-white/[0.12]",
                  "transition-colors duration-150"
                )}
              >
                <Bell size={18} className="text-slate-300" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className={cn(
                      "absolute -top-0.5 -right-0.5",
                      "flex items-center justify-center",
                      "h-[18px] min-w-[18px] px-1",
                      "bg-red-500 text-white text-[10px] font-bold",
                      "rounded-full shadow-lg shadow-red-500/30"
                    )}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* User Avatar */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setShowMobileProfile(!showMobileProfile);
                  setShowMobileNotifications(false);
                  setActiveSection(null);
                }}
                className={cn(
                  "relative w-9 h-9 rounded-full overflow-hidden",
                  "border-2 border-blue-400/20",
                  "bg-gradient-to-br from-blue-500/20 to-purple-500/20",
                  isUploading && "opacity-50 pointer-events-none"
                )}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm font-bold text-blue-400">
                    {profile?.name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Notification Bottom Sheet */}
        <AnimatePresence>
          {showMobileNotifications && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileNotifications(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0A101F] border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[70vh]"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-5 pb-3">
                  <h3 className="text-lg font-bold text-white">Notificações</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                        {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <button
                      onClick={() => setShowMobileNotifications(false)}
                      className="p-2 bg-white/5 rounded-full active:bg-white/10 transition-all text-slate-400"
                    >
                      <div className="w-4 h-4 flex items-center justify-center text-xs">✕</div>
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[55vh] px-4 pb-4 scrollbar-none">
                  {notifications.length > 0 ? (
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <motion.div
                          key={n.id}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "p-3.5 rounded-xl border transition-colors cursor-pointer",
                            !n.read
                              ? "bg-blue-500/[0.06] border-blue-500/10"
                              : "bg-white/[0.03] border-white/[0.05]"
                          )}
                          onClick={() => {
                            if (n.link) {
                              router.push(n.link);
                              setShowMobileNotifications(false);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-medium text-white">{n.title}</span>
                            <span className={cn(
                              "text-[10px] flex-shrink-0 mt-0.5",
                              n.priority === 'high' ? 'text-red-400' : 'text-slate-500'
                            )}>{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <Bell size={32} className="mx-auto text-slate-700 mb-3" />
                      <p className="text-sm text-slate-500">Nenhuma notificação</p>
                      <p className="text-xs text-slate-600 mt-1">Você está em dia!</p>
                    </div>
                  )}

                  {notifications.length > 0 && unreadCount > 0 && (
                    <button
                      className="w-full mt-4 py-2.5 text-sm text-blue-400 font-medium active:bg-white/[0.04] rounded-xl transition-colors"
                      onClick={() => { markAllAsRead(); setShowMobileNotifications(false); }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Profile Bottom Sheet */}
        <AnimatePresence>
          {showMobileProfile && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileProfile(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0A101F] border-t border-white/10 rounded-t-3xl shadow-2xl"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Profile Header */}
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        "h-16 w-16 rounded-2xl overflow-hidden",
                        "border-2 border-blue-400/20",
                        "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                      )}>
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-blue-400">
                            {profile?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
                      >
                        <Camera size={12} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-white truncate">{profile?.name || 'Usuário'}</p>
                      <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Options */}
                <div className="px-4 pb-2 space-y-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-slate-300 active:bg-white/[0.06] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Camera size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{profile?.avatar_url ? 'Alterar foto' : 'Adicionar foto'}</span>
                      <p className="text-[11px] text-slate-500">Personalize seu perfil</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileProfile(false);
                      router.push('/dashboard/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-slate-300 active:bg-white/[0.06] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Settings size={18} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Configurações</span>
                      <p className="text-[11px] text-slate-500">Preferências e conta</p>
                    </div>
                  </button>

                  <div className="pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-red-400 active:bg-red-500/[0.06] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <LogOut size={18} className="text-red-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Sair da conta</span>
                        <p className="text-[11px] text-slate-500">Encerrar sessão</p>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Section Bottom Sheet Modal */}
        <AnimatePresence>
          {activeSection && activeSectionData && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveSection(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0A101F] border-t border-white/10 rounded-t-3xl p-6 shadow-2xl"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 32px)' }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white tracking-tight">{activeSectionData.section}</h3>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-white"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">✕</div>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {activeSectionData.items.map((item) => {
                    const active = pathname === item.link;
                    const Icon = item.icon;
                    const colors = getItemColors(item.color, true);

                    return (
                      <motion.div
                        key={item.title}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(item.link)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer h-24",
                          active
                            ? `bg-gradient-to-br ${colors.bg} border-white/20 shadow-lg`
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        <div className={cn("mb-2 p-1.5 rounded-lg bg-black/20", active ? colors.icon : "text-white/80")}>
                          <Icon size={20} />
                        </div>
                        <span className={cn("text-[10px] font-medium text-center leading-tight", active ? "text-white" : "text-slate-300")}>
                          {item.title}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Fixed Bottom Navigation Bar */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-[#0A101F]/95 backdrop-blur-xl border-t border-white/[0.06] z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="h-[68px] flex items-center justify-around px-2">
            {filteredMenuItems.map((section) => {
              const SectionIcon = getSectionIcon(section.section);
              const isSectionActive = section.items.some(item => pathname === item.link || pathname.startsWith(item.link + '/')) || activeSection === section.section;

              return (
                <motion.button
                  key={section.section}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowMobileNotifications(false);
                    setShowMobileProfile(false);
                    if (section.section === 'PRINCIPAL') {
                      router.push(section.items[0].link);
                      setActiveSection(null);
                    } else {
                      setActiveSection(section.section === activeSection ? null : section.section);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all relative",
                    isSectionActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-300",
                    isSectionActive && "bg-blue-500/10 -translate-y-1"
                  )}>
                    <SectionIcon size={24} strokeWidth={isSectionActive ? 2.5 : 2} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium mt-1 transition-all duration-300",
                    isSectionActive ? "text-blue-400" : "text-slate-500"
                  )}>
                    {section.section === 'PRINCIPAL' ? 'Início' :
                      section.section === 'SISTEMA' ? 'Ajustes' :
                        section.section.charAt(0) + section.section.slice(1).toLowerCase()}
                  </span>

                  {isSectionActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute -bottom-0.5 w-8 h-1 bg-blue-500 rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  )}
                </motion.button>
              )
            })}

            {/* Logout Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
            >
              <div className="p-1.5">
                <LogOut size={24} />
              </div>
              <span className="text-[10px] font-medium mt-1 text-slate-500 transition-colors group-hover:text-red-400">
                Sair
              </span>
            </motion.button>
          </div>
        </div>
      </>
    );
  }

  // --- Desktop Sidebar ---
  return (
    <motion.div
      initial={false}
      animate={isOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden',
        'top-2 left-2 bottom-2',
        isSmallMobile ? 'rounded-2xl' : 'rounded-3xl',
        'bg-gradient-to-br from-[#0A101F]/95 to-[#111827]/95',
        'border border-white/5',
        isSmallMobile ? 'shadow-[0_0_15px_#00000035]' :
          screenSize === 'xs' ? 'shadow-[0_0_20px_#00000040]' :
            'shadow-[0_0_30px_#00000050]',
        'backdrop-blur-lg'
      )}
      style={sidebarStyle}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center justify-center border-b relative z-10',
          'border-white/5',
          isOpen ? 'p-4' : 'p-2',
          'bg-gradient-to-b from-blue-500/5 via-purple-500/3 to-transparent'
        )}
      >
        <Link href="/dashboard" onClick={closeSidebar} className="block">
          <motion.img
            src="/logo.png"
            alt="ZED Logo"
            initial={false}
            animate={{
              width: isOpen ? 140 : 40,
              height: isOpen ? 140 : 40,
            }}
            transition={{
              duration: 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className={cn(
              'object-contain',
              'brightness-110 drop-shadow-xl filter transition-all duration-200',
              'hover:brightness-125 hover:scale-105'
            )}
            style={{
              minWidth: isOpen ? 100 : 36,
              minHeight: isOpen ? 100 : 36,
            }}
          />
        </Link>
      </div>

      {/* Empresa Selector */}
      <EmpresaSelector isOpen={isOpen} />

      {/* Menu */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto relative z-10 scrollbar-none [&::-webkit-scrollbar]:hidden',
          spacing.menuPadding
        )}
        style={scrollbarHideStyles}
      >
        <nav className={cn(spacing.containerPadding)}>
          <ul className={cn("space-y-4", spacing.menuPadding)}>
            {filteredMenuItems.map((section) => (
              <li key={section.section} className={cn(spacing.sectionMargin)}>
                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.h3
                      key="section-header"
                      variants={itemVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                      className={cn(
                        'ml-1 tracking-wider uppercase font-semibold',
                        'bg-clip-text text-transparent bg-gradient-to-r',
                        'from-blue-400/90 via-purple-400/80 to-green-400/90',
                        isSmallMobile ? 'text-[10px] mb-1' :
                          screenSize === 'xs' ? 'text-xs mb-1' :
                            'text-xs mb-1.5'
                      )}
                    >
                      {section.section}
                    </motion.h3>
                  )}
                </AnimatePresence>
                <ul className={cn(spacing.itemSpacing)}>
                  {section.items && section.items.length > 0 ? section.items.map((item) => renderNavItem(item)) : null}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </div>

    </motion.div>
  );
};
