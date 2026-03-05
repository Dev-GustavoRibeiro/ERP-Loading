'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Star, Flame, Target, Award, Medal, Zap, Crown, TrendingUp, Users, 
  ChevronRight, X, CheckCircle2 
} from 'lucide-react'
import { Portal } from '@/shared/components/atoms/Portal'
import { cn } from '@/shared/lib/utils'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import { getUserGamificationData, getLeaderboard } from '@/app/actions/vendas-features'

interface Mission {
  id: string
  name: string
  description?: string
  mission_type: string
  period: 'daily' | 'weekly' | 'monthly'
  target_value: number
  xp_reward: number
  icon?: string
  current_value: number
  completed: boolean
  period_key: string
}

interface Badge {
  id: string
  badge: {
    id: string
    name: string
    description?: string
    icon?: string
    color: string
  }
  earned_at?: string
}

interface LeaderboardEntry {
  user_id: string
  user_name: string
  xp: number
}

interface GamificationData {
  totalXp: number
  level: number
  streak: number
  missions: Mission[]
  badges: Badge[]
}

const missionIcons: Record<string, any> = {
  sales_count: Target,
  sales_value: TrendingUp,
  avg_ticket: Star,
  items_sold: Zap,
  no_cancellations: CheckCircle2,
  no_returns: Award,
  streak: Flame,
}

