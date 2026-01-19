"use client"

import { motion, type Variants } from "framer-motion"
import { ReactNode, forwardRef, ComponentPropsWithoutRef } from "react"
import {
  Home, Settings, User, Mail, Bell, Search, Menu, X, ChevronDown, ChevronRight,
  Plus, Minus, Check, AlertTriangle, Info, HelpCircle, ExternalLink, Download,
  Upload, Share2, Copy, Trash2, Edit, Eye, EyeOff, Lock, Unlock, Star, Heart,
  Bookmark, MessageSquare, Send, Phone, Video, Image, File, Folder, Database,
  Server, Cloud, Wifi, Battery, Volume2, Play, Pause, SkipForward, SkipBack,
  RefreshCw, Loader2, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Zap, Shield,
  Activity, Terminal, Code, Bot, Sparkles, Globe, Map, Compass, Navigation,
  type LucideProps
} from "lucide-react"

// Animation variants for different icon effects
const hoverScale: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.15, transition: { type: "spring", stiffness: 400, damping: 10 } }
}

const hoverRotate: Variants = {
  initial: { rotate: 0 },
  hover: { rotate: 15, transition: { type: "spring", stiffness: 200, damping: 10 } }
}

const hoverBounce: Variants = {
  initial: { y: 0 },
  hover: { 
    y: [-2, 2, -2], 
    transition: { repeat: Infinity, duration: 0.6, ease: "easeInOut" } 
  }
}

const hoverPulse: Variants = {
  initial: { scale: 1, opacity: 1 },
  hover: { 
    scale: [1, 1.1, 1], 
    opacity: [1, 0.8, 1],
    transition: { repeat: Infinity, duration: 0.8 } 
  }
}

const hoverShake: Variants = {
  initial: { x: 0 },
  hover: { 
    x: [-2, 2, -2, 2, 0], 
    transition: { duration: 0.4 } 
  }
}

const hoverSpin: Variants = {
  initial: { rotate: 0 },
  hover: { rotate: 360, transition: { duration: 0.6, ease: "easeInOut" } }
}

const hoverWiggle: Variants = {
  initial: { rotate: 0 },
  hover: { 
    rotate: [-5, 5, -5, 5, 0], 
    transition: { duration: 0.5 } 
  }
}

const hoverGlow: Variants = {
  initial: { filter: "drop-shadow(0 0 0 transparent)" },
  hover: { 
    filter: "drop-shadow(0 0 8px currentColor)",
    transition: { duration: 0.3 } 
  }
}

// Animation type options
export type AnimationType = 
  | "scale" 
  | "rotate" 
  | "bounce" 
  | "pulse" 
  | "shake" 
  | "spin" 
  | "wiggle" 
  | "glow"
  | "none"

const animationVariants: Record<AnimationType, Variants> = {
  scale: hoverScale,
  rotate: hoverRotate,
  bounce: hoverBounce,
  pulse: hoverPulse,
  shake: hoverShake,
  spin: hoverSpin,
  wiggle: hoverWiggle,
  glow: hoverGlow,
  none: { initial: {}, hover: {} }
}

interface AnimatedIconProps extends Omit<LucideProps, 'ref'> {
  icon: React.ComponentType<LucideProps>
  animation?: AnimationType
  hoverAnimation?: AnimationType
  continuousAnimation?: boolean
}

/**
 * AnimatedIcon - A wrapper that adds hover animations to any Lucide icon
 * 
 * @example
 * <AnimatedIcon icon={Home} animation="scale" />
 * <AnimatedIcon icon={Settings} animation="spin" className="h-6 w-6" />
 * <AnimatedIcon icon={Bell} animation="shake" hoverAnimation="glow" />
 */
export const AnimatedIcon = forwardRef<HTMLSpanElement, AnimatedIconProps>(
  ({ icon: Icon, animation = "scale", hoverAnimation, continuousAnimation = false, className, ...props }, ref) => {
    const variants = animationVariants[animation]
    const hoverVariants = hoverAnimation ? animationVariants[hoverAnimation] : undefined

    return (
      <motion.span
        ref={ref}
        className="inline-flex items-center justify-center"
        initial="initial"
        whileHover="hover"
        animate={continuousAnimation ? "hover" : "initial"}
        variants={variants}
      >
        <motion.span
          variants={hoverVariants}
        >
          <Icon className={className} {...props} />
        </motion.span>
      </motion.span>
    )
  }
)
AnimatedIcon.displayName = "AnimatedIcon"

