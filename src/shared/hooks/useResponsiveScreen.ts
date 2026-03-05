'use client'

import React from 'react'

export const useResponsiveScreen = () => {
  const [screenSize, setScreenSize] = React.useState('lg')
  const [windowWidth, setWindowWidth] = React.useState(1024)
  const [isTouch, setIsTouch] = React.useState(false)

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setWindowWidth(width)

      if (width <= 375) setScreenSize('xs')
      else if (width <= 480) setScreenSize('xs')
      else if (width <= 768) setScreenSize('sm')
      else if (width <= 1024) setScreenSize('md')
      else if (width <= 1280) setScreenSize('lg')
      else setScreenSize('xl')
    }

    handleResize()
    setIsTouch('ontouchstart' in window)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    screenSize,
    windowWidth,
    isMobile: windowWidth <= 768,
    isSmallMobile: windowWidth <= 375,
    isTablet: windowWidth > 768 && windowWidth <= 1024,
    isTouch
  }
}
