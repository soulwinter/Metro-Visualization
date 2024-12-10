import React, { useEffect } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

const StationSankeyFlow = ({ analysisData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
    <div style={{ width: '100%', height: '100%' }}>
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
  );
};

export default StationSankeyFlow;
