import axios from 'axios';

// HyperLiquid API endpoints
const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_WS_BASE = 'wss://api.hyperliquid.xyz/ws';

// Types for HyperLiquid API responses
export interface HyperLiquidOrder {
  px: string;
  sz: string;
}

export interface HyperLiquidOrderBook {
  coin: string;
  levels: [HyperLiquidOrder[], HyperLiquidOrder[]]; // [bids, asks]
  time: number;
}

export interface HyperLiquidAsset {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  onlyIsolated: boolean;
}

export interface HyperLiquidMeta {
  universe: HyperLiquidAsset[];
}

export interface HyperLiquidUserFill {
  coin: string;
  px: string;
  sz: string;
  side: 'B' | 'A'; // B = Buy (long), A = Sell (short)
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
}

export interface HyperLiquidUserState {
  assetPositions: any[];
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: any;
  marginSummary: any;
  time: number;
  withdrawable: string;
}

// API Service class
export class HyperLiquidAPI {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentCoin: string | null = null;

  // Get available assets
  async getAssets(): Promise<HyperLiquidAsset[]> {
    try {
      const response = await axios.post(HYPERLIQUID_API_BASE, {
        type: 'meta'
      });
      const meta: HyperLiquidMeta = response.data;
      return meta.universe;
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  }

  // Get order book for a specific asset
  async getOrderBook(coin: string): Promise<HyperLiquidOrderBook> {
    try {
      const response = await axios.post(HYPERLIQUID_API_BASE, {
        type: 'l2Book',
        coin: coin
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  // Get user fills (trades) for a specific user
  async getUserFills(user: string): Promise<HyperLiquidUserFill[]> {
    try {
      console.log('Making API call to:', HYPERLIQUID_API_BASE);
      console.log('Request payload:', { type: 'userFills', user: user });
      
      const response = await axios.post(HYPERLIQUID_API_BASE, {
        type: 'userFills',
        user: user
      });
      
      console.log('API response status:', response.status);
      console.log('API response data:', response.data);
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user fills:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      throw error;
    }
  }

  // Get user state for a specific user
  async getUserState(user: string): Promise<HyperLiquidUserState> {
    try {
      const response = await axios.post(HYPERLIQUID_API_BASE, {
        type: 'clearinghouseState',
        user: user
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user state:', error);
      throw error;
    }
  }

  // Connect to WebSocket for real-time updates
  connectWebSocket(
    coin: string,
    onOrderBookUpdate: (orderBook: HyperLiquidOrderBook) => void,
    onError?: (error: Event) => void
  ): void {
    try {
      // Store current coin
      this.currentCoin = coin;
      
      // Disconnect any existing connection first
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.ws = new WebSocket(HYPERLIQUID_WS_BASE);

      this.ws.onopen = () => {
        console.log('WebSocket connected for', coin);
        this.reconnectAttempts = 0;
        
        // Use a more robust approach to ensure WebSocket is ready
        const sendSubscription = () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentCoin === coin) {
            try {
              this.ws.send(JSON.stringify({
                method: 'subscribe',
                subscription: {
                  type: 'l2Book',
                  coin: coin
                }
              }));
              console.log(`Subscription sent successfully for ${coin}`);
            } catch (error) {
              console.error('Error sending subscription:', error);
            }
          } else if (this.currentCoin !== coin) {
            console.log('Coin changed during connection, aborting subscription for', coin);
          } else {
            console.log('WebSocket not ready, retrying...');
            setTimeout(sendSubscription, 50);
          }
        };
        
        // Start the subscription process
        sendSubscription();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.channel === 'l2Book' && data.data && this.currentCoin === coin) {
            console.log('Received order book update for', coin);
            onOrderBookUpdate(data.data);
          } else if (this.currentCoin !== coin) {
            console.log('Ignoring message for different coin:', data.channel, 'current:', this.currentCoin, 'expected:', coin);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.reconnect(coin, onOrderBookUpdate, onError);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      onError?.(error as Event);
    }
  }

  // Reconnect WebSocket
  private reconnect(
    coin: string,
    onOrderBookUpdate: (orderBook: HyperLiquidOrderBook) => void,
    onError?: (error: Event) => void
  ): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      
      setTimeout(() => {
        this.connectWebSocket(coin, onOrderBookUpdate, onError);
      }, 1000 * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.ws) {
      console.log('Disconnecting WebSocket for', this.currentCoin);
      this.ws.close();
      this.ws = null;
    }
    this.currentCoin = null;
  }

  // Check if currently connected to a specific coin
  isConnectedTo(coin: string): boolean {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN && this.currentCoin === coin);
  }

  // Convert HyperLiquid order to our format
  static convertOrderBook(hyperliquidOrderBook: HyperLiquidOrderBook, precision: number = 3) {
    const [bids, asks] = hyperliquidOrderBook.levels;
    
    const formatOrder = (order: HyperLiquidOrder) => ({
      price: parseFloat(order.px),
      size: parseFloat(order.sz),
      total: parseFloat(order.sz)
    });

    const formatOrders = (orders: HyperLiquidOrder[]) => {
      let runningTotal = 0;
      return orders.map(order => {
        runningTotal += parseFloat(order.sz);
        return {
          price: parseFloat(order.px),
          size: parseFloat(order.sz),
          total: runningTotal
        };
      });
    };

    return {
      bids: formatOrders(bids),
      asks: formatOrders(asks),
      midPrice: bids.length > 0 && asks.length > 0 
        ? (parseFloat(bids[0].px) + parseFloat(asks[0].px)) / 2 
        : 0
    };
  }

  // Process user fills to reconstruct completed trades
  static processCompletedTrades(fills: HyperLiquidUserFill[]) {
    console.log('Processing fills:', fills);
    console.log('Number of fills:', fills.length);
    
    const completedTrades: Array<{
      coin: string;
      direction: 'long' | 'short';
      openingTime: string;
      duration: string;
      realizedPnL: number;
    }> = [];

    if (!fills || fills.length === 0) {
      console.log('No fills to process');
      return completedTrades;
    }

    // Group fills by coin to reconstruct positions
    const coinMap = new Map<string, Array<HyperLiquidUserFill>>();
    
    fills.forEach(fill => {
      console.log('Processing fill:', fill);
      if (!coinMap.has(fill.coin)) {
        coinMap.set(fill.coin, []);
      }
      coinMap.get(fill.coin)!.push(fill);
    });

    console.log('Coin map:', coinMap);

    // Process each coin's fills to find completed trades
    coinMap.forEach((coinFills, coin) => {
      console.log(`Processing coin ${coin} with ${coinFills.length} fills`);
      
      // Sort fills by time
      coinFills.sort((a, b) => a.time - b.time);
      
      // Track position size to identify when positions are opened and closed
      let positionSize = 0;
      let openTime: number | null = null;
      let totalPnL = 0;
      let positionDirection: 'long' | 'short' | null = null;
      
      coinFills.forEach((fill, index) => {
        const fillSize = parseFloat(fill.sz);
        const closedPnl = parseFloat(fill.closedPnl || '0');
        const isLong = fill.side === 'B';
        
        console.log(`Fill ${index}:`, {
          side: fill.side,
          size: fillSize,
          closedPnl,
          isLong,
          time: new Date(fill.time).toLocaleString()
        });
        
        // Determine position direction from first trade
        if (positionDirection === null) {
          positionDirection = isLong ? 'long' : 'short';
        }
        
        // Update position size
        if (isLong) {
          positionSize += fillSize;
        } else {
          positionSize -= fillSize;
        }
        
        // Position opened
        if (openTime === null && positionSize !== 0) {
          openTime = fill.time;
          console.log(`Position opened at ${new Date(openTime).toLocaleString()}, size: ${positionSize}`);
        }
        
        // Add to total PnL
        totalPnL += closedPnl;
        
        // Position closed (size back to 0 or very close to 0)
        if (openTime !== null && Math.abs(positionSize) < 0.0001) {
          const duration = fill.time - openTime;
          const durationHours = Math.floor(duration / (1000 * 60 * 60));
          const durationMinutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
          
          console.log(`Position closed at ${new Date(fill.time).toLocaleString()}, PnL: ${totalPnL}`);
          
          completedTrades.push({
            coin,
            direction: positionDirection!,
            openingTime: new Date(openTime).toLocaleString(),
            duration: `${durationHours}h ${durationMinutes}m`,
            realizedPnL: totalPnL
          });
          
          // Reset for next position
          openTime = null;
          totalPnL = 0;
          positionDirection = null;
        }
      });
    });

    console.log('Completed trades found:', completedTrades);
    
    // Sort by opening time (most recent first)
    return completedTrades.sort((a, b) => new Date(b.openingTime).getTime() - new Date(a.openingTime).getTime());
  }
}

export default HyperLiquidAPI;