// Pre-configured animated icon components for common use cases
export const AnimatedHome = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Home} animation="scale" {...props} />
))
AnimatedHome.displayName = "AnimatedHome"

export const AnimatedSettings = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Settings} animation="spin" {...props} />
))
AnimatedSettings.displayName = "AnimatedSettings"

export const AnimatedBell = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Bell} animation="shake" {...props} />
))
AnimatedBell.displayName = "AnimatedBell"

export const AnimatedRefresh = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={RefreshCw} animation="spin" {...props} />
))
AnimatedRefresh.displayName = "AnimatedRefresh"

export const AnimatedHeart = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Heart} animation="pulse" {...props} />
))
AnimatedHeart.displayName = "AnimatedHeart"

export const AnimatedStar = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Star} animation="bounce" {...props} />
))
AnimatedStar.displayName = "AnimatedStar"

export const AnimatedMail = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Mail} animation="wiggle" {...props} />
))
AnimatedMail.displayName = "AnimatedMail"

export const AnimatedZap = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Zap} animation="glow" {...props} />
))
AnimatedZap.displayName = "AnimatedZap"

export const AnimatedBot = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Bot} animation="bounce" {...props} />
))
AnimatedBot.displayName = "AnimatedBot"

export const AnimatedSparkles = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Sparkles} animation="pulse" hoverAnimation="glow" {...props} />
))
AnimatedSparkles.displayName = "AnimatedSparkles"

export const AnimatedTerminal = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Terminal} animation="scale" {...props} />
))
AnimatedTerminal.displayName = "AnimatedTerminal"

export const AnimatedGlobe = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Globe} animation="spin" {...props} />
))
AnimatedGlobe.displayName = "AnimatedGlobe"

export const AnimatedActivity = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Activity} animation="pulse" {...props} />
))
AnimatedActivity.displayName = "AnimatedActivity"

export const AnimatedShield = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Shield} animation="scale" hoverAnimation="glow" {...props} />
))
AnimatedShield.displayName = "AnimatedShield"

export const AnimatedLoader = forwardRef<HTMLSpanElement, Omit<AnimatedIconProps, 'icon'>>((props, ref) => (
  <AnimatedIcon ref={ref} icon={Loader2} animation="spin" continuousAnimation {...props} />
))
AnimatedLoader.displayName = "AnimatedLoader"

// Icon Button with animated icon inside
interface AnimatedIconButtonProps extends ComponentPropsWithoutRef<typeof motion.button> {
  icon: React.ComponentType<LucideProps>
  animation?: AnimationType
  iconClassName?: string
}

export const AnimatedIconButton = forwardRef<HTMLButtonElement, AnimatedIconButtonProps>(
  ({ icon: Icon, animation = "scale", iconClassName, className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 ${className || ''}`}
        whileHover="hover"
        whileTap={{ scale: 0.95 }}
        initial="initial"
      >
        <motion.span variants={animationVariants[animation]}>
          <Icon className={iconClassName} />
        </motion.span>
        {children}
      </motion.button>
    )
  }
)
AnimatedIconButton.displayName = "AnimatedIconButton"

// Export all variants for custom use
export const iconAnimationVariants = animationVariants

// Re-export common Lucide icons for convenience
export {
  Home, Settings, User, Mail, Bell, Search, Menu, X, ChevronDown, ChevronRight,
  Plus, Minus, Check, AlertTriangle, Info, HelpCircle, ExternalLink, Download,
  Upload, Share2, Copy, Trash2, Edit, Eye, EyeOff, Lock, Unlock, Star, Heart,
  Bookmark, MessageSquare, Send, Phone, Video, Image, File, Folder, Database,
  Server, Cloud, Wifi, Battery, Volume2, Play, Pause, SkipForward, SkipBack,
  RefreshCw, Loader2, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Zap, Shield,
  Activity, Terminal, Code, Bot, Sparkles, Globe, Map, Compass, Navigation
}
