import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import HyperLiquidAPI, { HyperLiquidOrderBook } from '../lib/hyperliquid-api'

interface Order {
  price: number
  size: number
  total: number
}

export default function OrderBook() {
  const [activeTab, setActiveTab] = useState('orderbook')
  const [pricePrecision, setPricePrecision] = useState('0.001')
  const [selectedAsset, setSelectedAsset] = useState('AVAX')
  const [orderBook, setOrderBook] = useState<{ bids: Order[], asks: Order[], midPrice: number }>({
    bids: [],
    asks: [],
    midPrice: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableAssets, setAvailableAssets] = useState<string[]>(['AVAX', 'BTC', 'ETH', 'SOL'])
  
  const apiRef = useRef<HyperLiquidAPI | null>(null)

  // Initialize API and fetch initial data
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const api = new HyperLiquidAPI()
        apiRef.current = api

        // Get available assets
        try {
          const assets = await api.getAssets()
          const assetNames = assets.map(asset => asset.name).slice(0, 10) // Get first 10 assets
          setAvailableAssets(assetNames)
        } catch (error) {
          console.warn('Failed to fetch assets, using default list:', error)
          // Use default assets if API fails
          setAvailableAssets(['AVAX', 'BTC', 'ETH', 'SOL', 'ARB', 'OP', 'MATIC', 'LINK', 'UNI', 'AAVE'])
        }

        // Get initial order book
        try {
          const orderBookData = await api.getOrderBook(selectedAsset)
          const convertedOrderBook = HyperLiquidAPI.convertOrderBook(orderBookData, parseFloat(pricePrecision))
          setOrderBook(convertedOrderBook)
        } catch (orderBookError) {
          console.warn('Failed to fetch order book, using fallback data:', orderBookError)
          // Use fallback data if API fails
          setOrderBook({
            bids: [
              { price: 29.400, size: 100.00, total: 100.00 },
              { price: 29.399, size: 150.00, total: 250.00 },
              { price: 29.398, size: 200.00, total: 450.00 }
            ],
            asks: [
              { price: 29.500, size: 100.00, total: 100.00 },
              { price: 29.501, size: 150.00, total: 250.00 },
              { price: 29.502, size: 200.00, total: 450.00 }
            ],
            midPrice: 29.450
          })
        }

        // Connect to WebSocket for real-time updates (optional)
        try {
          api.connectWebSocket(
            selectedAsset,
            (updatedOrderBook: HyperLiquidOrderBook) => {
              const converted = HyperLiquidAPI.convertOrderBook(updatedOrderBook, parseFloat(pricePrecision))
              setOrderBook(converted)
            },
            (error) => {
              console.warn('WebSocket connection failed, continuing with static data:', error)
              // Don't set error state for WebSocket failures
            }
          )
        } catch (wsError) {
          console.warn('WebSocket connection failed, continuing with static data:', wsError)
          // Don't set error state for WebSocket failures
        }

        setLoading(false)
      } catch (err) {
        console.error('Error initializing API:', err)
        setError('Failed to load market data. Please try again.')
        setLoading(false)
      }
    }

    initializeAPI()

    // Cleanup on unmount
    return () => {
      if (apiRef.current) {
        apiRef.current.disconnect()
      }
    }
  }, [])

  // Handle asset change
  const handleAssetChange = async (newAsset: string) => {
    if (apiRef.current) {
      try {
        setLoading(true)
        setError(null)
        
        // Clear current order book data immediately to prevent flickering
        setOrderBook({
          bids: [],
          asks: [],
          midPrice: 0
        })
        
        // Disconnect current WebSocket if connected to different coin
        if (apiRef.current.isConnectedTo && !apiRef.current.isConnectedTo(newAsset)) {
          apiRef.current.disconnect()
        }
        
        // Get new order book first
        try {
          const orderBookData = await apiRef.current.getOrderBook(newAsset)
          const convertedOrderBook = HyperLiquidAPI.convertOrderBook(orderBookData, parseFloat(pricePrecision))
          setOrderBook(convertedOrderBook)
        } catch (orderBookError) {
          console.warn('Failed to fetch order book for', newAsset, ', using fallback data:', orderBookError)
          // Use fallback data if API fails
          setOrderBook({
            bids: [
              { price: 29.400, size: 100.00, total: 100.00 },
              { price: 29.399, size: 150.00, total: 250.00 },
              { price: 29.398, size: 200.00, total: 450.00 }
            ],
            asks: [
              { price: 29.500, size: 100.00, total: 100.00 },
              { price: 29.501, size: 150.00, total: 250.00 },
              { price: 29.502, size: 200.00, total: 450.00 }
            ],
            midPrice: 29.450
          })
        }

        // Switch WebSocket subscription to new coin
        try {
          apiRef.current.connectWebSocket(
            newAsset,
            (updatedOrderBook: HyperLiquidOrderBook) => {
              const converted = HyperLiquidAPI.convertOrderBook(updatedOrderBook, parseFloat(pricePrecision))
              setOrderBook(converted)
            },
            (error) => {
              console.warn('WebSocket connection failed, continuing with static data:', error)
              // Don't set error state for WebSocket failures - just log it
            }
          )
        } catch (wsError) {
          console.warn('WebSocket connection failed, continuing with static data:', wsError)
          // Don't set error state for WebSocket failures
        }

        setLoading(false)
      } catch (err) {
        console.error('Error changing asset:', err)
        setError('Failed to load market data. Please try again.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>OrderBook</title>
        <meta name="description" content="OrderBook application built with Next.js and Tailwind CSS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-[280px] mx-auto bg-black">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('orderbook')}
              className={`w-[124px] h-[40px] flex items-center justify-center text-xs leading-4 transition-colors relative ${
                activeTab === 'orderbook'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Order Book
              {activeTab === 'orderbook' && (
                <div className="absolute -bottom-[1px] left-1/2 transform -translate-x-1/2 w-6 h-[3px] bg-white z-10"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className={`w-[124px] h-[40px] flex items-center justify-center text-xs leading-4 transition-colors relative ${
                activeTab === 'trades'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Trades
              {activeTab === 'trades' && (
                <div className="absolute -bottom-[1px] left-1/2 transform -translate-x-1/2 w-6 h-[3px] bg-white z-10"></div>
              )}
            </button>
          </div>
          
          <button className="text-gray-400 hover:text-white">
            <svg className="w-[14px] h-[14px]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center h-8">
              <div className="relative">
                <select
                  value={pricePrecision}
                  onChange={(e) => setPricePrecision(e.target.value)}
                  disabled
                  className="bg-transparent border-none px-[10px] py-1 pr-6 appearance-none focus:outline-none text-xs leading-4 text-gray-500 cursor-not-allowed"
                  style={{ 
                    background: 'transparent',
                    color: '#6B7280'
                  }}
                >
                  <option value="0.001" style={{ background: 'black', color: '#6B7280' }}>0.001</option>
                  <option value="0.01" style={{ background: 'black', color: '#6B7280' }}>0.01</option>
                  <option value="0.1" style={{ background: 'black', color: '#6B7280' }}>0.1</option>
                  <option value="1" style={{ background: 'black', color: '#6B7280' }}>1</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  value={selectedAsset}
                  onChange={(e) => {
                    setSelectedAsset(e.target.value)
                    handleAssetChange(e.target.value)
                  }}
                  disabled
                  className="bg-transparent border-none px-[10px] py-1 pr-6 appearance-none focus:outline-none text-xs leading-4 text-gray-500 cursor-not-allowed"
                  style={{ 
                    background: 'transparent',
                    color: '#6B7280'
                  }}
                >
                  {availableAssets.map(asset => (
                    <option key={asset} value={asset} style={{ background: 'black', color: '#6B7280' }}>{asset}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
        </div>

         {/* Order Book Table */}
         <div className="overflow-hidden">
           {loading ? (
             <div className="px-[10px] py-8 text-center text-gray-400">
               Loading market data...
             </div>
           ) : error ? (
             <div className="px-[10px] py-8 text-center text-red-400">
               {error}
             </div>
           ) : (
             <>
               {/* Table Header */}
               <div className="grid grid-cols-3 px-[10px] py-2 text-xs leading-4 font-medium text-gray-400">
                 <div>Price (USD)</div>
                   <div className="text-right pr-[10px]">Size ({selectedAsset})</div>
                 <div className="text-right">Total ({selectedAsset})</div>
               </div>

               {/* Ask Orders (Sell Orders) */}
               {orderBook.asks.slice(0, 10).sort((a, b) => b.price - a.price).map((order, index) => {
                 const maxTotal = Math.max(...orderBook.asks.slice(0, 10).map(o => o.total), ...orderBook.bids.slice(0, 10).map(o => o.total))
                 const barWidth = (order.total / maxTotal) * 100
                 return (
                   <div key={`ask-${index}`} className="grid grid-cols-3 px-[10px] py-1 text-xs leading-4 hover:bg-gray-750">
                     <div style={{ color: '#ED7088' }}>{order.price.toFixed(parseFloat(pricePrecision) === 0.001 ? 3 : parseFloat(pricePrecision) === 0.01 ? 2 : 1)}</div>
                     <div className="text-white text-right pr-[10px]">{order.size.toFixed(2)}</div>
                     <div className="relative text-white text-right">
                       {order.total.toFixed(2)}
                       <div 
                         className="absolute inset-0 bg-[#4F2325] opacity-30" 
                         style={{ 
                           width: `${barWidth}%`,
                           right: 0,
                           left: 'auto'
                         }}
                       ></div>
                     </div>
                   </div>
                 )
               })}

               {/* Mid Price */}
               <div className="px-[10px] py-2">
                 <div className="text-lg font-bold" style={{ color: '#1FA67D' }}>
                   {orderBook.midPrice.toFixed(parseFloat(pricePrecision) === 0.001 ? 3 : parseFloat(pricePrecision) === 0.01 ? 2 : 1)}
                 </div>
               </div>

               {/* Bid Orders (Buy Orders) */}
               {orderBook.bids.slice(0, 10).map((order, index) => {
                 const maxTotal = Math.max(...orderBook.asks.slice(0, 10).map(o => o.total), ...orderBook.bids.slice(0, 10).map(o => o.total))
                 const barWidth = (order.total / maxTotal) * 100
                 return (
                   <div key={`bid-${index}`} className="grid grid-cols-3 px-[10px] py-1 text-xs leading-4 hover:bg-gray-750">
                     <div style={{ color: '#1FA67D' }}>{order.price.toFixed(parseFloat(pricePrecision) === 0.001 ? 3 : parseFloat(pricePrecision) === 0.01 ? 2 : 1)}</div>
                     <div className="text-white text-right pr-[10px]">{order.size.toFixed(2)}</div>
                     <div className="relative text-white text-right">
                       {order.total.toFixed(2)}
                       <div 
                         className="absolute inset-0 bg-[#1A4723] opacity-30" 
                         style={{ 
                           width: `${barWidth}%`,
                           right: 0,
                           left: 'auto'
                         }}
                       ></div>
                     </div>
                   </div>
                 )
               })}
             </>
           )}
         </div>
      </main>
    </div>
  )
}
