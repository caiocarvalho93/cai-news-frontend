import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, BarChart3, Globe } from "lucide-react";
import API_BASE from "../config/api";

// Sparkline (lightweight inline SVG)
const SparklineChart = ({ data, color = '#00bcd4', height = 60 }) => {
  try {
    const prices = Array.isArray(data?.prices) ? data.prices.map((p) => p[1]) : [];
    if (prices.length < 2) {
      return (
        <div
          style={{
            height,
            background: 'rgba(0, 188, 212, 0.1)',
            borderRadius: 4
          }}
        />
      );
    }
    const width = 280;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const stepX = width / (prices.length - 1);
    const points = prices
      .map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');
    const isUp = prices[prices.length - 1] >= prices[0];
    const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={isUp ? '#34d399' : '#f87171'}
          strokeWidth="2"
          points={points}
        />
        <polygon
          fill={`url(#${gradientId})`}
          points={`${points} ${width},${height} 0,${height}`}
          opacity="0.6"
        />
      </svg>
    );
  } catch {
    return (
      <div
        style={{
          height,
          background: 'rgba(0, 188, 212, 0.08)',
          borderRadius: 4
        }}
      />
    );
  }
};

const GlobalMarketChart = ({ data }) => (
  <div style={{ height: '200px', background: 'rgba(0, 188, 212, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00bcd4' }}>
    Global Market Chart
  </div>
);

const TrendingCoins = ({ coins }) => (
  <div style={{ background: 'rgba(0, 188, 212, 0.1)', borderRadius: '8px', padding: '1rem', color: '#00bcd4' }}>
    Trending Coins Component
  </div>
);

const TopMovers = ({ data }) => (
  <div style={{ background: 'rgba(0, 188, 212, 0.1)', borderRadius: '8px', padding: '1rem', color: '#00bcd4' }}>
    Top Movers Component
  </div>
);

const TopExchanges = ({ exchanges }) => (
  <div style={{ background: 'rgba(0, 188, 212, 0.1)', borderRadius: '8px', padding: '1rem', color: '#00bcd4' }}>
    Top Exchanges Component
  </div>
);
// Simple TrippyCoin placeholder component
const TrippyCoin = ({ size = 24 }) => (
  <div style={{ 
    width: size, 
    height: size, 
    borderRadius: '50%', 
    background: 'linear-gradient(45deg, #ff1493, #ff69b4)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: 'white', 
    fontSize: size * 0.4,
    fontWeight: 'bold'
  }}>
    T
  </div>
);