const periodColors = {
  daily: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  weekly: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  monthly: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const periodLabels = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

export function GamificationModal({ 
  isOpen, 
  onClose, 
  userId = 'current-user' 
}: { 
  isOpen: boolean
  onClose: () => void
  userId?: string 
}) {
  const empresaId = useEmpresaId()
  const [data, setData] = useState<GamificationData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [loading, setLoading] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  useEffect(() => {
    if (isOpen && empresaId) {
      loadData()
    }
  }, [isOpen, empresaId, userId])

  useEffect(() => {
    if (isOpen && empresaId) {
      loadLeaderboard()
    }
  }, [isOpen, empresaId, leaderboardPeriod])

  const loadData = async () => {
    if (!empresaId) return
    setLoading(true)
    try {
      const result = await getUserGamificationData(empresaId, userId)
      setData(result)
    } catch (error) {
      console.error('Error loading gamification data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    if (!empresaId) return
    setLoadingLeaderboard(true)
    try {
      const result = await getLeaderboard(empresaId, leaderboardPeriod)
      setLeaderboard(result)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const level = data?.level || 1
  const totalXp = data?.totalXp || 0
  const streak = data?.streak || 0
  const xpInCurrentLevel = totalXp % 100
  const xpToNextLevel = 100 - xpInCurrentLevel
  const progressPercent = (xpInCurrentLevel / 100) * 100

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-400" />
    if (position === 2) return <Medal className="h-5 w-5 text-slate-300" />
    if (position === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return null
  }

  const getRankBg = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40'
    if (position === 2) return 'bg-gradient-to-r from-slate-400/20 to-slate-500/20 border-slate-400/40'
    if (position === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/40'
    return ''
  }

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            {/* Overlay */}
            <motion.div
              key="gamification-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              key="gamification-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn(
                'relative w-full h-full max-h-[90vh]',
                'bg-[#1a1f2e]',
                'border border-white/10',
                'rounded-2xl',
                'shadow-2xl',
                'overflow-hidden',
                'flex flex-col'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    <Trophy className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                      Hub de Gamificação
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Missões, badges e ranking
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loading ? (
                  <div className="space-y-6">
                    {/* Loading skeletons */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : !data ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="h-16 w-16 text-slate-600 mb-4" />
                    <p className="text-slate-400 text-lg">
                      Comece vendendo para desbloquear missões!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* User Profile Card */}
                    <div className="relative p-6 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl" />
                      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Level */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                            {level}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">Nível</div>
                        </div>

                        {/* XP Progress */}
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">XP para próximo nível</span>
                            <span className="text-sm font-semibold text-amber-400">{xpToNextLevel} XP</span>
                          </div>
                          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {totalXp.toLocaleString('pt-BR')} XP total
                          </div>
                        </div>

                        {/* Streak */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-2">
                            <Flame className="h-6 w-6 text-orange-400" />
                            <div className="text-3xl font-bold text-orange-400">{streak}</div>
                          </div>
                          <div className="text-sm text-slate-400 mt-1">Sequência</div>
                        </div>
                      </div>
                    </div>

                    {/* Missions Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-semibold text-white">Missões</h3>
                      </div>
                      {data.missions.length === 0 ? (
                        <div className="p-8 text-center rounded-xl bg-white/5 border border-white/10">
                          <p className="text-slate-400">
                            Nenhuma missão disponível no momento
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {data.missions.map((mission) => {
                            const Icon = missionIcons[mission.mission_type] || Target
                            const progress = Math.min((mission.current_value / mission.target_value) * 100, 100)
                            const isCompleted = mission.completed

                            return (
                              <motion.div
                                key={mission.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className={cn(
                                  'relative p-4 rounded-xl border overflow-hidden',
                                  isCompleted
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : 'bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors'
                                )}
                              >
                                {isCompleted && (
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                  </div>
                                )}
                                <div className="flex items-start gap-3 mb-3">
                                  <div className={cn(
                                    'p-2 rounded-lg',
                                    isCompleted ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                                  )}>
                                    <Icon className={cn(
                                      'h-4 w-4',
                                      isCompleted ? 'text-emerald-400' : 'text-amber-400'
                                    )} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-white mb-1 truncate">
                                      {mission.name}
                                    </h4>
                                    <div className={cn(
                                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                                      periodColors[mission.period]
                                    )}>
                                      {periodLabels[mission.period]}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">
                                      {mission.current_value.toLocaleString('pt-BR')} / {mission.target_value.toLocaleString('pt-BR')}
                                    </span>
                                    <span className="text-amber-400 font-semibold">
                                      +{mission.xp_reward} XP
                                    </span>
                                  </div>
                                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.6, ease: 'easeOut' }}
                                      className={cn(
                                        'h-full rounded-full',
                                        isCompleted
                                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                                      )}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Badges Section */}
                    {data.badges.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Award className="h-5 w-5 text-amber-400" />
                          <h3 className="text-lg font-semibold text-white">Badges Conquistados</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                          {data.badges.map((badge) => (
                            <motion.div
                              key={badge.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center gap-2 min-w-[100px]"
                            >
                              <div className="relative p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                <Award className="h-8 w-8 text-amber-400" />
                              </div>
                              <div className="text-xs text-center text-slate-300 font-medium">
                                {badge.badge.name}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Leaderboard Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-amber-400" />
                          <h3 className="text-lg font-semibold text-white">Ranking</h3>
                        </div>
                        <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/10">
                          <button
                            onClick={() => setLeaderboardPeriod('weekly')}
                            className={cn(
                              'px-3 py-1 rounded text-sm font-medium transition-colors',
                              leaderboardPeriod === 'weekly'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'text-slate-400 hover:text-white'
                            )}
                          >
                            Semanal
                          </button>
                          <button
                            onClick={() => setLeaderboardPeriod('monthly')}
                            className={cn(
                              'px-3 py-1 rounded text-sm font-medium transition-colors',
                              leaderboardPeriod === 'monthly'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'text-slate-400 hover:text-white'
                            )}
                          >
                            Mensal
                          </button>
                        </div>
                      </div>
                      {loadingLeaderboard ? (
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : leaderboard.length === 0 ? (
                        <div className="p-8 text-center rounded-xl bg-white/5 border border-white/10">
                          <p className="text-slate-400">
                            Nenhum ranking disponível ainda
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {leaderboard.map((entry, index) => {
                            const position = index + 1
                            const isCurrentUser = entry.user_id === userId
                            const rankIcon = getRankIcon(position)
                            const rankBg = getRankBg(position)

                            return (
                              <motion.div
                                key={entry.user_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                  'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                                  isCurrentUser
                                    ? 'bg-amber-500/10 border-amber-500/40'
                                    : rankBg || 'bg-white/5 border-white/10'
                                )}
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-sm font-bold text-slate-300">
                                  {rankIcon || position}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      'font-semibold truncate',
                                      isCurrentUser ? 'text-amber-400' : 'text-white'
                                    )}>
                                      {entry.user_name}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-amber-400" />
                                  <span className="font-bold text-amber-400">
                                    {entry.xp.toLocaleString('pt-BR')}
                                  </span>
                                  <span className="text-xs text-slate-400">XP</span>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}
