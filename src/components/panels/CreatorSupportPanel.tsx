/**
 * Creator Support Panel
 * Displays creator support options with NeonGradientCard effects
 */

import { Heart, Star, Coffee, Zap } from 'lucide-react'
import { NeonGradientCard } from '@components/ui/neon-gradient-card'
import { AnimatedGradientText } from '@components/ui/animated-gradient-text'
import { useNeonGradientEnabled, useGradientTextEnabled } from '@stores/animationStore'

interface SupportOption {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  amount: string
  colors: { firstColor: string; secondColor: string }
  popular?: boolean
}

const supportOptions: SupportOption[] = [
  {
    id: 'coffee',
    title: 'Buy a Coffee',
    description: 'Support development with a small contribution',
    icon: <Coffee className="size-6" />,
    amount: '$5',
    colors: { firstColor: '#8B4513', secondColor: '#D2691E' },
  },
  {
    id: 'supporter',
    title: 'Supporter',
    description: 'Get early access to new features',
    icon: <Heart className="size-6" />,
    amount: '$10/mo',
    colors: { firstColor: '#ff00aa', secondColor: '#ff6b6b' },
    popular: true,
  },
  {
    id: 'pro',
    title: 'Pro Supporter',
    description: 'Priority support and exclusive features',
    icon: <Star className="size-6" />,
    amount: '$25/mo',
    colors: { firstColor: '#FFD700', secondColor: '#FFA500' },
  },
  {
    id: 'sponsor',
    title: 'Sponsor',
    description: 'Direct line to developers, custom features',
    icon: <Zap className="size-6" />,
    amount: '$100/mo',
    colors: { firstColor: '#00FFF1', secondColor: '#7B68EE' },
  },
]

export function CreatorSupportPanel() {
  const neonEnabled = useNeonGradientEnabled()
  const gradientTextEnabled = useGradientTextEnabled()

  const handleSupport = (optionId: string) => {
    // TODO: Implement payment flow
    console.log(`Supporting with option: ${optionId}`)
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-card/80" data-testid="creator-support-panel">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold mb-2" data-testid="creator-support-title">
          {gradientTextEnabled ? (
            <AnimatedGradientText
              colorFrom="#ff00aa"
              colorTo="#00FFF1"
              speed={3}
            >
              Support Development
            </AnimatedGradientText>
          ) : (
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Support Development
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          Help us continue improving Virtual IP Browser
        </p>
      </div>

      {/* Support Options */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="support-options">
        {supportOptions.map((option) => (
          <div key={option.id} className="relative">
            {option.popular && (
              <div className="absolute -top-2 -right-2 z-20 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
                Popular
              </div>
            )}
            
            {neonEnabled ? (
              <NeonGradientCard
                neonColors={option.colors}
                borderSize={2}
                borderRadius={12}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                data-testid={`support-option-${option.id}`}
              >
                <SupportCardContent option={option} onSupport={handleSupport} />
              </NeonGradientCard>
            ) : (
              <div
                className="p-4 rounded-xl border border-border/50 bg-card cursor-pointer transition-all hover:border-primary/30 hover:bg-secondary/30"
                data-testid={`support-option-${option.id}`}
              >
                <SupportCardContent option={option} onSupport={handleSupport} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-secondary/30">
        <p className="text-xs text-center text-muted-foreground">
          All contributions go directly to development and server costs.
          <br />
          Thank you for your support!
        </p>
      </div>
    </div>
  )
}

function SupportCardContent({ 
  option, 
  onSupport 
}: { 
  option: SupportOption
  onSupport: (id: string) => void 
}) {
  return (
    <div className="flex items-start gap-3">
      <div 
        className="p-2 rounded-lg"
        style={{ 
          backgroundColor: `${option.colors.firstColor}20`,
          color: option.colors.firstColor 
        }}
      >
        {option.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm">{option.title}</h3>
          <span className="text-sm font-bold" style={{ color: option.colors.firstColor }}>
            {option.amount}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{option.description}</p>
        <button
          onClick={() => onSupport(option.id)}
          className="w-full py-1.5 px-3 text-xs font-medium rounded-lg transition-colors"
          style={{ 
            backgroundColor: `${option.colors.firstColor}20`,
            color: option.colors.firstColor 
          }}
        >
          Support
        </button>
      </div>
    </div>
  )
}
