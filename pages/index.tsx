import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>OrderBook - Home</title>
        <meta name="description" content="OrderBook application built with Next.js and Tailwind CSS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-white">
            OrderBook
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            Real-time cryptocurrency order book data
          </p>
          
          <div className="space-y-4">
            <Link href="/orderbook">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 w-full">
                View Order Book
              </button>
            </Link>
            <div className='h-2'></div>
            <Link href="/data-understanding">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 w-full">
                Data Understanding
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}