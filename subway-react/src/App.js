import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import StationSankeyFlow from './components/StationSankeyFlow';

const API_BASE_URL = 'http://1.92.133.245:5000/api';
function App() {
  const [stationData, setStationData] = useState([]);
  const [flowData, setFlowData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(24);
  const [stationAnalysis, setStationAnalysis] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationTypeData, setStationTypeData] = useState(null);
  const [stationPoisData, setStationPoisData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取站点数据
        const stationsResponse = await fetch(`${API_BASE_URL}/stations`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!stationsResponse.ok) {
          throw new Error('Failed to fetch station data');
        }
        const stations = await stationsResponse.json();
        
        // 获取流量数据
        const flowResponse = await fetch(`${API_BASE_URL}/flow`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!flowResponse.ok) {
          throw new Error('Failed to fetch flow data');
        }
        const flows = await flowResponse.json();
        
        console.log('Stations loaded:', stations.length);
        console.log('Flow data loaded:', flows.length);
        
        setStationData(stations);
        setFlowData(flows);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStationSize = (stationName, type) => {
    const CENTER_SIZE = 10;  // 中心圆点大小

    if (selectedTimeSlot === 24) {
      // Show aggregated data for all time slots within the time range (3:30-12:00)
      const stationFlows = flowData.filter(flow => 
        flow['站名'] === stationName && 
        flow['时间段'] >= 7 && 
        flow['时间段'] <= 24
      );
      if (!stationFlows.length) return CENTER_SIZE;
      const totalFlow = stationFlows.reduce((sum, flow) => sum + flow[type === 'in' ? '进站' : '出站'], 0);
      return type === 'center' ? CENTER_SIZE : (totalFlow === 0 ? CENTER_SIZE : Math.sqrt(totalFlow) / 3 + 30);
    } else {
      // Show data for specific time slot
      const stationFlow = flowData.find(flow => 
        flow['站名'] === stationName && 
        flow['时间段'] === (selectedTimeSlot + 7) // 加7是因为从3:30开始
      );
      if (!stationFlow) return CENTER_SIZE;
      const flow = type === 'in' ? stationFlow['进站'] : stationFlow['出站'];
      return type === 'center' ? CENTER_SIZE : (flow === 0 ? CENTER_SIZE : Math.sqrt(flow) / 3 + 30);
    }
  };

  const getStationFlow = (stationName, type) => {
    if (selectedTimeSlot === 24) {
      // 计算时间范围内的总流量
      const stationFlows = flowData.filter(flow => 
        flow['站名'] === stationName && 
        flow['时间段'] >= 7 && 
        flow['时间段'] <= 24
      );
      return stationFlows.reduce((sum, flow) => sum + flow[type], 0);
    } else {
      // 获取特定时间段的流量
      const stationFlow = flowData.find(flow => 
        flow['站名'] === stationName && 
        flow['时间段'] === (selectedTimeSlot + 7)
      );
      return stationFlow ? stationFlow[type] : 0;
    }
  };

  const formatTimeSlot = (slot) => {
    if (slot === 24) return 'All Time Slots';
    const actualSlot = slot + 7; // 加7是因为从3:30开始
    const hour = Math.floor(actualSlot / 2);
    const minute = (actualSlot % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleStationClick = async (event) => {
    const point = event.points[0];
    const stationName = point.text.split('<br>')[0]; // Get only the station name part
    setSelectedStation(stationName);

    try {
      // 获取站点分析数据
      const response = await fetch(
        `${API_BASE_URL}/station_analysis?station=${encodeURIComponent(stationName)}&time_slot=${selectedTimeSlot}`,
        {
          method: 'GET',
          mode: 'cors',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch station analysis');
      }

      const analysisData = await response.json();
      setStationAnalysis(analysisData);

      // 获取站点类型数据
      const typeResponse = await fetch(
        `${API_BASE_URL}/station_type?station=${encodeURIComponent(stationName)}`,
        {
          method: 'GET',
          mode: 'cors',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (typeResponse.ok) {
        const typeData = await typeResponse.json();
        setStationTypeData(typeData);
      } else {
        setStationTypeData(null);
      }

      // 获取站点POIs数据
      const poisResponse = await fetch(
        `${API_BASE_URL}/station_pois?station=${encodeURIComponent(stationName)}`,
        {
          method: 'GET',
          mode: 'cors',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (poisResponse.ok) {
        const poisData = await poisResponse.json();
        setStationPoisData(poisData);
      } else {
        setStationPoisData(null);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading data...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 1000, 
        background: 'rgba(255, 255, 255, 0.9)', 
        padding: '15px', 
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '1.5em' }}>Shenzhen Subway Passenger Flow Map</h1>
        <div style={{ marginBottom: '10px' }}>
          <p style={{ margin: '5px 0' }}>Loaded Stations: {stationData.length}</p>
          <p style={{ margin: '5px 0' }}>Current Time Slot: {formatTimeSlot(selectedTimeSlot)}</p>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="range"
            min="0"
            max="24"
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
            <span>03:30</span>
            <span>12:00</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '20px', 
              height: '20px', 
              backgroundColor: 'rgba(65, 105, 225, 0.3)',
              border: '2px solid rgb(65, 105, 225)', 
              borderRadius: '50%', 
              marginRight: '5px'
            }}></span>
            Exit Flow
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '20px', 
              height: '20px', 
              backgroundColor: 'rgba(220, 20, 60, 0.3)',
              border: '2px solid rgb(220, 20, 60)', 
              borderRadius: '50%', 
              marginRight: '5px'
            }}></span>
            Entry Flow
          </span>
        </div>
      </div>

      {/* 替换原有的分析结果显示为桑基图 */}
      {stationAnalysis && selectedStation && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '15px',
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          width: '600px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2em', textAlign: 'center' }}>
            {selectedStation} Station Passenger Flow Analysis
          </h2>
          <StationSankeyFlow 
            analysisData={stationAnalysis} 
            typeData={stationTypeData}
            poisData={stationPoisData}
          />
        </div>
      )}

      {stationData.length > 0 && (
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <Plot
            style={{ width: '100%', height: '100%' }}
            data={[
              // 出站圆圈（带轮廓）- 放在最底层
              {
                type: 'scattermapbox',
                lat: stationData.map(station => station['纬度']),
                lon: stationData.map(station => station['经度']),
                mode: 'markers',
                marker: {
                  size: stationData.map(station => getStationSize(station['站名'], 'out')),
                  color: 'rgba(65, 105, 225, 0.3)', // 皇家蓝，更柔和
                  opacity: 1,
                  line: {
                    color: 'rgb(65, 105, 225)',
                    width: 2
                  }
                },
                text: stationData.map(station => {
                  const outflow = getStationFlow(station['站名'], '出站');
                  return `${station['站名']}<br>Exit: ${outflow} passengers`;
                }),
                name: 'Exit Flow',
                hoverinfo: 'text'
              },
              // 进站圆圈（带轮廓）- 放在中间
              {
                type: 'scattermapbox',
                lat: stationData.map(station => station['纬度']),
                lon: stationData.map(station => station['经度']),
                mode: 'markers',
                marker: {
                  size: stationData.map(station => getStationSize(station['站名'], 'in')),
                  color: 'rgba(220, 20, 60, 0.3)', // 猩红色，更柔和
                  opacity: 1,
                  line: {
                    color: 'rgb(220, 20, 60)',
                    width: 2
                  }
                },
                text: stationData.map(station => {
                  const inflow = getStationFlow(station['站名'], '进站');
                  return `${station['站名']}<br>Entry: ${inflow} passengers`;
                }),
                name: 'Entry Flow',
                hoverinfo: 'text'
              },
              // 中心圆点 - 放在最上层
              {
                type: 'scattermapbox',
                lat: stationData.map(station => station['纬度']),
                lon: stationData.map(station => station['经度']),
                mode: 'markers',
                marker: {
                  size: stationData.map(station => getStationSize(station['站名'], 'center')),
                  color: 'rgb(50, 50, 50)', // 深灰色，更专业
                  opacity: 1
                },
                text: stationData.map(station => station['站名']),
                name: 'Subway Stations',
                hoverinfo: 'text'
              },
              // 如果有选中的站点，添加弧线
              ...(selectedStation && stationAnalysis ? (() => {
                // 计算入站客流的最大最小值
                const entryFlows = Object.values(stationAnalysis.entry_stations.top5);
                const maxEntryFlow = Math.max(...entryFlows);
                const minEntryFlow = Math.min(...entryFlows);
                
                // 计算出站客流的最大最小值
                const exitFlows = Object.values(stationAnalysis.exit_stations.top5);
                const maxExitFlow = Math.max(...exitFlows);
                const minExitFlow = Math.min(...exitFlows);

                // 线性映射函数改为使用指数映射
                const scaleWidth = (value, min, max) => {
                  if (max === min) return 15;
                  // 先归一化到0-1
                  const normalized = (value - min) / (max - min);
                  // 使用更大的指数(4)来获得更明显的差异
                  const weighted = Math.pow(normalized, 4);
                  // 映射到15-50范围
                  return 15 + (50 - 15) * weighted;
                };

                return [
                  {
                    type: 'scattermapbox',
                    mode: 'lines',
                    lat: [
                      ...Object.entries(stationAnalysis.entry_stations.top5)
                        .flatMap(([station]) => {
                          const stationInfo = stationData.find(s => s['站名'] === station);
                          if (!stationInfo) return [];
                          const selectedStationInfo = stationData.find(s => s['站名'] === selectedStation);
                          
                          const startLat = stationInfo['纬度'];
                          const startLon = stationInfo['经度'];
                          const endLat = selectedStationInfo['纬度'];
                          const endLon = selectedStationInfo['经度'];
                          
                          const midLat = (startLat + endLat) / 2;
                          const midLon = (startLon + endLon) / 2;
                          
                          const distance = Math.sqrt(
                            Math.pow(endLat - startLat, 2) +
                            Math.pow(endLon - startLon, 2)
                          );
                          
                          const points = [];
                          const steps = 50;
                          const controlPointHeight = distance * 0.5;
                          
                          for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const lat = Math.pow(1 - t, 2) * startLat + 
                                      2 * (1 - t) * t * (midLat + controlPointHeight) + 
                                      Math.pow(t, 2) * endLat;
                            points.push(lat);
                          }
                          
                          return [...points, null];
                        })
                    ],
                    lon: [
                      ...Object.entries(stationAnalysis.entry_stations.top5)
                        .flatMap(([station]) => {
                          const stationInfo = stationData.find(s => s['站名'] === station);
                          if (!stationInfo) return [];
                          const selectedStationInfo = stationData.find(s => s['站名'] === selectedStation);
                          
                          const startLat = stationInfo['纬度'];
                          const startLon = stationInfo['经度'];
                          const endLat = selectedStationInfo['纬度'];
                          const endLon = selectedStationInfo['经度'];
                          
                          const midLat = (startLat + endLat) / 2;
                          const midLon = (startLon + endLon) / 2;
                          
                          const points = [];
                          const steps = 50;
                          
                          for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const lon = Math.pow(1 - t, 2) * startLon + 
                                      2 * (1 - t) * t * midLon + 
                                      Math.pow(t, 2) * endLon;
                            points.push(lon);
                          }
                          
                          return [...points, null];
                        })
                    ],
                    line: {
                      color: 'rgba(65, 105, 225, 0.4)',
                      width: scaleWidth(entryFlows[0], minEntryFlow, maxEntryFlow)
                    },
                    hoverinfo: 'none',
                    showlegend: false
                  },
                  // 出站弧线
                  {
                    type: 'scattermapbox',
                    mode: 'lines',
                    lat: [
                      ...Object.entries(stationAnalysis.exit_stations.top5)
                        .flatMap(([station]) => {
                          const stationInfo = stationData.find(s => s['站名'] === station);
                          if (!stationInfo) return [];
                          const selectedStationInfo = stationData.find(s => s['站名'] === selectedStation);
                          
                          const startLat = selectedStationInfo['纬度'];
                          const startLon = selectedStationInfo['经度'];
                          const endLat = stationInfo['纬度'];
                          const endLon = stationInfo['经度'];
                          
                          const midLat = (startLat + endLat) / 2;
                          const midLon = (startLon + endLon) / 2;
                          
                          const distance = Math.sqrt(
                            Math.pow(endLat - startLat, 2) +
                            Math.pow(endLon - startLon, 2)
                          );
                          
                          const points = [];
                          const steps = 50;
                          const controlPointHeight = distance * 0.5;
                          
                          for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const lat = Math.pow(1 - t, 2) * startLat + 
                                      2 * (1 - t) * t * (midLat + controlPointHeight) + 
                                      Math.pow(t, 2) * endLat;
                            points.push(lat);
                          }
                          
                          return [...points, null];
                        })
                    ],
                    lon: [
                      ...Object.entries(stationAnalysis.exit_stations.top5)
                        .flatMap(([station]) => {
                          const stationInfo = stationData.find(s => s['站名'] === station);
                          if (!stationInfo) return [];
                          const selectedStationInfo = stationData.find(s => s['站名'] === selectedStation);
                          
                          const startLat = selectedStationInfo['纬度'];
                          const startLon = selectedStationInfo['经度'];
                          const endLat = stationInfo['纬度'];
                          const endLon = stationInfo['经度'];
                          
                          const midLat = (startLat + endLat) / 2;
                          const midLon = (startLon + endLon) / 2;
                          
                          const points = [];
                          const steps = 50;
                          
                          for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const lon = Math.pow(1 - t, 2) * startLon + 
                                      2 * (1 - t) * t * midLon + 
                                      Math.pow(t, 2) * endLon;
                            points.push(lon);
                          }
                          
                          return [...points, null];
                        })
                    ],
                    line: {
                      color: 'rgba(220, 20, 60, 0.4)',
                      width: scaleWidth(exitFlows[0], minExitFlow, maxExitFlow)
                    },
                    hoverinfo: 'none',
                    showlegend: false
                  }
                ];
              })() : []),
            ]}
            layout={{
              autosize: true,
              mapbox: {
                style: 'carto-positron',
                center: {
                  lat: 22.55,
                  lon: 114.05
                },
                zoom: 11,
                scrollZoom: true  // 启用滚轮缩放
              },
              margin: { r: 0, t: 0, b: 0, l: 0 },
              showlegend: false,
              dragmode: 'pan'  // 设置拖动模式为平移
            }}
            config={{
              mapboxAccessToken: 'pk.eyJ1IjoicGxvdGx5bWFwYm94IiwiYSI6ImNrOWJqb2F4djBnMjEzbG50amg0dnJieG4ifQ.Zme1-Uzoi75IaFbieBDl3A',
              responsive: true,
              displayModeBar: true,  // 显示工具栏
              modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'resetScale2d'],  // 移除不需要的按钮
              displaylogo: false,  // 不显示plotly logo
              scrollZoom: true,  // 启用滚轮缩放
              doubleClick: 'reset'  // 双击重置视图
            }}
            onClick={handleStationClick}
            useResizeHandler={true}
          />
        </div>
      )}
    </div>
  );
}

export default App;