const CryptoTreasuryDashboard = () => {
  const [cryptoLogos, setCryptoLogos] = useState({});
  const [cryptoMarketData, setCryptoMarketData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced data states
  const [advancedData, setAdvancedData] = useState(null);
  const [globalData, setGlobalData] = useState(null);
  const [trendingCoins, setTrendingCoins] = useState([]);
  const [topMovers, setTopMovers] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [chartData, setChartData] = useState({});
  const [supplyData, setSupplyData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [memeOnly, setMemeOnly] = useState(false);
  const memesRef = useRef(null);
  const [compareA, setCompareA] = useState("bitcoin");
  const [compareB, setCompareB] = useState("ethereum");
  const [favoriteCoins, setFavoriteCoins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favoriteCoins') || '[]'); } catch { return []; }
  });
  const [favoritesFirst, setFavoritesFirst] = useState(() => {
    try { return localStorage.getItem('favoritesFirst') === '1'; } catch { return false; }
  });
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [cryptoNews, setCryptoNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showMood, setShowMood] = useState(true);
  const [newsSummary, setNewsSummary] = useState([]);

  const supportedCoins = [
    { id: "bitcoin", name: "Bitcoin", symbol: "BTC", color: "orange" },
    { id: "ethereum", name: "Ethereum", symbol: "ETH", color: "blue" },
    { id: "solana", name: "Solana", symbol: "SOL", color: "purple" },
    { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", color: "yellow" },
    { id: "ripple", name: "XRP", symbol: "XRP", color: "blue" },
    { id: "litecoin", name: "Litecoin", symbol: "LTC", color: "gray" },
  ];

  // Fetch basic crypto data
  const fetchCryptoData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/crypto-treasury/crypto-logos-data`);
      const result = await response.json();

      if (result.success) {
        setCryptoLogos(result.data.logos || {});
        setCryptoMarketData(result.data.marketData || {});
        console.log("🚀 BASIC CRYPTO DATA LOADED:", Object.keys(result.data.logos || {}).length, "coins");
      }
    } catch (error) {
      console.error("Failed to fetch basic crypto data:", error);
    }
  };

  // Fetch advanced crypto data with fallback
  const fetchAdvancedData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/crypto-treasury/advanced-data`);
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        setAdvancedData(data);
        setGlobalData(data.global);
        setTrendingCoins(data.trending || []);
        setTopMovers(data.topMovers);
        setExchanges(data.exchanges || []);
        setChartData(data.charts || {});
        setSupplyData(data.supply || {});
        setLastUpdated(new Date().toISOString());
        console.log("🚀 ADVANCED DATA LOADED:", {
          trending: data.trending?.length || 0,
          exchanges: data.exchanges?.length || 0,
          charts: Object.keys(data.charts || {}).length
        });
      }
    } catch (error) {
      console.error("Failed to fetch advanced crypto data:", error);
      // Set fallback data to show something immediately
      setGlobalData({
        totalMarketCap: 2400000000000,
        totalVolume: 95000000000,
        marketCapPercentage: { btc: 57.6, eth: 13.2 },
        activeCryptocurrencies: 10847,
        marketCapChange24h: 2.34
      });
      setTrendingCoins([
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', thumb: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png', marketCapRank: 1 },
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', thumb: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png', marketCapRank: 2 },
        { id: 'solana', name: 'Solana', symbol: 'SOL', thumb: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png', marketCapRank: 5 }
      ]);
      setTopMovers({
        topGainers: [
          { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', priceChangePercentage: 5.2, currentPrice: 68000 },
          { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', priceChangePercentage: 3.8, currentPrice: 2600 }
        ],
        topLosers: [
          { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', priceChangePercentage: -2.3, currentPrice: 0.15 }
        ]
      });
      
      // Add mock chart data for sparklines
      const mockCharts = {};
      supportedCoins.forEach(coin => {
        const basePrice = coin.id === 'bitcoin' ? 68000 : coin.id === 'ethereum' ? 2600 : 100;
        const prices = [];
        const now = Date.now();
        for (let i = 6; i >= 0; i--) {
          const timestamp = now - (i * 24 * 60 * 60 * 1000);
          const variation = (Math.random() - 0.5) * 0.1;
          const price = basePrice * (1 + variation);
          prices.push([timestamp, price]);
        }
        mockCharts[coin.id] = { prices, coinId: coin.id, days: 7 };
      });
      setChartData(mockCharts);
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    setIsRefreshing(true);
    
    try {
      // Refresh basic data first (fast)
      await fetchCryptoData();
      
      // Then refresh advanced data (slower)
      await fetchAdvancedData();
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Load basic data immediately, then advanced data
    const loadData = async () => {
      setIsLoading(true);
      await fetchCryptoData();
      setIsLoading(false);
      
      // Load advanced data in background
      setTimeout(() => {
        fetchAdvancedData();
      }, 1000);
    };
    
    loadData();
    
    // Refresh basic data every 30 seconds, advanced data every 5 minutes
    const basicInterval = setInterval(fetchCryptoData, 30000);
    const advancedInterval = setInterval(fetchAdvancedData, 300000);
    
    return () => {
      clearInterval(basicInterval);
      clearInterval(advancedInterval);
    };
  }, []);

  // Read URL param to enable meme-only view
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('memes') === '1') {
        setMemeOnly(true);
        setTimeout(() => {
          if (memesRef.current) {
            memesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
    } catch {}
  }, []);

  // Persist favorites preferences
  useEffect(() => {
    try { localStorage.setItem('favoriteCoins', JSON.stringify(favoriteCoins)); } catch {}
  }, [favoriteCoins]);
  useEffect(() => {
    try { localStorage.setItem('favoritesFirst', favoritesFirst ? '1' : '0'); } catch {}
  }, [favoritesFirst]);

  const toggleFavorite = (coinId) => {
    setFavoriteCoins((prev) => {
      if (prev.includes(coinId)) return prev.filter((c) => c !== coinId);
      return [coinId, ...prev].slice(0, 20);
    });
  };

  const displayedCoins = useMemo(() => {
    if (memeOnly) return [];
    const list = [...supportedCoins];
    if (favoritesFirst && favoriteCoins.length > 0) {
      list.sort((a, b) => {
        const af = favoriteCoins.includes(a.id) ? 1 : 0;
        const bf = favoriteCoins.includes(b.id) ? 1 : 0;
        if (af !== bf) return bf - af;
        return 0;
      });
    }
    return list;
  }, [supportedCoins, favoritesFirst, favoriteCoins, memeOnly]);

  const loadCryptoNews = async () => {
    setNewsLoading(true);
    try {
      // Opportunistically fetch fresh news
      await fetch(`${API_BASE}/api/crypto/news/fetch`, { method: 'POST' }).catch(() => {});
      const r = await fetch(`${API_BASE}/api/crypto/news`).then(r => r.json());
      if (r?.success) {
        setCryptoNews(r.items || []);
      } else {
        setCryptoNews([]);
      }
      const s = await fetch(`${API_BASE}/api/crypto/news/summary`).then(r => r.json()).catch(()=>null);
      if (s?.success) setNewsSummary(s.top || []);
    } catch {
      setCryptoNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  const moodInfo = useMemo(() => {
    // Determine mood from BTC and ETH 24h change (fallback to average of grid)
    const keys = ['bitcoin','ethereum'];
    const changes = keys
      .map(k => cryptoMarketData[k]?.change24h)
      .filter(v => typeof v === 'number');
    const fallback = displayedCoins
      .map(c => cryptoMarketData[c.id]?.change24h)
      .filter(v => typeof v === 'number');
    const arr = changes.length > 0 ? changes : fallback;
    const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    let mood = 'neutral';
    if (avg >= 1.5) mood = 'bull';
    else if (avg <= -1.5) mood = 'bear';
    const line = mood === 'bull'
      ? 'cAI: Markets flexing hard. No jokes—just profits. 🟢'
      : mood === 'bear'
      ? 'cAI: It’s red out there. Deploy memes. Execute diamond hands protocol. 🔴'
      : 'cAI: Sideways vibes. Hydrate, DCA, and touch grass. 🟡';
    return { avg, mood, line };
  }, [cryptoMarketData, displayedCoins]);

  // Expose mood to cAI chat (best-effort)
  useEffect(() => {
    try {
      window.__CRYPTO_MOOD__ = moodInfo.mood;
    } catch {}
  }, [moodInfo.mood]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Command Center</span>
          </Link>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              ₿ Quantum Crypto Treasury
            </h1>
            <p className="text-gray-400 mt-2">Advanced Cryptocurrency Intelligence Dashboard</p>
          </div>
          
          <div className="text-right">
            <button
              onClick={refreshAllData}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50 mb-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={async () => { setShowNewsPanel(true); await loadCryptoNews(); }}
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors mb-2"
            >
              <span>CRYPTO NEWS</span>
            </button>
            <div className="text-sm text-gray-400">Last Updated</div>
            <div className="text-green-400">
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* cAI Crypto Mood banner */}
        {showMood && (
          <div
            className="flex items-center justify-between mb-6"
            style={{
              background: moodInfo.mood === 'bull'
                ? 'linear-gradient(90deg, rgba(16,185,129,0.13), rgba(16,185,129,0.06))'
                : moodInfo.mood === 'bear'
                ? 'linear-gradient(90deg, rgba(239,68,68,0.13), rgba(239,68,68,0.06))'
                : 'linear-gradient(90deg, rgba(234,179,8,0.13), rgba(234,179,8,0.06))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: moodInfo.mood === 'bull' ? '4px solid #34d399' : moodInfo.mood === 'bear' ? '4px solid #f87171' : '4px solid #eab308',
              borderRadius: 12,
              padding: '10px 14px'
            }}
          >
            <div className="flex items-center gap-3">
              <div style={{ fontSize: 20 }}>{moodInfo.mood === 'bull' ? '🐂' : moodInfo.mood === 'bear' ? '🐻' : '🤖'}</div>
              <div>
                <div className="text-sm text-gray-400">cAI Crypto Mode</div>
                <div className="text-white font-semibold">{moodInfo.line}</div>
                <div className="text-gray-500 text-xs">Avg 24h: {moodInfo.avg >= 0 ? '+' : ''}{moodInfo.avg.toFixed(2)}%</div>
              </div>
            </div>
            <button
              className="px-3 py-1 bg-gray-800/70 border border-gray-700/70 rounded-lg text-gray-300 hover:bg-gray-800 text-xs"
              onClick={() => setShowMood(false)}
              title="Hide mood"
            >
              Hide
            </button>
          </div>
        )}

        {/* Favorites toolbar */}
        {!memeOnly && (
          <div className="flex items-center justify-between mb-6">
            <div className="text-gray-400 text-sm">
              Favorite your coins to surface them first.
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`io-switch ${favoritesFirst ? "on" : ""}`}
                onClick={() => setFavoritesFirst(v => !v)}
                title="Show favorites first"
              >
                <div className="knob"></div>
              </div>
              <span className="text-gray-300 text-sm">Favorites first</span>
            </div>
          </div>
        )}

        {/* Watchlist sidebar (sticky) */}
        {!memeOnly && favoriteCoins.length > 0 && (
          <div
            className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 mb-6"
            style={{ maxWidth: 340, marginLeft: 'auto', position: 'sticky', top: 80, zIndex: 5 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold text-white">Watchlist</div>
              <div className="text-gray-500 text-xs">{favoriteCoins.length} coins</div>
            </div>
            <div className="space-y-3">
              {favoriteCoins.map((cid) => {
                const logo = cryptoLogos[cid];
                const m = cryptoMarketData[cid] || {};
                const isPos = (m.change24h || 0) >= 0;
                return (
                  <div
                    key={'wl-'+cid}
                    className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg p-3"
                    title={logo?.name || cid}
                  >
                    <div className="flex items-center gap-3">
                      {logo?.logo ? (
                        <img src={logo.logo} alt={logo.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                          {(logo?.symbol || cid).charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-semibold text-sm">
                          {(logo?.symbol || cid).toUpperCase()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {logo?.name || cid}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: isPos ? '#34d399' : '#f87171' }}>
                        {m.price ? `$${m.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </div>
                      <div className={`text-xs ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                        {isPos ? '+' : ''}{m.change24h?.toFixed(2) ?? '0.00'}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Market Overview */}
        {globalData && !memeOnly && (
          <>
            <div className="mb-8">
              <GlobalMarketChart globalData={globalData} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-gray-400 text-sm">Total Market Cap</div>
                <div className="text-emerald-400 text-xl font-bold">
                  ${(globalData.totalMarketCap || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-gray-400 text-sm">24h Volume</div>
                <div className="text-cyan-400 text-xl font-bold">
                  ${(globalData.totalVolume || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-gray-400 text-sm">BTC Dominance</div>
                <div className="text-yellow-400 text-xl font-bold">
                  {(globalData.marketCapPercentage?.btc || 0).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-gray-400 text-sm">Active Coins</div>
                <div className="text-purple-400 text-xl font-bold">
                  {globalData.activeCryptocurrencies?.toLocaleString() || '—'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Top Section: Trending & Top Movers */}
        {!memeOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <TrendingCoins trendingData={trendingCoins} />
          </div>
          <div className="lg:col-span-2">
            <TopMovers moversData={topMovers} />
          </div>
        </div>
        )}

        {/* Coin Compare */}
        {!isLoading && !memeOnly && (
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold text-white">Coin Compare</div>
              <div className="flex items-center gap-2">
                <select
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200"
                >
                  {supportedCoins.map(c => (
                    <option key={'a-'+c.id} value={c.id}>{(cryptoLogos[c.id]?.symbol || c.symbol)} — {cryptoLogos[c.id]?.name || c.name}</option>
                  ))}
                </select>
                <span className="text-gray-500">vs</span>
                <select
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200"
                >
                  {supportedCoins.map(c => (
                    <option key={'b-'+c.id} value={c.id}>{(cryptoLogos[c.id]?.symbol || c.symbol)} — {cryptoLogos[c.id]?.name || c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[compareA, compareB].map((cid, idx) => {
                const logo = cryptoLogos[cid];
                const m = cryptoMarketData[cid] || {};
                const isPos = (m.change24h || 0) >= 0;
                return (
                  <div key={'cmp-'+idx} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {logo?.logo ? (
                        <img src={logo.logo} alt={logo.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-black font-bold">
                          {(logo?.symbol || cid).charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-semibold">{logo?.name || cid}</div>
                        <div className="text-gray-400 text-sm">{(logo?.symbol || '').toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/40 rounded p-3 text-center">
                        <div className="text-gray-400 text-xs">Price</div>
                        <div className="text-green-400 text-lg font-bold">
                          {m.price ? `$${m.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-900/40 rounded p-3 text-center">
                        <div className="text-gray-400 text-xs">24h Change</div>
                        <div className={`${isPos ? 'text-green-400' : 'text-red-400'} text-lg font-bold`}>
                          {isPos ? '+' : ''}{m.change24h?.toFixed(2) ?? '0.00'}%
                        </div>
                      </div>
                      <div className="bg-gray-900/40 rounded p-3 text-center">
                        <div className="text-gray-400 text-xs">Market Cap</div>
                        <div className="text-blue-400 text-lg font-bold">
                          {m.marketCap ? `$${(m.marketCap/1e9).toFixed(2)}B` : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-900/40 rounded p-3 text-center">
                        <div className="text-gray-400 text-xs">24h Volume</div>
                        <div className="text-purple-400 text-lg font-bold">
                          {m.volume ? `$${(m.volume/1e6).toFixed(2)}M` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading live crypto data...</p>
          </div>
        )}

        {/* Main Crypto Grid */}
        {!isLoading && !memeOnly && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCoins.map((coin, index) => {
              const logoData = cryptoLogos[coin.id];
              const marketData = cryptoMarketData[coin.id];
              const isPositive = (marketData?.change24h || 0) >= 0;
              
              return (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Favorite star */}
                  <button
                    onClick={() => toggleFavorite(coin.id)}
                    title={favoriteCoins.includes(coin.id) ? 'Unfavorite' : 'Favorite'}
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 999,
                      padding: '4px 8px',
                      color: favoriteCoins.includes(coin.id) ? '#ffd700' : '#cccccc',
                      fontWeight: 700
                    }}
                  >
                    {favoriteCoins.includes(coin.id) ? '★' : '☆'}
                  </button>
                  {marketData && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: -30,
                        transform: 'rotate(45deg)',
                        background: isPositive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                        border: isPositive ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(239,68,68,0.6)',
                        color: isPositive ? '#34d399' : '#f87171',
                        fontWeight: 700,
                        width: 160,
                        textAlign: 'center',
                        padding: '6px 0'
                      }}
                    >
                      {isPositive ? 'BULLISH' : 'BEARISH'}
                    </div>
                  )}
                  <div className="flex items-center space-x-4 mb-6">
                    {logoData?.logo ? (
                      <img 
                        src={logoData.logo} 
                        alt={logoData.name}
                        className="w-16 h-16 rounded-full shadow-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-black font-bold text-xl">
                        {coin.symbol.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {logoData?.name || coin.name}
                      </h3>
                      <p className="text-gray-400 text-lg">
                        {logoData?.symbol || coin.symbol}
                      </p>
                    </div>
                  </div>
                  
                  {/* Sparkline Chart */}
                  {chartData[coin.id] && (
                    <div className="mb-4">
                      <SparklineChart 
                        data={chartData[coin.id]} 
                        color={coin.color === 'orange' ? '#f59e0b' : 
                               coin.color === 'blue' ? '#3b82f6' : 
                               coin.color === 'purple' ? '#8b5cf6' : 
                               coin.color === 'yellow' ? '#eab308' : 
                               coin.color === 'gray' ? '#6b7280' : '#f59e0b'} 
                        height={60}
                      />
                    </div>
                  )}

                  {marketData ? (
                    <div className="space-y-4">
                      <div className="text-center py-4 bg-gray-900/50 rounded-lg">
                        <div className="text-3xl font-bold text-green-400">
                          ${marketData.price?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }) || 'N/A'}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">Current Price</div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                        <span className="text-gray-400 flex items-center">
                          {isPositive ? <TrendingUp className="w-4 h-4 mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                          24h Change:
                        </span>
                        <span className={`font-bold text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}
                          {marketData.change24h?.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-lg">
                        <span className="text-gray-400">Market Cap:</span>
                        <span className="text-blue-400 font-semibold">
                          ${((marketData.marketCap || 0) / 1e9).toFixed(2)}B
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-lg">
                        <span className="text-gray-400">24h Volume:</span>
                        <span className="text-purple-400 font-semibold">
                          ${((marketData.volume || 0) / 1e6).toFixed(2)}M
                        </span>
                      </div>

                      {/* Supply Data */}
                      {supplyData[coin.id] && (
                        <div className="p-3 bg-gray-900/30 rounded-lg">
                          <div className="text-sm text-gray-400 mb-2">Supply Information</div>
                          <div className="space-y-1 text-sm">
                            {supplyData[coin.id].circulating && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Circulating:</span>
                                <span className="text-cyan-400">
                                  {(supplyData[coin.id].circulating / 1e6).toFixed(2)}M
                                </span>
                              </div>
                            )}
                            {supplyData[coin.id].max && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Max Supply:</span>
                                <span className="text-yellow-400">
                                  {(supplyData[coin.id].max / 1e6).toFixed(2)}M
                                </span>
                              </div>
                            )}
                            {supplyData[coin.id].percentage && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Mined:</span>
                                <span className="text-green-400">
                                  {supplyData[coin.id].percentage}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-700 rounded"></div>
                      </div>
                      <p className="text-gray-400 mt-4">Loading market data...</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* TRIPPY Coin Special Section */}
        <div className="mt-12 mb-8">
          <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-yellow-500/20 border border-pink-500/30 rounded-xl p-8 text-center">
            <div className="flex flex-col items-center">
              <TrippyCoin size={48} />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent mt-4">
                TRIPPY COIN
              </h3>
              <p className="text-gray-300 text-lg mt-2">The Future Is Trippy 🌸</p>
              <div className="flex items-center space-x-4 mt-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-pink-400">$0.0420</div>
                  <div className="text-sm text-gray-400">Current Price</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">+69.42%</div>
                  <div className="text-sm text-gray-400">24h Change</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">∞</div>
                  <div className="text-sm text-gray-400">Market Cap</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Memes */}
        <div ref={memesRef}>
          <CryptoMemesSection apiBase={API_BASE} memeOnly={memeOnly} setMemeOnly={setMemeOnly} />
        </div>

        {/* Slide-in Crypto News Panel */}
        {showNewsPanel && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "440px",
              height: "100vh",
              background: "linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 188, 212, 0.08))",
              backdropFilter: "blur(12px)",
              borderLeft: "2px solid rgba(0,255,255,0.4)",
              zIndex: 10000,
              padding: "1rem",
              overflowY: "auto",
              boxShadow: "-10px 0 30px rgba(0, 188, 212, 0.3)"
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xl font-bold text-cyan-300">CRYPTO NEWS</div>
              <button
                onClick={() => setShowNewsPanel(false)}
                className="px-3 py-1 bg-gray-800/70 border border-gray-700/70 rounded-lg text-gray-300 hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            {newsLoading ? (
              <div className="text-gray-400">Loading news...</div>
            ) : cryptoNews.length === 0 ? (
              <div className="text-gray-400">No crypto news yet. Try again shortly.</div>
            ) : (
              <div className="space-y-3">
                {newsSummary.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-1">Top coins in headlines</div>
                    <div className="flex flex-wrap gap-2">
                      {newsSummary.map((t) => (
                        <span key={t.symbol} className="px-2 py-1 rounded bg-gray-800/70 border border-gray-700/60 text-gray-200 text-xs">
                          {t.symbol} <span className="text-cyan-300">+{t.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {cryptoNews.map((a, i) => (
                  <div key={a.id || i} className="bg-gray-900/50 border border-gray-800/70 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">{a.source}</div>
                    <div className="text-white font-semibold mb-1">
                      {a.title}
                    </div>
                    {a.image_url ? (
                      <img src={a.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
                    ) : null}
                    <div className="text-gray-400 text-sm mb-2">
                      {a.description?.length > 140 ? a.description.slice(0, 140) + '...' : a.description}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {a.published_at ? new Date(a.published_at).toLocaleString() : ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/article/${a.id || 'unknown'}${a.url ? `?url=${encodeURIComponent(a.url)}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-300 hover:underline text-sm"
                        >
                          Open
                        </a>
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:underline text-sm"
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top Exchanges Section */}
        {exchanges.length > 0 && !memeOnly && (
          <div className="mt-12">
            <TopExchanges exchangesData={exchanges} />
          </div>
        )}

        <div className="mt-12 text-center">
          {!memeOnly && (
            <p className="text-gray-500 text-sm">
              Data provided by CoinGecko API • Basic data updates every 30s • Advanced data every 5min
            </p>
          )}
          <div className="mt-2 flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">Live Prices</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm">Advanced Analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm">Global Markets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoTreasuryDashboard;

function CryptoMemesSection({ apiBase, memeOnly, setMemeOnly }) {
  const [memes, setMemes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [paused, setPaused] = React.useState(false);
  const scrollerRef = React.useRef(null);
  const rafRef = React.useRef(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${apiBase}/api/crypto/memes`).then(r => r.json());
      if (r?.success) setMemes(r.items || []);
      else setError(r?.error || 'Failed to load memes');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  // Autoplay horizontal scroller for Top Memes
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let dir = 1;
    const tick = () => {
      try {
        if (!paused) {
          el.scrollLeft += 1.2 * dir;
          if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) dir = -1;
          if (el.scrollLeft <= 2) dir = 1;
        }
      } catch {}
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, memes.length]);

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          🧪 Crypto Memes (Community Fun)
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`io-switch ${memeOnly ? "on" : ""}`}
            onClick={() => setMemeOnly(v => !v)}
            title="Meme-only mode"
          >
            <div className="knob"></div>
          </div>
          <span className="text-cyan-300 text-sm">Meme-only</span>
          <button
            onClick={() => {
              try {
                const params = new URLSearchParams(window.location.search);
                if (memeOnly) {
                  params.delete('memes');
                } else {
                  params.set('memes', '1');
                }
                const qs = params.toString();
                const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
                window.history.replaceState(null, "", next);
              } catch {}
              setMemeOnly(!memeOnly);
            }}
            className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            title="Share meme-only link"
          >
            Share
          </button>
          <button
            onClick={load}
            className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-gray-400">Loading memes...</div>
      ) : error ? (
        <div className="text-red-400">Error: {error}</div>
      ) : memes.length === 0 ? (
        <div className="text-gray-400">No memes found right now.</div>
      ) : (
        <>
        {/* Top Memes scroller */}
        <div
          className="mb-4 overflow-x-auto"
          style={{ scrollBehavior: 'smooth' }}
          ref={scrollerRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex gap-3" style={{ minWidth: 320, paddingBottom: 4 }}>
            {memes.slice(0, 12).map((m, i) => (
              <div key={'top-'+i} className="min-w-[200px] bg-gray-800/60 border border-gray-700/50 rounded-xl p-2">
                <div className="rounded overflow-hidden">
                  <img
                    src={m.url}
                    alt={m.title}
                    style={{ width: 196, height: 110, objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <a
                  href={m.post || m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:underline text-xs block mt-1 line-clamp-1"
                >
                  {m.title}
                </a>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {memes.map((m, i) => (
            <div key={m.url + i} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
              <div className="text-sm text-gray-300 mb-2 line-clamp-2">{m.title}</div>
              <div className="rounded overflow-hidden">
                <img
                  src={m.url}
                  alt={m.title}
                  style={{ width: '100%', height: 220, objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <MemeActions title={m.title} url={m.url} post={m.post} />
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function MemeActions({ title, url, post }) {
  const [downloading, setDownloading] = React.useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(post || url);
    } catch {}
  };
  const downloadImg = async () => {
    try {
      setDownloading(true);
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (title || 'meme').replace(/\s+/g, '_') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-2 flex items-center justify-between">
      <a
        href={post || url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-300 hover:underline text-sm"
      >
        View Source →
      </a>
      <div className="flex items-center gap-2">
        <button
          className="text-xs px-2 py-1 bg-gray-700/60 border border-gray-600/60 rounded text-gray-200 hover:bg-gray-700"
          onClick={copyLink}
          title="Copy link"
        >
          Copy
        </button>
        <button
          className="text-xs px-2 py-1 bg-emerald-600/30 border border-emerald-500/50 rounded text-emerald-300 hover:bg-emerald-600/40 disabled:opacity-50"
          onClick={downloadImg}
          disabled={downloading}
          title="Download image"
        >
          {downloading ? '...' : 'Download'}
        </button>
      </div>
    </div>
  );
}