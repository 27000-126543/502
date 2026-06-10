import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { statsApi } from '../api';
import ReactECharts from 'echarts-for-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ELEMENTS = ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'thunder', 'ice'];
const ELEMENT_NAMES: Record<string, string> = {
  fire: '火', water: '水', earth: '土', wind: '风',
  light: '光', dark: '暗', thunder: '雷', ice: '冰'
};
const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff4444', water: '#4488ff', earth: '#aa8844', wind: '#44ffaa',
  light: '#ffff88', dark: '#aa44ff', thunder: '#ffff00', ice: '#88ddff'
};

export default function StatsReport() {
  const { player } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const s = await statsApi.weekly();
      setStats(s);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { backgroundColor: '#0a0e27', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`符文研究周报_${new Date().toLocaleDateString('zh-CN')}.pdf`);
    } catch (e) {
      alert('导出失败，请重试');
    }
  };

  if (loading) {
    return <div className="card loading">📊 正在加载研究报告...</div>;
  }

  const heatmapData = ELEMENTS.map((e, i) => [i, 0, stats?.runeUsage?.[e] || 0]);
  const heatmapOption = {
    tooltip: {},
    grid: { height: '50%', top: '10%' },
    xAxis: {
      type: 'category',
      data: ELEMENTS.map(e => ELEMENT_NAMES[e]),
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      data: ['使用率'],
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: Math.max(...Object.values(stats?.runeUsage || { 0: 10 })) as number,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027'] }
    },
    series: [{
      type: 'heatmap',
      data: heatmapData,
      label: { show: true, color: '#fff' },
      itemStyle: { borderColor: '#000', borderWidth: 1 }
    }]
  };

  const winRateOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '10%', right: '5%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: stats?.winRateCurve?.map((d: any) => d.date) || [],
      axisLabel: { color: '#aabbcc' }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#aabbcc' }
    },
    series: [{
      type: 'line',
      data: stats?.winRateCurve?.map((d: any) => d.winRate) || [],
      smooth: true,
      lineStyle: { color: '#6644ff', width: 3 },
      itemStyle: { color: '#aa88ff' },
      areaStyle: { color: 'rgba(102,68,255,0.3)' },
      symbol: 'circle',
      symbolSize: 8
    }]
  };

  const radarOption = player?.radarData ? {
    tooltip: {},
    radar: {
      indicator: player.radarData.indicators.map((n: string) => ({ name: n, max: 100 })),
      splitArea: { areaStyle: { color: ['rgba(102,68,255,0.05)', 'rgba(102,68,255,0.1)'] } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: player.radarData.values,
        name: '我的阵法',
        areaStyle: { color: 'rgba(102,68,255,0.3)' },
        lineStyle: { color: '#6644ff', width: 2 },
        itemStyle: { color: '#aa88ff' }
      }]
    }]
  } : null;

  const priceSeries = ELEMENTS.filter(e => stats?.priceTrends?.[e]?.some((p: any) => p.avg > 0)).map(e => ({
    name: ELEMENT_NAMES[e],
    type: 'line',
    smooth: true,
    data: stats?.priceTrends?.[e]?.map((p: any) => p.avg) || [],
    lineStyle: { color: ELEMENT_COLORS[e], width: 2 },
    itemStyle: { color: ELEMENT_COLORS[e] }
  }));

  const priceOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: priceSeries.map(s => s.name), textStyle: { color: '#aabbcc' } },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: stats?.priceTrends?.[ELEMENTS[0]]?.map((p: any) => p.date) || [],
      axisLabel: { color: '#aabbcc' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#aabbcc' }
    },
    series: priceSeries
  };

  return (
    <div>
      <div className="card mb-20">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{ marginBottom: 0 }}>📊 符文研究周报</div>
          <button className="btn btn-success" onClick={exportPDF}>
            📥 导出PDF报告
          </button>
        </div>
        <p style={{ color: '#8899bb', marginTop: 10 }}>
          生成时间: {new Date(stats?.generatedAt || Date.now()).toLocaleString('zh-CN')}
        </p>
      </div>

      <div ref={reportRef as any}>
        <div className="grid-3 mb-20">
          <div className="card stats-card">
            <div className="stats-value">{stats?.totalBattles || 0}</div>
            <div className="stats-label">⚔️ 本周战斗场次</div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">
              {Object.values(stats?.runeUsage || {}).reduce((a: number, b: number) => a + b, 0)}
            </div>
            <div className="stats-label">🔮 符文使用总数</div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{player?.runes?.length || 0}</div>
            <div className="stats-label">🎒 我的符文收藏</div>
          </div>
        </div>

        <div className="grid-2 mb-20">
          <div className="card">
            <div className="card-title">🔥 各元素符文使用率热力图</div>
            <ReactECharts option={heatmapOption} style={{ height: 280 }} />
          </div>

          <div className="card">
            <div className="card-title">📈 本周阵法胜率曲线</div>
            <ReactECharts option={winRateOption} style={{ height: 280 }} />
          </div>
        </div>

        <div className="grid-2 mb-20">
          <div className="card">
            <div className="card-title">⚡ 我的阵法能量雷达图</div>
            {radarOption && <ReactECharts option={radarOption} style={{ height: 320 }} />}
          </div>

          <div className="card">
            <div className="card-title">💰 符文交易价格走势</div>
            <ReactECharts option={priceOption} style={{ height: 320 }} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">✨ 各元素详细数据</div>
          <table className="table">
            <thead>
              <tr>
                <th>元素</th>
                <th>使用次数</th>
                <th>占比</th>
                <th>均价（7日）</th>
              </tr>
            </thead>
            <tbody>
              {ELEMENTS.map(e => {
                const total = Object.values(stats?.runeUsage || {}).reduce((a: number, b: number) => a + b, 0);
                const usage = stats?.runeUsage?.[e] || 0;
                const prices = stats?.priceTrends?.[e] || [];
                const validPrices = prices.filter((p: any) => p.avg > 0);
                const avgPrice = validPrices.length > 0
                  ? Math.round(validPrices.reduce((a: number, b: any) => a + b.avg, 0) / validPrices.length)
                  : 0;
                return (
                  <tr key={e}>
                    <td>
                      <span style={{ color: ELEMENT_COLORS[e], fontWeight: 'bold' }}>
                        {ELEMENT_NAMES[e]}
                      </span>
                    </td>
                    <td>{usage}</td>
                    <td>{total > 0 ? ((usage / total) * 100).toFixed(1) : 0}%</td>
                    <td style={{ color: '#ffdd44' }}>{avgPrice.toLocaleString()} 金币</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
