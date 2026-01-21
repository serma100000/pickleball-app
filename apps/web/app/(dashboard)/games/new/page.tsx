'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, Users, Trophy, Plus, Minus, X } from 'lucide-react';

type GameType = 'singles' | 'doubles';
type ScoreEntry = { team1: number; team2: number };

export default function NewGamePage() {
  const [gameType, setGameType] = useState<GameType>('doubles');
  const [scores, setScores] = useState<ScoreEntry[]>([{ team1: 0, team2: 0 }]);
  const [partners, setPartners] = useState<string[]>(['']);
  const [opponents, setOpponents] = useState<string[]>(['', '']);

  const addGame = () => {
    if (scores.length < 3) {
      setScores([...scores, { team1: 0, team2: 0 }]);
    }
  };

  const removeGame = (index: number) => {
    if (scores.length > 1) {
      setScores(scores.filter((_, i) => i !== index));
    }
  };

  const updateScore = (
    gameIndex: number,
    team: 'team1' | 'team2',
    value: number
  ) => {
    const newScores = [...scores];
    const game = newScores[gameIndex];
    if (game) {
      game[team] = Math.max(0, Math.min(21, value));
      setScores(newScores);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/games"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Log New Game
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Record your match details
          </p>
        </div>
      </div>

      <form className="space-y-6">
        {/* Game Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Game Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setGameType('singles');
                setPartners(['']);
                setOpponents(['']);
              }}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                gameType === 'singles'
                  ? 'border-pickle-500 bg-pickle-50 dark:bg-pickle-900/20 text-pickle-700 dark:text-pickle-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Trophy className="w-5 h-5" />
              Singles
            </button>
            <button
              type="button"
              onClick={() => {
                setGameType('doubles');
                setPartners(['']);
                setOpponents(['', '']);
              }}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                gameType === 'doubles'
                  ? 'border-pickle-500 bg-pickle-50 dark:bg-pickle-900/20 text-pickle-700 dark:text-pickle-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Users className="w-5 h-5" />
              Doubles
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Your Team */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {gameType === 'singles' ? 'You' : 'Your Team'}
              </label>
              <div className="space-y-3">
                <div className="p-3 bg-pickle-50 dark:bg-pickle-900/20 rounded-lg border border-pickle-200 dark:border-pickle-800">
                  <span className="text-pickle-700 dark:text-pickle-400 font-medium">
                    You
                  </span>
                </div>
                {gameType === 'doubles' && (
                  <input
                    type="text"
                    placeholder="Partner's name"
                    value={partners[0]}
                    onChange={(e) => setPartners([e.target.value])}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>

            {/* Opponents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {gameType === 'singles' ? 'Opponent' : 'Opponents'}
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Opponent's name"
                  value={opponents[0]}
                  onChange={(e) =>
                    setOpponents([e.target.value, opponents[1] || ''])
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
                />
                {gameType === 'doubles' && (
                  <input
                    type="text"
                    placeholder="Opponent's partner"
                    value={opponents[1]}
                    onChange={(e) =>
                      setOpponents([opponents[0] ?? '', e.target.value])
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Score
            </label>
            {scores.length < 3 && (
              <button
                type="button"
                onClick={addGame}
                className="flex items-center gap-1 text-sm text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300"
              >
                <Plus className="w-4 h-4" />
                Add Game
              </button>
            )}
          </div>
          <div className="space-y-4">
            {scores.map((score, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-16">
                  Game {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <ScoreInput
                    value={score.team1}
                    onChange={(val) => updateScore(index, 'team1', val)}
                    label="Your score"
                  />
                  <span className="text-gray-400">-</span>
                  <ScoreInput
                    value={score.team2}
                    onChange={(val) => updateScore(index, 'team2', val)}
                    label="Opponent score"
                  />
                </div>
                {scores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGame(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Location (Optional)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a court..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Notes (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Any notes about this game..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-pickle-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Link
            href="/games"
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-center font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-pickle-500 hover:bg-pickle-600 text-white rounded-xl font-medium transition-colors"
          >
            Save Game
          </button>
        </div>
      </form>
    </div>
  );
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600"
        aria-label={`Decrease ${label}`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min="0"
        max="21"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-14 py-2 text-center border-y border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-pickle-500"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600"
        aria-label={`Increase ${label}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
