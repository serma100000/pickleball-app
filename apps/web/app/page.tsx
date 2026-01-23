import Link from 'next/link';
import {
  MapPin,
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Shield,
  Smartphone,
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
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            The #1 Pickleball Community App
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 max-w-4xl mx-auto leading-tight">
            Find Courts, Track Games,{' '}
            <span className="text-brand-gradient">Level Up Your Game</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            The ultimate companion app for pickleball enthusiasts. Discover nearby courts,
            log your matches, join clubs, and compete in leagues and tournaments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Start Playing Free
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Play
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              From finding courts to tracking your progress, PaddleUp has all the tools
              to elevate your pickleball experience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="Court Finder"
              description="Discover pickleball courts near you with real-time availability, ratings, and directions."
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Game Tracking"
              description="Log your matches, track statistics, and watch your skill rating improve over time."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Clubs & Community"
              description="Join local clubs, meet players at your skill level, and build lasting friendships."
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Tournaments"
              description="Register for tournaments, view brackets, and track your competitive journey."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Leagues"
              description="Participate in organized league play with automated scheduling and standings."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Skill Rating"
              description="Get an accurate DUPR-style rating based on your match history and competition level."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-brand-600">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <StatCard value="10,000+" label="Active Players" />
            <StatCard value="5,000+" label="Courts Listed" />
            <StatCard value="50,000+" label="Games Tracked" />
            <StatCard value="500+" label="Clubs & Leagues" />
          </div>
        </div>
      </section>

      {/* Mobile App Preview */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ball-100 dark:bg-ball-900/30 text-ball-700 dark:text-ball-300 text-sm font-medium mb-6">
                <Smartphone className="w-4 h-4" />
                Available on All Devices
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Play Anywhere, Track Everywhere
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                PaddleUp works seamlessly on your phone, tablet, or computer. Our progressive
                web app means you can install it like a native app and use it even offline.
              </p>
              <ul className="space-y-4">
                <FeatureListItem text="Works offline with automatic sync" />
                <FeatureListItem text="Real-time notifications for matches" />
                <FeatureListItem text="GPS-powered court discovery" />
                <FeatureListItem text="Quick game logging in seconds" />
              </ul>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-72 h-[500px] bg-gray-200 dark:bg-gray-700 rounded-3xl shadow-2xl flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">App Preview</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-brand-700 to-brand-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Level Up Your Game?
          </h2>
          <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Sign up for free and start discovering courts, tracking games, and connecting
            with players today.
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

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-white mb-2">{value}</div>
      <div className="text-brand-100">{label}</div>
    </div>
  );
}

function FeatureListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-gray-700 dark:text-gray-300">{text}</span>
    </li>
  );
}
