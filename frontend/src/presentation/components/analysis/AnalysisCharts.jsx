import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import '@/css/components/analysis/analysis-charts.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalysisCharts = ({ data, history, filters, loading }) => {
  const [activeChart, setActiveChart] = useState('trends');
  const [chartData, setChartData] = useState({});
  const chartsRef = useRef(null);

  useEffect(() => {
    if (history && history.length > 0) {
      generateChartData();
    }
  }, [history, filters]);

  const generateChartData = () => {
    const filteredHistory = filterHistory(history, filters);
    
    // Generate trends chart data
    const trendsData = generateTrendsData(filteredHistory);
    
    // Generate types chart data
    const typesData = generateTypesData(filteredHistory);
    
    // Generate distribution chart data
    const distributionData = generateDistributionData(filteredHistory);
    
    // Generate activity chart data
    const activityData = generateActivityData(filteredHistory);

    setChartData({
      trends: trendsData,
      types: typesData,
      distribution: distributionData,
      activity: activityData
    });
  };

  const filterHistory = (history, filters) => {
    let filtered = [...history];

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoffDate);
    }

    // Filter by analysis type
    if (filters.analysisType !== 'all') {
      filtered = filtered.filter(item => item.type === filters.analysisType);
    }

    return filtered;
  };

  const generateTrendsData = (history) => {
    const sortedHistory = history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const labels = sortedHistory.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleDateString();
    });

    const data = sortedHistory.map(item => item.size || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Analysis Size (bytes)',
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const generateTypesData = (history) => {
    const typeCounts = {};
    
    history.forEach(item => {
      const type = item.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);

    return {
      labels,
      datasets: [
        {
          label: 'Analysis Types',
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const generateDistributionData = (history) => {
    const sizeRanges = {
      '0-1KB': 0,
      '1-10KB': 0,
      '10-100KB': 0,
      '100KB-1MB': 0,
      '1MB+': 0
    };

    history.forEach(item => {
      const size = item.size || 0;
      if (size < 1024) sizeRanges['0-1KB']++;
      else if (size < 10240) sizeRanges['1-10KB']++;
      else if (size < 102400) sizeRanges['10-100KB']++;
      else if (size < 1048576) sizeRanges['100KB-1MB']++;
      else sizeRanges['1MB+']++;
    });

    return {
      labels: Object.keys(sizeRanges),
      datasets: [
        {
          label: 'File Size Distribution',
          data: Object.values(sizeRanges),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const generateActivityData = (history) => {
    const hourlyActivity = new Array(24).fill(0);
    
    history.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: 'Analysis Activity by Hour',
          data: hourlyActivity,
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Analysis Data Visualization'
      }
    }
  };

  const renderChart = () => {
    if (!chartData[activeChart]) {
      return (
        <div className="chart-placeholder">
          <p>No data available for this chart</p>
        </div>
      );
    }

    const data = chartData[activeChart];
    const options = { ...chartOptions };

    switch (activeChart) {
      case 'trends':
        return <Line data={data} options={options} />;
      case 'types':
        return <Bar data={data} options={options} />;
      case 'distribution':
        return <Pie data={data} options={options} />;
      case 'activity':
        return <Bar data={data} options={options} />;
      default:
        return <Line data={data} options={options} />;
    }
  };

  if (loading) {
    return (
      <div className="analysis-charts loading">
        <div className="loading-spinner"></div>
        <p>Loading charts...</p>
      </div>
    );
  }

  return (
    <div className="analysis-charts" ref={chartsRef}>
      <div className="charts-header">
        <h3>📈 Analysis Charts</h3>
        <div className="chart-controls">
          <button
            onClick={() => setActiveChart('trends')}
            className={`chart-btn ${activeChart === 'trends' ? 'active' : ''}`}
          >
            📈 Trends
          </button>
          <button
            onClick={() => setActiveChart('types')}
            className={`chart-btn ${activeChart === 'types' ? 'active' : ''}`}
          >
            📊 Types
          </button>
          <button
            onClick={() => setActiveChart('distribution')}
            className={`chart-btn ${activeChart === 'distribution' ? 'active' : ''}`}
          >
            🥧 Distribution
          </button>
          <button
            onClick={() => setActiveChart('activity')}
            className={`chart-btn ${activeChart === 'activity' ? 'active' : ''}`}
          >
            ⏰ Activity
          </button>
        </div>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      {!history || history.length === 0 ? (
        <div className="no-data-message">
          <p>No analysis data available. Run an analysis to see charts.</p>
        </div>
      ) : null}
    </div>
  );
};

export default AnalysisCharts; 