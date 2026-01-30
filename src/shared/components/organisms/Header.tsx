'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, X, ChevronLeft, Menu, Camera, LogOut, User, Settings } from 'lucide-react';
import { HeaderProps, SearchOption } from '@/shared/types';
import { cn, focusRings } from '@/shared/lib';
import { Button, Input, Avatar, Typography } from '@/shared/components/atoms';
import { Card, CardContent } from '@/shared/components/molecules';
import { useUserProfile, useSupabaseAuth, useNotifications } from '@/shared/hooks';

// Definição de breakpoints ultra responsivos
const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

/**
 * Hook para detectar tamanho da tela
 */
const useResponsiveScreen = () => {
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.lg
  );
  const [screenSize, setScreenSize] = React.useState(() => {
    if (typeof window === 'undefined') return 'lg';
    const width = window.innerWidth;
    if (width < BREAKPOINTS.sm) return 'xs';
    if (width < BREAKPOINTS.md) return 'sm';
    if (width < BREAKPOINTS.lg) return 'md';
    if (width < BREAKPOINTS.xl) return 'lg';
    if (width < BREAKPOINTS.xxl) return 'xl';
    return 'xxl';
  });

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      
      if (width < BREAKPOINTS.sm) setScreenSize('xs');
      else if (width < BREAKPOINTS.md) setScreenSize('sm');
      else if (width < BREAKPOINTS.lg) setScreenSize('md');
      else if (width < BREAKPOINTS.xl) setScreenSize('lg');
      else if (width < BREAKPOINTS.xxl) setScreenSize('xl');
      else setScreenSize('xxl');
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { 
    screenSize,
    windowWidth, 
    isMobile: windowWidth < BREAKPOINTS.md,
    isSmallMobile: windowWidth <= 375,
    isTouch: typeof window !== 'undefined' && 'ontouchstart' in window
  };
};

/**
 * Configurações ultra responsivas
 */
const getResponsiveConfig = (screenSize: string, isSmallMobile: boolean, isTouch: boolean) => ({
  headerHeight: isSmallMobile ? 'h-12' :
               screenSize === 'xs' ? 'h-14' :
               screenSize === 'sm' ? 'h-15' :
               'h-16',

  containerPadding: isSmallMobile ? 'px-2 py-1' :
                   screenSize === 'xs' ? 'px-3 py-1.5' :
                   screenSize === 'sm' ? 'px-4 py-2' :
                   'px-4 py-2',

  mainGap: isSmallMobile ? 'gap-1.5' :
          screenSize === 'xs' ? 'gap-2' :
          screenSize === 'sm' ? 'gap-3' :
          'gap-4',

  rightSideGap: isSmallMobile ? 'gap-1' :
               screenSize === 'xs' ? 'gap-1.5' :
               screenSize === 'sm' ? 'gap-2' :
               'gap-3',

  leftSideGap: isSmallMobile ? 'gap-1.5' :
               screenSize === 'xs' ? 'gap-2' :
               screenSize === 'sm' ? 'gap-3' :
               'gap-4',

  iconSize: isSmallMobile ? 16 : 
           screenSize === 'xs' ? 18 : 
           screenSize === 'sm' ? 20 : 
           24,

  toggleButtonSize: isSmallMobile ? 'h-8 w-8' :
                   screenSize === 'xs' ? 'h-9 w-9' :
                   screenSize === 'sm' ? 'h-10 w-10' :
                   'h-11 w-11',

  avatarSize: isSmallMobile ? 'h-8 w-8' :
             screenSize === 'xs' ? 'h-9 w-9' :
             screenSize === 'sm' ? 'h-10 w-10' :
             'h-10 w-10',

  titleSize: isSmallMobile ? 'text-sm' :
            screenSize === 'xs' ? 'text-base' :
            screenSize === 'sm' ? 'text-lg' :
            'text-xl',

  searchWidth: isSmallMobile ? '180px' :
              screenSize === 'xs' ? '200px' :
              screenSize === 'sm' ? '220px' :
              '250px',

  searchPadding: isSmallMobile ? 'px-3 py-1.5' :
                screenSize === 'xs' ? 'px-3 py-1.5' :
                'px-4 py-2',

  searchTextSize: isSmallMobile ? 'text-xs' :
                 screenSize === 'xs' ? 'text-xs' :
                 'text-sm',

  actionButtonPadding: isSmallMobile ? 'p-1.5' :
                      screenSize === 'xs' ? 'p-2' :
                      'p-2.5',

  touchArea: isTouch && isSmallMobile ? 'min-h-[44px] min-w-[44px]' :
            isTouch && screenSize === 'xs' ? 'min-h-[44px] min-w-[44px]' :
            '',

  badgeSize: isSmallMobile ? 'h-4 w-4 text-[10px]' :
            screenSize === 'xs' ? 'h-4 w-4 text-xs' :
            'h-5 w-5 text-xs',

  badgePosition: isSmallMobile ? '-top-0.5 -right-0.5' :
                '-top-1 -right-1',

  borderRadius: isSmallMobile ? 'rounded-2xl' :
               screenSize === 'xs' ? 'rounded-2xl' :
               'rounded-3xl',

  notificationWidth: isSmallMobile ? 'w-72' :
                    screenSize === 'xs' ? 'w-80' :
                    'w-80',

  notificationPadding: isSmallMobile ? 'p-2' :
                      'p-3',

  overflow: isSmallMobile ? 'max-h-60' :
           'max-h-80',

  leftPadding: isSmallMobile ? 'px-1' : 'px-2',
  rightPadding: isSmallMobile ? 'px-1' : '',
  wrapperClass: 'flex-nowrap',
});

