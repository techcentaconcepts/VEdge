import Link from 'next/link';
import { ArrowRight, BarChart3, Shield, Zap, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Vantedge</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Now supporting Nigerian bookmakers
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Trade the Market,
            <br />
            <span className="text-gradient">Don't Gamble on the Game</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10">
            Professional betting analytics for career bettors. Find mathematical edges, 
            track your Closing Line Value, and protect your accounts from limitations.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-3">
              Start Free Audit
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3">
              See How It Works
            </Link>
          </div>
          
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
            Free bankroll audit • No credit card required • 100+ active users
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '₦2.5B+', label: 'Bets Tracked' },
              { value: '13.5%', label: 'Avg Edge Found' },
              { value: '<30s', label: 'Alert Speed' },
              { value: '95%', label: 'User Satisfaction' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-brand-600">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to bet professionally
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From finding edges to protecting your accounts
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: 'Bankroll Auditor',
                description: 'Sync your bet history automatically. See your true ROI, Closing Line Value, and whether you\'re skilled or just lucky.',
                badge: 'Free',
              },
              {
                icon: Zap,
                title: 'Value Scanner',
                description: 'Real-time detection of line-lag between sharp markets (Pinnacle) and local soft books (Bet9ja, SportyBet).',
                badge: 'Starter',
              },
              {
                icon: Shield,
                title: 'Stealth Suite',
                description: 'Residential proxies, fingerprint masking, and mug bet scheduling to protect winning accounts from gubbing.',
                badge: 'Pro',
              },
            ].map((feature, i) => (
              <div key={i} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-brand-600" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {feature.badge}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              5-10x cheaper than global alternatives
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Explorer',
                price: 'Free',
                description: 'Perfect for tracking your bets',
                features: [
                  'Unlimited bet tracking',
                  'Basic ROI & CLV stats',
                  'Browser extension sync',
                  '5-minute delayed odds',
                ],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Starter',
                price: '$10',
                priceNgn: '₦15,000',
                description: 'For serious side-hustlers',
                features: [
                  'Everything in Explorer',
                  'Real-time value alerts',
                  'Telegram notifications',
                  'Full analytics dashboard',
                  '50 alerts/day',
                ],
                cta: 'Start 7-Day Trial',
                popular: true,
              },
              {
                name: 'Pro',
                price: '$49',
                priceNgn: '₦75,000',
                description: 'For career bettors',
                features: [
                  'Everything in Starter',
                  'Stealth Suite access',
                  '10 dedicated proxy IPs',
                  'Mug bet scheduler',
                  'Unlimited alerts',
                  'Priority support',
                ],
                cta: 'Go Pro',
                popular: false,
              },
            ].map((plan, i) => (
              <div 
                key={i} 
                className={`card p-8 ${plan.popular ? 'ring-2 ring-brand-500 scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== 'Free' && <span className="text-gray-500">/mo</span>}
                  {plan.priceNgn && (
                    <div className="text-sm text-gray-500">{plan.priceNgn}/mo</div>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/signup" 
                  className={`w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'} justify-center`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to find your edge?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Join hundreds of Nigerian bettors already using Vantedge to track and improve their performance.
          </p>
          <Link href="/signup" className="btn-primary text-lg px-8 py-3">
            Start Your Free Audit
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Vantedge</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">
                Terms of Service
              </Link>
              <Link href="/support" className="hover:text-gray-900 dark:hover:text-white">
                Support
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500">
            <p className="mb-2">
              © 2026 Techcenta. All rights reserved.
            </p>
            <p className="text-xs max-w-2xl mx-auto">
              Disclaimer: Vantedge provides mathematical data for informational purposes only. 
              Sports betting involves significant risk of loss. We are not responsible for 
              financial outcomes or account restrictions imposed by third-party bookmakers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
