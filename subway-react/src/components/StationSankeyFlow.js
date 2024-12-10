import React, { useEffect, useState } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import 'reactflow/dist/style.css';

const StationSankeyFlow = ({ analysisData, typeData, poisData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!analysisData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { station_name, entry_stations, exit_stations } = analysisData;

    // 过滤掉自身站点
    const filteredEntryStations = {
      top5: Object.fromEntries(
        Object.entries(entry_stations.top5)
          .filter(([station]) => station !== station_name)
      ),
      others: entry_stations.others
    };

    const filteredExitStations = {
      top5: Object.fromEntries(
        Object.entries(exit_stations.top5)
          .filter(([station]) => station !== station_name)
      ),
      others: exit_stations.others
    };

    // 计算最大流量用于归一化
    const maxEntryFlow = Math.max(
      ...Object.values(filteredEntryStations.top5),
      filteredEntryStations.others
    );
    const maxExitFlow = Math.max(
      ...Object.values(filteredExitStations.top5),
      filteredExitStations.others
    );
    const maxFlow = Math.max(maxEntryFlow, maxExitFlow);

    // 计算高度的比例函数
    const calculateHeight = (count) => {
      const minHeight = 40;  // 最小高度
      const maxHeight = 120; // 最大高度
      return minHeight + (maxHeight - minHeight) * (count / maxFlow);
    };

    // 计算线条宽度的比例函数
    const calculateEdgeWidth = (count) => {
      const minWidth = 2;   // 最小线宽
      const maxWidth = 20;  // 最大线宽
      return minWidth + (maxWidth - minWidth) * (count / maxFlow);
    };

    // 计算节点位置
    let currentEntryY = 0;
    let currentExitY = 0;
    const nodeWidth = 180;  // 固定节点宽度

    // 创建入站节点
    const entryNodes = Object.entries(filteredEntryStations.top5).map(([station, count]) => {
      const height = calculateHeight(count);
      const node = {
        id: `entry-${station}`,
        data: { label: `${station}\nEntries: ${count}` },
        position: { x: 0, y: currentEntryY },
        sourcePosition: Position.Right,
        style: { 
          width: nodeWidth,
          height: height,
          padding: '10px',
          fontSize: '12px',
          background: '#D6EAF8',
          border: '1px solid #85C1E9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      };
      currentEntryY += height + 20; // 20px间距
      return node;
    });

    // 创建其他入站节点
    const entryOthersHeight = calculateHeight(filteredEntryStations.others);
    const entryOthersNode = {
      id: 'entry-others',
      data: { label: `Other Entries\n${filteredEntryStations.others}` },
      position: { x: 0, y: currentEntryY },
      sourcePosition: Position.Right,
      style: { 
        width: nodeWidth,
        height: entryOthersHeight,
        padding: '10px',
        fontSize: '12px',
        background: '#D6EAF8',
        border: '1px solid #85C1E9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    };

    // 计算总流量
    const totalFlow = Object.values(filteredEntryStations.top5).reduce((sum, count) => sum + count, 0) + 
                     filteredEntryStations.others;

    // 创建中心节点
    const centerHeight = 150; // 固定中心节点高度
    const centerY = (currentEntryY + entryOthersHeight) / 2 - centerHeight / 2;
    const centerNode = {
      id: 'center',
      data: { label: `${station_name}\nTotal Flow: ${totalFlow}` },
      position: { x: 300, y: centerY },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      style: { 
        width: nodeWidth,
        height: centerHeight,
        padding: '10px',
        fontSize: '14px',
        fontWeight: 'bold',
        background: '#FCF3CF',
        border: '1px solid #F4D03F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    };

    // 创建出站节点
    const exitNodes = Object.entries(filteredExitStations.top5).map(([station, count]) => {
      const height = calculateHeight(count);
      const node = {
        id: `exit-${station}`,
        data: { label: `${station}\nExits: ${count}` },
        position: { x: 600, y: currentExitY },
        targetPosition: Position.Left,
        style: { 
          width: nodeWidth,
          height: height,
          padding: '10px',
          fontSize: '12px',
          background: '#D5F5E3',
          border: '1px solid #82E0AA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      };
      currentExitY += height + 20; // 20px间距
      return node;
    });

    // 创建其他出站节点
    const exitOthersHeight = calculateHeight(filteredExitStations.others);
    const exitOthersNode = {
      id: 'exit-others',
      data: { label: `Other Exits\n${filteredExitStations.others}` },
      position: { x: 600, y: currentExitY },
      targetPosition: Position.Left,
      style: { 
        width: nodeWidth,
        height: exitOthersHeight,
        padding: '10px',
        fontSize: '12px',
        background: '#D5F5E3',
        border: '1px solid #82E0AA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    };

    // 合并所有节点
    const allNodes = [
      ...entryNodes,
      entryOthersNode,
      centerNode,
      ...exitNodes,
      exitOthersNode
    ];

    // 创建入站边
    const entryEdges = Object.entries(filteredEntryStations.top5).map(([station, count]) => ({
      id: `edge-entry-${station}`,
      source: `entry-${station}`,
      target: 'center',
      style: { 
        stroke: '#85C1E9', 
        strokeWidth: calculateEdgeWidth(count)
      },
      animated: true,
      type: 'default',
      sourceHandle: 'right',
      targetHandle: 'left',
      markerEnd: {
        type: 'arrow',
      },
      data: {
        controlPoints: [
          { x: 150, y: 0 },
          { x: 200, y: 0 }
        ]
      }
    }));

    // 创建其他入站边
    const entryOthersEdge = {
      id: 'edge-entry-others',
      source: 'entry-others',
      target: 'center',
      style: { 
        stroke: '#85C1E9', 
        strokeWidth: calculateEdgeWidth(filteredEntryStations.others)
      },
      animated: true,
      type: 'default',
      sourceHandle: 'right',
      targetHandle: 'left',
      markerEnd: {
        type: 'arrow',
      },
      data: {
        controlPoints: [
          { x: 150, y: 0 },
          { x: 200, y: 0 }
        ]
      }
    };

    // 创建出站边
    const exitEdges = Object.entries(filteredExitStations.top5).map(([station, count]) => ({
      id: `edge-exit-${station}`,
      source: 'center',
      target: `exit-${station}`,
      style: { 
        stroke: '#82E0AA', 
        strokeWidth: calculateEdgeWidth(count)
      },
      animated: true,
      type: 'default',
      sourceHandle: 'right',
      targetHandle: 'left',
      markerEnd: {
        type: 'arrow',
      },
      data: {
        controlPoints: [
          { x: 400, y: 0 },
          { x: 450, y: 0 }
        ]
      }
    }));

    // 创建其他出站边
    const exitOthersEdge = {
      id: 'edge-exit-others',
      source: 'center',
      target: 'exit-others',
      style: { 
        stroke: '#82E0AA', 
        strokeWidth: calculateEdgeWidth(filteredExitStations.others)
      },
      animated: true,
      type: 'default',
      sourceHandle: 'right',
      targetHandle: 'left',
      markerEnd: {
        type: 'arrow',
      },
      data: {
        controlPoints: [
          { x: 400, y: 0 },
          { x: 450, y: 0 }
        ]
      }
    };

    // 合并所有边
    const allEdges = [
      ...entryEdges,
      entryOthersEdge,
      ...exitEdges,
      exitOthersEdge
    ];

    setNodes(allNodes);
    setEdges(allEdges);
  }, [analysisData, setNodes, setEdges]);

  if (!analysisData) return null;

  return (
    <div>
      <div style={{ width: '100%', height: '400px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            type: 'default',
            style: { strokeWidth: 2 },
            markerEnd: {
              type: 'arrow',
            },
          }}
        />
      </div>

      {/* POIs分布图 */}
      {poisData && (
        <div style={{ width: '100%', height: '400px', marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>POIs Distribution</h3>
          <div style={{ width: '100%', height: '320px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="-150 -150 300 300">
              {/* 中心站点 */}
              <circle
                cx={0}
                cy={0}
                r={30}
                fill="#1f77b4"
                opacity={0.8}
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12px"
              >
                Station
              </text>
              
              {/* POIs点 */}
              {poisData.pois.map((poi, index) => {
                // 计算经纬度差值
                const dx = poi.location.x - poisData.station_location.x;
                const dy = poi.location.y - poisData.station_location.y;
                
                // 将经纬度差值转换为像素坐标
                // 经度1度约等于111km，纬度1度约等于111km
                // 将差值转换为米，然后缩放到合适的显示范围
                const scale = 50000; // 调整这个值来改变分布范围
                const x = dx * Math.cos(poisData.station_location.y * Math.PI / 180) * scale;
                const y = -dy * scale; // 反转y轴方向
                
                // 根据POI类型选择颜色
                const colors = {
                  1: '#ff7f0e', // 医疗
                  2: '#2ca02c', // 教育
                  3: '#d62728', // 商业
                  4: '#9467bd', // 办公
                  5: '#8c564b', // 住宅
                  6: '#e377c2', // 交通
                  7: '#7f7f7f', // 其他
                };

                // 限制显示范围，防止点太远
                const maxRange = 140; // viewBox的范围是-150到150
                const clampedX = Math.max(Math.min(x, maxRange), -maxRange);
                const clampedY = Math.max(Math.min(y, maxRange), -maxRange);
                
                return (
                  <g key={index}>
                    <circle
                      cx={clampedX}
                      cy={clampedY}
                      r={10}
                      fill={colors[poi.type] || '#7f7f7f'}
                      opacity={0.6}
                    />
                    <title>{`${poi.name} (${(dx * 111).toFixed(2)}km, ${(dy * 111).toFixed(2)}km)`}</title>
                  </g>
                );
              })}
            </svg>
            
            {/* 图例 */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { type: 1, name: 'Hospital', color: '#ff7f0e' },
                { type: 2, name: 'Education', color: '#2ca02c' },
                { type: 3, name: 'Business', color: '#d62728' },
                { type: 4, name: 'Office', color: '#9467bd' },
                { type: 5, name: 'Residential', color: '#8c564b' },
                { type: 6, name: 'Transportation', color: '#e377c2' },
                { type: 7, name: 'Others', color: '#7f7f7f' },
              ].map(item => (
                <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span style={{ fontSize: '12px', color: '#666' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 站点类型雷达图 */}
      {typeData && (
        <div style={{ width: '100%', height: '400px', marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Station Around</h3>
          <div style={{ width: '100%', height: '320px', display: 'flex', justifyContent: 'center' }}>
            <RadarChart 
              width={500} 
              height={300} 
              data={typeData.categories.map((category, index) => ({
                category,
                value: typeData.values[index],
                fullMark: 100
              }))}
              style={{ marginLeft: '-50px' }}
            >
              <PolarGrid stroke="#e6e6e6" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ 
                  fill: '#666', 
                  fontSize: 12,
                  dy: 3,
                }}
                tickLine={{ stroke: '#ccc' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: '#666', fontSize: 12 }}
                stroke="#ccc"
              />
              <Radar
                name="Station Around"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </RadarChart>
          </div>
          {/* 显示原始值 */}
          {typeData.raw_values && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Data: {typeData.categories.map((category, index) => (
                `${category}: ${typeData.raw_values[index].toFixed(1)}`
              )).join(' | ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StationSankeyFlow;