/**
 * Animações baseadas no tamanho da tela
 */
const getResponsiveAnimations = (screenSize: string, isSmallMobile: boolean) => ({
  header: {
    initial: { opacity: 0, y: isSmallMobile ? -5 : -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: isSmallMobile ? 0.08 : 0.1 }
  },
  search: {
    open: (customConfig: { searchWidth: string }) => ({
      width: customConfig.searchWidth,
      opacity: 1,
      transition: { duration: isSmallMobile ? 0.1 : 0.15, ease: [0.32, 0.72, 0, 1] }
    }),
    closed: {
      width: 0,
      opacity: 0,
      transition: { duration: isSmallMobile ? 0.1 : 0.15, ease: [0.32, 0.72, 0, 1] }
    }
  },
  dropdown: {
    initial: { opacity: 0, y: isSmallMobile ? -3 : -5, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: isSmallMobile ? -3 : -5, scale: 0.98 },
    transition: { duration: isSmallMobile ? 0.08 : 0.1 }
  },
  title: {
    initial: { opacity: 0, x: isSmallMobile ? -5 : -10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: isSmallMobile ? 0.1 : 0.15, delay: 0.02 }
  },
  badge: {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: {
      type: 'spring',
      stiffness: isSmallMobile ? 500 : 400,
      damping: isSmallMobile ? 20 : 15,
    }
  }
});

/**
 * Cabeçalho principal do sistema ultra responsivo
 */
