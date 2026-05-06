import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import './App.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RatePoint {
  timestamp: number; // ms from API
  rate: number;
}

type TimeRange = '24H' | '7D' | '30D' | 'Todo';

const RANGE_LABELS: TimeRange[] = ['24H', '7D', '30D', 'Todo'];

const RANGE_MS: Record<TimeRange, number> = {
  '24H':  86_400_000,
  '7D':   604_800_000,
  '30D':  2_592_000_000,
  'Todo': Infinity,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByRange(data: RatePoint[], range: TimeRange): RatePoint[] {
  const cutoff = range === 'Todo' ? 0 : Date.now() - RANGE_MS[range];
  return data.filter((d) => d.timestamp >= cutoff);
}

function toChartData(data: RatePoint[]): { time: UTCTimestamp; value: number }[] {
  const map = new Map<number, number>();
  for (const d of data) map.set(Math.floor(d.timestamp / 1000), d.rate);
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ time: t as UTCTimestamp, value: v }));
}

const fmtRate = (v?: number) => (v != null ? v.toFixed(2) : '—');

function fmtTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} `
    + `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const sellRef      = useRef<ISeriesApi<'Area'> | null>(null);
  const buyRef       = useRef<ISeriesApi<'Line'> | null>(null);

  const [sellData,   setSellData]   = useState<RatePoint[]>([]);
  const [buyData,    setBuyData]    = useState<RatePoint[]>([]);
  const [range,      setRange]      = useState<TimeRange>('7D');
  const [showBuy,    setShowBuy]    = useState(true);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const tg       = (window as any).Telegram?.WebApp;
  const bgColor  = tg?.themeParams?.bg_color  ?? '#17212b';
  const txtColor = tg?.themeParams?.text_color ?? '#c5c8ce';

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const [sRes, bRes] = await Promise.all([
      fetch('/api/exchange-rates?limit=300&tradeType=SELL'),
      fetch('/api/exchange-rates?limit=300&tradeType=BUY'),
    ]);
    if (!sRes.ok || !bRes.ok) throw new Error('fetch failed');
    const [sell, buy]: [RatePoint[], RatePoint[]] = await Promise.all([sRes.json(), bRes.json()]);
    setSellData(sell);
    setBuyData(buy);
  }, []);

  useEffect(() => {
    fetchData()
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await fetchData().catch(() => setError('Error al actualizar'));
    setRefreshing(false);
  };

  // ── Create chart (lazy — only once data arrives, so container has real width)
  //    The container div is always rendered in the DOM. Creating the chart on
  //    initial mount would give clientWidth=0 while the app is still loading
  //    its first paint, so we defer until we have data to display.

  useEffect(() => {
    if (!containerRef.current || chartRef.current || sellData.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: txtColor,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { labelBackgroundColor: '#2b3a4a' },
        horzLine: { labelBackgroundColor: '#2b3a4a' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width:  containerRef.current.clientWidth,
      height: 280,
    });

    sellRef.current = chart.addAreaSeries({
      lineColor:              '#2ed573',
      topColor:               'rgba(46,213,115,0.25)',
      bottomColor:            'rgba(46,213,115,0)',
      lineWidth:              2,
      priceLineVisible:       true,
      priceLineColor:         'rgba(46,213,115,0.4)',
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  4,
    });

    buyRef.current = chart.addLineSeries({
      color:                  '#54a0ff',
      lineWidth:              1,
      lineStyle:              2, // Dashed
      priceLineVisible:       false,
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  3,
    });

    chartRef.current = chart;

    const onResize = () => {
      containerRef.current && chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      sellRef.current  = null;
      buyRef.current   = null;
    };
  }, [sellData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push data whenever source data or range changes ────────────────────────

  useEffect(() => {
    if (!sellRef.current || !buyRef.current || !chartRef.current) return;
    sellRef.current.setData(toChartData(filterByRange(sellData, range)));
    buyRef.current.setData(toChartData(filterByRange(buyData, range)));
    chartRef.current.timeScale().fitContent();
  }, [sellData, buyData, range]);

  // ── Toggle BUY line ────────────────────────────────────────────────────────

  useEffect(() => {
    buyRef.current?.applyOptions({ visible: showBuy });
  }, [showBuy]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const fSell     = filterByRange(sellData, range);
  const fBuy      = filterByRange(buyData,  range);
  const latest    = fSell[fSell.length - 1];
  const first     = fSell[0];
  const latestBuy = fBuy[fBuy.length - 1];
  const sellRates = fSell.map((d) => d.rate);
  const maxSell   = sellRates.length ? Math.max(...sellRates) : undefined;
  const minSell   = sellRates.length ? Math.min(...sellRates) : undefined;
  const change    = latest && first ? latest.rate - first.rate : 0;
  const changePct = first?.rate ? (change / first.rate) * 100 : 0;
  const hasData   = !loading && fSell.length > 0;

  const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const changeSign  = change > 0 ? '+' : '';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app" style={{ background: bgColor, color: txtColor }}>

      {/* Loading state */}
      {loading && (
        <div className="center-state">
          <div className="spinner" />
          Cargando…
        </div>
      )}

      {/* Fatal error */}
      {!loading && error && sellData.length === 0 && (
        <div className="center-state">
          <span className="error-text">{error}</span>
          <button className="range-btn active" onClick={handleRefresh}>Reintentar</button>
        </div>
      )}

      {/* Main UI */}
      {hasData && (
        <>
          <div className="header">
            <div className="header-left">
              <div className="label">USDT → BOB</div>
              <div className="price">{fmtRate(latest?.rate)}</div>
              <div className={`change ${changeClass}`}>
                {changeClass === 'up' ? '▲' : changeClass === 'down' ? '▼' : '—'}{' '}
                {changeSign}{Math.abs(change).toFixed(2)} ({changeSign}{Math.abs(changePct).toFixed(2)}%)
              </div>
            </div>
            <button
              className={`refresh-btn${refreshing ? ' spinning' : ''}`}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Actualizar"
            >
              ↻
            </button>
          </div>

          <div className="stats">
            {[
              { label: 'Venta',  value: fmtRate(latest?.rate),  cls: 'sell' },
              { label: 'Compra', value: fmtRate(latestBuy?.rate), cls: 'buy' },
              { label: 'Máx',    value: fmtRate(maxSell),        cls: '' },
              { label: 'Mín',    value: fmtRate(minSell),        cls: '' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="stat">
                <span className="stat-label">{label}</span>
                <span className={`stat-value${cls ? ` ${cls}` : ''}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="controls">
            <div className="range-btns">
              {RANGE_LABELS.map((r) => (
                <button
                  key={r}
                  className={`range-btn${range === r ? ' active' : ''}`}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="legend">
              <button className="legend-btn sell-btn" disabled>● Venta</button>
              <button
                className={`legend-btn buy-btn${showBuy ? '' : ' off'}`}
                onClick={() => setShowBuy((v) => !v)}
              >
                ● Compra
              </button>
            </div>
          </div>
        </>
      )}

      {/* Chart container — always in DOM so ref is available when chart is created.
          Hidden only when there is no data for the selected range. */}
      <div
        ref={containerRef}
        className="chart-wrap"
        style={{ visibility: hasData ? 'visible' : 'hidden' }}
      />

      {/* Empty-range notice */}
      {!loading && sellData.length > 0 && fSell.length === 0 && (
        <div className="no-data">Sin datos para este período</div>
      )}

      {hasData && latest && (
        <div className="footer">
          {fSell.length} lecturas · última {fmtTimestamp(latest.timestamp)}
          {error && <span style={{ color: '#ff5555', marginLeft: 6 }}>· {error}</span>}
        </div>
      )}

    </div>
  );
}
