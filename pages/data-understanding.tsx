import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'
import HyperLiquidAPI from '../lib/hyperliquid-api'

interface Trade {
  coin: string
  direction: 'long' | 'short'
  openingTime: string
  duration: string
  realizedPnL: number
}

export default function DataUnderstanding() {
  const [userAddress, setUserAddress] = useState('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userAddress.trim()) {
      setError('Please enter a user address')
      return
    }

    setLoading(true)
    setError(null)
    setTrades([])
    setHasSearched(true)

    try {
      const api = new HyperLiquidAPI()
      
      console.log('Fetching fills for user:', userAddress)
      
      // Get user fills (trades) from HyperLiquid API
      const fills = await api.getUserFills(userAddress)
      
      console.log('Raw fills data:', fills)
      
      // Process fills to reconstruct completed trades
      const completedTrades = HyperLiquidAPI.processCompletedTrades(fills)
      
      console.log('Processed completed trades:', completedTrades)
      
      if (completedTrades.length === 0) {
        setError('No completed trades found for this user address. The user may not have any closed positions.')
      } else {
        setTrades(completedTrades)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching trades:', err)
      setError(`Failed to fetch trades data: ${err instanceof Error ? err.message : 'Unknown error'}. Please check the user address and try again.`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>Data Understanding - OrderBook</title>
        <meta name="description" content="HyperLiquid user trades data understanding" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Test 2: Data Understanding
            </h1>
            <p className="text-gray-300">
              Reconstruct the history of completed perpetual trades for a HyperLiquid user
            </p>
          </div>
          <Link href="/">
            <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
              ← Back to Home
            </button>
          </Link>
        </div>

        {/* Objective */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Objective</h2>
          <p className="text-gray-300 leading-relaxed">
            Reconstruct the history of completed perpetual trades (positions that were opened and then closed) 
            for a given HyperLiquid user using the HyperLiquid API. No design work is required for this part, 
            a simple, functional implementation is enough.
          </p>
        </div>

        {/* User Address Input */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Enter User Address</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="Enter HyperLiquid user address (e.g., 0x1234...)"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Loading...' : 'Get Trades Data'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Retrieving trades data...</p>
          </div>
        )}

        {/* Trades Results */}
        {trades.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Completed Trades ({trades.length} found)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">Coin</th>
                    <th className="text-left py-3 px-4 text-gray-300">Direction</th>
                    <th className="text-left py-3 px-4 text-gray-300">Opening Time</th>
                    <th className="text-left py-3 px-4 text-gray-300">Duration</th>
                    <th className="text-right py-3 px-4 text-gray-300">Realized PnL (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="py-3 px-4 text-white font-medium">{trade.coin}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.direction === 'long' 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-red-900 text-red-200'
                        }`}>
                          {trade.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{trade.openingTime}</td>
                      <td className="py-3 px-4 text-gray-300">{trade.duration}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        trade.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${trade.realizedPnL.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Trades Found Message - only show after attempting to fetch data */}
        {!loading && !error && trades.length === 0 && hasSearched && (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-4">No Completed Trades Found</h2>
            <p className="text-gray-300 mb-4">
              This user address doesn't have any completed perpetual trades (positions that were opened and then closed).
            </p>
            <p className="text-gray-400 text-sm">
              The user may only have open positions, or may not have traded on HyperLiquid yet.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