export const Header = ({
  toggleSidebar,
  isSidebarOpen,
  title = 'Dashboard',
}: HeaderProps) => {
  const router = useRouter();
  const { screenSize, isMobile, isSmallMobile, isTouch } = useResponsiveScreen();
  const { profile, isUploading, uploadAvatar } = useUserProfile();
  const { logout } = useSupabaseAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  
  const config = getResponsiveConfig(screenSize, isSmallMobile, isTouch);
  const animations = getResponsiveAnimations(screenSize, isSmallMobile);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchOptions: SearchOption[] = [
    { label: 'Dashboard', link: '/dashboard' },
    { label: 'Configurações', link: '/dashboard/settings' },
  ];

  const filteredOptions = searchOptions.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    if (searchOpen || showNotifications || showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchOpen, showNotifications, showProfileMenu]);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleAvatarClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
      setShowProfileMenu(false);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  return (
    <motion.header
      className={cn(
        'relative z-50 flex w-full items-center justify-between',
        config.headerHeight, config.containerPadding, config.mainGap,
        'bg-gradient-to-br from-[#0A101F]/95 to-[#111827]/95',
        'border border-white/8 hover:border-blue-500/20',
        isSmallMobile ? 'shadow-[0_0_15px_#00000035]' :
        screenSize === 'xs' ? 'shadow-[0_0_20px_#00000040]' :
        'shadow-[0_0_25px_#00000050]',
        'backdrop-blur-lg',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/3 before:via-purple-500/2 before:to-green-500/3 before:opacity-80',
        config.borderRadius,
        'transition-all duration-150 hover:shadow-[0_0_35px_#00000060]',
        'cursor-default will-change-transform'
      )}
      initial={animations.header.initial}
      animate={animations.header.animate}
      transition={animations.header.transition}
    >
      {/* Esquerda: Botão lateral + título */}
      <div className={cn(
        'flex items-center relative z-10',
        config.leftSideGap,
        config.leftPadding
      )}>
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className={cn(
            'rounded-full', config.toggleButtonSize, config.touchArea, 'text-white',
            'hover:bg-gradient-to-br hover:from-blue-500/15 hover:to-purple-500/10',
            'active:bg-gradient-to-br active:from-blue-600/20 active:to-purple-600/15',
            'transition-all duration-150',
            'hover:shadow-lg hover:shadow-blue-500/15',
            'border border-transparent hover:border-blue-500/20',
            'hover:scale-105 active:scale-95',
            focusRings.button
          )}
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? (
            <ChevronLeft size={config.iconSize} className="drop-shadow-lg" />
          ) : (
            <Menu size={config.iconSize} className="drop-shadow-lg" />
          )}
        </Button>
        
        <motion.div
          className={cn(
            'font-medium text-white',
            (isMobile && searchOpen) ? 'hidden' : 'block' 
          )}
          initial={animations.title.initial}
          animate={animations.title.animate}
          transition={animations.title.transition}
        >
          <Typography
            variant="large"
            className={cn(
              'font-bold', 'bg-clip-text text-transparent',
              'bg-gradient-to-r from-white via-blue-200 to-purple-200',
              'drop-shadow-sm', config.titleSize
            )}
          >
            {title}
          </Typography>
        </motion.div>
      </div>

      {/* Direita: Pesquisa, notificações e avatar */}
      <div className={cn(
        'flex items-center relative z-10',
        config.rightSideGap, config.rightPadding, config.wrapperClass
      )}>
        {/* Barra de pesquisa */}
        <div className="relative" ref={searchRef}>
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.div
                className="relative"
                custom={{ searchWidth: config.searchWidth }}
                initial={animations.search.closed}
                animate={animations.search.open(config)}
                exit={animations.search.closed}
              >
                <Input
                  placeholder={isSmallMobile ? "Buscar..." : "Pesquisar..."}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className={cn(
                    'w-full rounded-full text-white placeholder:text-gray-400',
                    config.searchPadding, config.searchTextSize,
                    'border-white/8 bg-gradient-to-r from-[#0A101F]/90 to-[#111827]/80',
                    'focus:border-blue-500/40 focus:bg-gradient-to-r focus:from-blue-900/15 focus:to-purple-900/10',
                    'shadow-inner shadow-black/20',
                    'transition-all duration-150'
                  )}
                  autoFocus
                />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className={cn(
                    'absolute rounded-full',
                    isSmallMobile ? 'top-0.5 right-0.5 h-6 w-6' : 'top-1 right-1 h-7 w-7',
                    'text-white',
                    'hover:bg-gradient-to-br hover:from-red-500/30 hover:to-red-600/20',
                    'active:bg-gradient-to-br active:from-red-600/40 active:to-red-700/30',
                    'transition-all duration-150', focusRings.button
                  )}
                  aria-label="Fechar pesquisa"
                >
                  <X size={isSmallMobile ? 12 : 16} />
                </Button>
                <AnimatePresence>
                  {searchQuery && filteredOptions.length > 0 && (
                    <motion.div
                      initial={animations.dropdown.initial}
                      animate={animations.dropdown.animate}
                      exit={animations.dropdown.exit}
                      transition={animations.dropdown.transition}
                      className="absolute top-full right-0 left-0 z-50 mt-1"
                    >
                      <Card className="bg-gradient-to-b from-[#1e293b]/95 to-[#111827]/95 backdrop-blur-xl border-[#424959]/50 shadow-xl shadow-black/20">
                        <CardContent className="p-0">
                          <ul className={cn('scrollbar-hide overflow-y-auto', config?.overflow || 'max-h-80')}>
                            {filteredOptions && filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
                              <motion.li
                                key={index}
                                className={cn(
                                  'border-b last:border-none text-[#9CA3AF] hover:text-white border-[#424959]/30',
                                  'cursor-pointer hover:bg-gradient-to-r hover:from-[#424959]/40 hover:to-[#1e293b]/30',
                                  'transition-all duration-150',
                                  isSmallMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
                                )}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.08, delay: index * 0.02 }}
                                onClick={() => {
                                  router.push(option.link);
                                  setSearchOpen(false);
                                  setSearchQuery('');
                                }}
                                whileHover={{ x: 3 }}
                              >
                                {option.label}
                              </motion.li>
                            )) : null}
                          </ul>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <Button
                onClick={() => setSearchOpen(true)}
                variant="ghost" size="icon"
                className={cn(
                  'rounded-full', config.actionButtonPadding, config.touchArea, 'text-white',
                  'hover:bg-gradient-to-br hover:from-blue-500/15 hover:to-blue-600/10',
                  'active:bg-gradient-to-br active:from-blue-600/20 active:to-blue-700/15',
                  'hover:shadow-lg hover:shadow-blue-500/15',
                  'transition-all duration-150',
                  'border border-transparent hover:border-blue-500/20',
                  'hover:scale-105 active:scale-95', focusRings.button
                )}
                aria-label="Abrir pesquisa"
              >
                <Search size={config.iconSize} className="drop-shadow-lg" />
              </Button>
            )}
          </AnimatePresence>
        </div>

        {/* Notificações */}
        <div className="relative" ref={notificationRef}>
          <Button
              onClick={handleNotificationClick}
              variant="ghost" size="icon"
              className={cn(
                'relative rounded-full', config.actionButtonPadding, config.touchArea, 'text-white',
                'hover:bg-gradient-to-br hover:from-green-500/15 hover:to-green-600/10',
                'active:bg-gradient-to-br active:from-green-600/20 active:to-green-700/15',
                'hover:shadow-lg hover:shadow-green-500/15', 'transition-all duration-150',
                'border border-transparent hover:border-green-500/20',
                'hover:scale-105 active:scale-95', focusRings.button
              )}
              aria-label="Ver notificações"
          >
            <Bell size={config.iconSize} className="drop-shadow-lg" />
            {unreadCount > 0 && (
              <motion.span
                className={cn(
                  'absolute flex items-center justify-center',
                  config.badgeSize, config.badgePosition,
                  'bg-gradient-to-br from-red-500/80 to-red-600/70 font-medium text-white',
                  'rounded-full shadow-lg shadow-red-500/20',
                  'border border-red-400/30'
                )}
                initial={animations.badge.initial}
                animate={animations.badge.animate}
                transition={animations.badge.transition}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </Button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={animations.dropdown.initial}
                animate={animations.dropdown.animate}
                exit={animations.dropdown.exit}
                transition={animations.dropdown.transition}
                className={cn('absolute top-full right-0 z-50 mt-2', config.notificationWidth)}
              >
                <Card className="bg-gradient-to-b from-[#1e293b]/98 via-[#424959]/95 to-[#111827]/98 backdrop-blur-xl border-amber-500/20 shadow-xl shadow-amber-500/10">
                  <div className={cn(
                      'border-b border-amber-500/20', config.notificationPadding,
                      'bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10'
                  )}>
                    <Typography variant="small" color="white" className="flex items-center font-medium">
                      <Bell className={cn('mr-2 text-amber-400', isSmallMobile ? 'h-3 w-3' : 'h-4 w-4')} />
                      Notificações
                    </Typography>
                  </div>
                    <CardContent className="p-0">
                    <div className={cn('scrollbar-hide overflow-y-auto', config?.overflow || 'max-h-80')}>
                      {notifications && notifications.length > 0 ? notifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          className={cn(
                            'cursor-pointer border-b', config.notificationPadding, 'border-[#424959]/30',
                            'hover:bg-gradient-to-r hover:from-[#424959]/30 hover:to-[#1e293b]/20',
                            'transition-all duration-150',
                            !notification.read && 'bg-blue-500/5'
                          )}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.08, delay: index * 0.02 }}
                          onClick={() => {
                            if (notification.link) {
                              router.push(notification.link);
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <Typography variant="small" color="white" className={cn('font-medium', isSmallMobile ? 'text-xs' : '')}>
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" className={cn(
                              isSmallMobile ? 'text-[10px]' : '',
                              notification.priority === 'high' ? 'text-red-400' : 'text-[#9CA3AF]'
                            )}>
                              {notification.time}
                            </Typography>
                          </div>
                          <Typography variant="caption" className={cn('mt-1 text-[#9CA3AF]/90 line-clamp-1', isSmallMobile ? 'text-[10px]' : '')}>
                            {notification.description}
                          </Typography>
                        </motion.div>
                      )) : (
                        <div className={cn('text-center py-6', config.notificationPadding)}>
                          <Typography variant="caption" className="text-[#9CA3AF]">
                            Nenhuma notificação no momento 🎉
                          </Typography>
                        </div>
                      )}
                    </div>
                    <div className={cn(
                        'text-center', isSmallMobile ? 'p-1.5' : 'p-2',
                        'border-t border-[#424959]/30 bg-gradient-to-r from-[#1e293b]/40 to-[#111827]/40'
                    )}>
                      <Button
                        variant="ghost" size="sm"
                        className={cn(
                          'text-blue-400 hover:text-blue-300 transition-all duration-150',
                          isSmallMobile ? 'text-xs' : ''
                        )}
                        onClick={() => { setShowNotifications(false); markAllAsRead(); }}
                      >
                        Marcar todas como lidas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar com Menu de Perfil */}
        <div className="relative" ref={profileRef}>
          {/* Input oculto para upload de foto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
          
          <div
            onClick={handleAvatarClick}
            className={cn(
              'cursor-pointer border-2 rounded-full', config.avatarSize, config.touchArea,
              'border-blue-400/20 bg-gradient-to-br from-[#0A101F]/90 to-[#111827]/90 p-0.5',
              'hover:border-blue-400/40',
              'transition-all duration-150 hover:shadow-lg hover:shadow-blue-500/20',
              'hover:scale-105',
              isUploading && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="h-full w-full rounded-full bg-gradient-to-br from-[#1e293b]/90 to-[#111827]/90 p-0.5 relative">
              <Avatar
                src={profile?.avatar_url || undefined}
                fallback={profile?.name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                className="object-cover h-full w-full"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Menu de Perfil */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={animations.dropdown.initial}
                animate={animations.dropdown.animate}
                exit={animations.dropdown.exit}
                transition={animations.dropdown.transition}
                className={cn('absolute top-full right-0 z-50 mt-2', isSmallMobile ? 'w-56' : 'w-64')}
              >
                <Card className="bg-gradient-to-b from-[#1e293b]/98 via-[#424959]/95 to-[#111827]/98 backdrop-blur-xl border-blue-500/20 shadow-xl shadow-blue-500/10 overflow-hidden">
                  {/* Cabeçalho do perfil */}
                  <div className={cn(
                    'border-b border-blue-500/20 p-4',
                    'bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar
                          src={profile?.avatar_url || undefined}
                          fallback={profile?.name?.charAt(0) || 'U'}
                          size="lg"
                          className="border-2 border-blue-400/30"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className={cn(
                            'absolute -bottom-1 -right-1 p-1.5 rounded-full',
                            'bg-blue-500 hover:bg-blue-400 text-white',
                            'transition-all duration-150',
                            'shadow-lg shadow-blue-500/30'
                          )}
                        >
                          <Camera size={12} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Typography variant="small" color="white" className="font-medium truncate">
                          {profile?.name || 'Usuário'}
                        </Typography>
                        <Typography variant="caption" className="text-[#9CA3AF] truncate block">
                          {profile?.email}
                        </Typography>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-0">
                    {/* Opções do menu */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                          'text-[#9CA3AF] hover:text-white',
                          'hover:bg-gradient-to-r hover:from-[#424959]/40 hover:to-[#1e293b]/30',
                          'transition-all duration-150'
                        )}
                      >
                        <Camera size={18} className="text-blue-400" />
                        <span className={cn(isSmallMobile ? 'text-xs' : 'text-sm')}>
                          {profile?.avatar_url ? 'Alterar foto' : 'Adicionar foto'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/dashboard/settings');
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                          'text-[#9CA3AF] hover:text-white',
                          'hover:bg-gradient-to-r hover:from-[#424959]/40 hover:to-[#1e293b]/30',
                          'transition-all duration-150'
                        )}
                      >
                        <Settings size={18} className="text-purple-400" />
                        <span className={cn(isSmallMobile ? 'text-xs' : 'text-sm')}>Configurações</span>
                      </button>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-[#424959]/30" />

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                          'text-red-400 hover:text-red-300',
                          'hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/5',
                          'transition-all duration-150'
                        )}
                      >
                        <LogOut size={18} />
                        <span className={cn(isSmallMobile ? 'text-xs' : 'text-sm')}>Sair da conta</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
};
