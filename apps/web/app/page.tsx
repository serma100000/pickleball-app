import Link from 'next/link';
import {
  Trophy,
  Calendar,
  TrendingUp,
  ClipboardList,
  Bell,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center px-3 text-gray-600 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="min-h-[44px] px-4 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="main-content" className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Your Pickleball Companion
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 max-w-4xl mx-auto leading-tight">
            Organize Tournaments,{' '}
            <span className="text-brand-gradient">Track Your Progress</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Paddle Up helps you manage tournaments, track your games, and organize
            league play. Built by pickleball players, for pickleball players.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What You Can Do Today
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Paddle Up gives you the tools to organize competitive play and track your pickleball journey.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Tournament Management"
              description="Create and manage tournaments with single/double elimination brackets, round robin, and pool play formats."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="League Organization"
              description="Set up leagues with divisions, track standings, and manage seasonal play."
            />
            <FeatureCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="Game Logging"
              description="Record your matches with scores, track wins and losses, and build your game history."
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Player Profiles"
              description="Create your profile, set your skill level, and showcase your pickleball journey."
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6" />}
              title="Notifications"
              description="Stay updated with game invites, tournament registrations, and match reminders."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Quick Setup"
              description="Get started in minutes with an intuitive interface designed for players of all levels."
            />
          </div>
        </div>
      </section>

      {/* Why Paddle Up Section */}
      <section className="py-20 px-4 bg-brand-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Built for the Pickleball Community
          </h2>
          <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            We&apos;re building the tools that pickleball organizers and players actually need.
            No fluff, just features that help you play more and organize better.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">Free</div>
              <div className="text-brand-100">To get started</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">Simple</div>
              <div className="text-brand-100">Easy to use interface</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">Growing</div>
              <div className="text-brand-100">New features regularly</div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              More Features Coming Soon
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              We&apos;re actively building new features based on community feedback.
              Here&apos;s what&apos;s on our roadmap:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <RoadmapItem text="Court finder with maps and ratings" />
              <RoadmapItem text="DUPR rating integration" />
              <RoadmapItem text="Clubs and community features" />
              <RoadmapItem text="Player matchmaking" />
              <RoadmapItem text="Mobile app (iOS & Android)" />
              <RoadmapItem text="Advanced statistics and analytics" />
            </div>
            <p className="mt-8 text-gray-500 dark:text-gray-400">
              Have a feature request?{' '}
              <Link href="/contact" className="text-brand-600 dark:text-brand-400 hover:underline">
                Let us know
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-brand-700 to-brand-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Create your free account and start organizing tournaments, tracking games,
            and managing your pickleball league today.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-4 bg-white text-brand-600 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" variant="white" />
            <div className="flex items-center gap-2 text-sm">
              <Link href="/privacy" className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 hover:text-white transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
                Privacy
              </Link>
              <Link href="/terms" className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 hover:text-white transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
                Terms
              </Link>
              <Link href="/contact" className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 hover:text-white transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
                Contact
              </Link>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} PaddleUp. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function RoadmapItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-lg">
      <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
      <span className="text-gray-700 dark:text-gray-300">{text}</span>
    </div>
  );
}
