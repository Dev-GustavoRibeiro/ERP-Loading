'use client';

import React, { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
  LogOut,
} from 'lucide-react';
import { useSupabaseAuth } from '@/shared/hooks/useSupabaseAuth';
import { SidebarProps } from '@/shared/types';
import { cn } from '@/shared/lib';

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

const getLogoVariants = (screenSize: string) => ({
  open: {
    width: screenSize === 'xs' ? 120 : 
           screenSize === 'sm' ? 140 : 160,
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  closed: {
    width: screenSize === 'xs' ? 24 : 
           screenSize === 'sm' ? 28 : 32,
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94],
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
 * Hook para detectar tamanho da tela
 */
const useResponsiveScreen = () => {
  const [screenSize, setScreenSize] = React.useState('lg');
  const [windowWidth, setWindowWidth] = React.useState(1024);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      
      if (width <= 375) setScreenSize('xs');
      else if (width <= 480) setScreenSize('xs');
      else if (width <= 768) setScreenSize('sm');
      else if (width <= 1024) setScreenSize('md');
      else if (width <= 1280) setScreenSize('lg');
      else setScreenSize('xl');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { 
    screenSize, 
    windowWidth, 
    isMobile: windowWidth <= 768,
    isSmallMobile: windowWidth <= 375 
  };
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

  const sidebarVariants = getSidebarVariants(screenSize);
  const itemVariants = getItemVariants();
  const logoVariants = getLogoVariants(screenSize);

  const navigate = (href: string) => {
    router.push(href);
    if (isMobile) closeSidebar();
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
        { title: 'Dashboard', icon: <LayoutDashboard size={iconSize} />, link: '/dashboard', color: 'blue' },
      ],
    },
    {
      section: 'SISTEMA',
      items: [
        { title: 'Configurações', icon: <Settings size={iconSize} />, link: '/dashboard/settings', color: 'slate' },
      ],
    },
  ];

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
      }
    };
    
    return colorMap[color] || colorMap.blue;
  };

  const renderNavItem = (item: { title: string; icon: React.ReactNode; link: string; color: string }) => {
    const active = pathname === item.link || pathname.startsWith(item.link + '/');
    const colors = getItemColors(item.color, active);

    return (
      <li key={item.title}>
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
          className={cn(spacing.itemMargin)}
        >
          <div
            className={cn(
              'flex cursor-pointer items-center',
              isSmallMobile ? 'rounded-lg' : 'rounded-xl',
              spacing.itemPadding,
              active
                ? `bg-gradient-to-r ${colors.bg} text-white ${colors.shadow}`
                : `text-[#9CA3AF] bg-gradient-to-r ${colors.hover} hover:text-white ${colors.shadow}`,
              'transition-all duration-150 ease-out'
            )}
            onClick={() => navigate(item.link)}
          >
            <div
              className={cn(
                colors.icon,
                'transition-all duration-150 ease-out flex-shrink-0'
              )}
            >
              {item.icon}
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
    logout();
    closeSidebar();
  };

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

      {/* Menu */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto relative z-10 scrollbar-none',
          spacing.menuPadding
        )}
        style={scrollbarHideStyles}
      >
        <nav>
          {menuItems && menuItems.length > 0 ? menuItems.map((section) => (
            <div key={section.section} className={cn(spacing.sectionMargin)}>
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
            </div>
          )) : null}
        </nav>
      </div>

      {/* Logout */}
      <div className={cn(
        'border-t relative z-10 border-white/5',
        spacing.logoutPadding
      )}>
        <motion.button
          onClick={handleLogout}
          whileHover={{ 
            scale: 1.01,
            transition: { duration: 0.1 }
          }}
          whileTap={{ 
            scale: 0.99,
            transition: { duration: 0.05 }
          }}
          className={cn(
            'flex w-full items-center',
            isSmallMobile ? 'rounded-lg' : 'rounded-xl',
            spacing.itemPadding,
            'text-red-400 hover:bg-gradient-to-r hover:from-red-500/12 hover:to-red-600/10',
            'hover:text-red-300 hover:shadow-lg hover:shadow-red-500/20',
            'transition-all duration-150 ease-out'
          )}
        >
          <LogOut size={iconSize} className="flex-shrink-0" />
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.span 
                key="logout-text"
                variants={itemVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className={cn(
                  'font-medium',
                  isSmallMobile ? 'text-xs' :
                  screenSize === 'xs' ? 'text-xs' :
                  'text-sm'
                )}
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
};
