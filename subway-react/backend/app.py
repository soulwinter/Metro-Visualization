from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np

app = Flask(__name__)
# 明确指定CORS配置
CORS(app)

# 缓存数据
stations_data = None
flow_data = None
station_type_data = None
station_pois_data = None  # 新增POIs数据缓存

def load_data():
    global stations_data, flow_data, station_type_data, station_pois_data
    if stations_data is None:
        # 读取站点坐标数据
        stations_df = pd.read_csv('../public/station_coordinates.csv')
        stations_data = stations_df.to_dict('records')
        print("Loaded stations:", [station['站名'] for station in stations_data])  # 调试信息
    
    if flow_data is None:
        # 读取并处理流量数据
        flow_df = pd.read_csv('../public/output_transformed.csv')
        # 只保留9月1日的数据
        flow_df = flow_df[flow_df['日期'] == '2018-09-01']
        
        # 将时间转换为30分钟时间段，使用明确的时间格式
        flow_df['时间段'] = pd.to_datetime(flow_df['时间'], format='%H:%M:%S').dt.hour * 2 + pd.to_datetime(flow_df['时间'], format='%H:%M:%S').dt.minute // 30
        
        # 按时间段和站点分组计算进出站人数
        flow_by_time = []
        for time_slot in range(48):  # 24小时 * 2个30分钟段
            inflow = flow_df[(flow_df['时间段'] == time_slot) & (flow_df['交易类型'] == 0)].groupby('站名').size()
            outflow = flow_df[(flow_df['时间段'] == time_slot) & (flow_df['交易类型'] == 1)].groupby('站名').size()
            
            # 合并进站和出站数据
            flow_summary = pd.DataFrame({
                '时间段': time_slot,
                '进站': inflow,
                '出站': outflow
            }).fillna(0).reset_index()
            
            flow_by_time.extend(flow_summary.to_dict('records'))
        
        flow_data = flow_by_time

    if station_type_data is None:
        # 读取站点类型数据
        type_df = pd.read_csv('../public/station_type.csv')
        station_type_data = type_df.set_index('站名').to_dict('index')

    if station_pois_data is None:
        # 读取站点POIs数据
        pois_df = pd.read_csv('../public/station_around.csv')
        station_pois_data = pois_df.set_index('站名')['POIs'].apply(eval).to_dict()

@app.route('/api/stations')
def get_stations():
    """获取所有站点的坐标信息"""
    if stations_data is None:
        load_data()
    return jsonify(stations_data)

@app.route('/api/flow')
def get_flow():
    """获取9月1日所有站点的客流量数据，按30分钟时间段划分"""
    if flow_data is None:
        load_data()
    return jsonify(flow_data)

@app.route('/api/station_analysis')
def analyze_station():
    """分析特定站点的客流数据"""
    station = request.args.get('station')
    time_slot = request.args.get('time_slot', type=int)
    
    if not station:
        return jsonify({'error': '未提供站点名称'}), 400
        
    if flow_data is None:
        load_data()
    
    # 读取原始数据以获取完整的进出站记录
    df = pd.read_csv('../public/output_transformed.csv')
    df['时间段'] = pd.to_datetime(df['时间'], format='%H:%M:%S').dt.hour * 2 + pd.to_datetime(df['时间'], format='%H:%M:%S').dt.minute // 30
    
    # 筛选9月1日数据
    df = df[df['日期'] == '2018-09-01']
    
    # 根据time_slot筛选数据
    if time_slot != 24:  # 24表示全天
        df = df[df['时间段'] >= 7]  # 从3:30开始
        df = df[df['时间段'] <= 24]  # 到12:00结束
    
    # 1. 分析该站出站的乘客的进站来源
    # 找到在指定时间段内从该站出站的所有card_no
    target_exits = df[
        (df['站名'] == station) & 
        (df['交易类型'] == 1)  # 出站记录
    ]['card_no'].unique()
    
    # 对这些卡号，找到他们的进站记录
    entry_stations_all = df[
        (df['card_no'].isin(target_exits)) & 
        (df['交易类型'] == 0)  # 进站记录
    ]['站名'].value_counts()
    
    # 分离top5和其他
    entry_stations_top5 = entry_stations_all.head(5).to_dict()
    entry_stations_others = entry_stations_all[5:].sum() if len(entry_stations_all) > 5 else 0
    
    # 2. 分析该站进站的乘客的出站目的地
    # 找到在指定时间段内从该站进站的所有card_no
    target_entries = df[
        (df['站名'] == station) & 
        (df['交易类型'] == 0)  # 进站记录
    ]['card_no'].unique()
    
    # 对这些卡号，找到他们的出站记录
    exit_stations_all = df[
        (df['card_no'].isin(target_entries)) & 
        (df['交易类型'] == 1)  # 出站记录
    ]['站名'].value_counts()
    
    # 分离top5和其他
    exit_stations_top5 = exit_stations_all.head(5).to_dict()
    exit_stations_others = exit_stations_all[5:].sum() if len(exit_stations_all) > 5 else 0
    
    # 计算总流量
    total_entries = len(target_entries)
    total_exits = len(target_exits)
    
    return jsonify({
        'station_name': station,
        'total_entries': total_entries,
        'total_exits': total_exits,
        'entry_stations': {
            'top5': entry_stations_top5,
            'others': int(entry_stations_others)
        },
        'exit_stations': {
            'top5': exit_stations_top5,
            'others': int(exit_stations_others)
        }
    })

@app.route('/api/station_type')
def get_station_type():
    """获取特定站点的类型数据"""
    station = request.args.get('station')
    
    if not station:
        return jsonify({'error': '未提供站点名称'}), 400
        
    if station_type_data is None:
        load_data()
    
    # 查找站点数据
    station_data = station_type_data.get(station)
    if not station_data:
        return jsonify({'error': '未找到该站点的类型数据'}), 404
    
    # 准备雷达图数据
    categories = ['Hospital', 'School', 'Business', 'Science', 'Office', 'Transportation', 'Residential']
    raw_values = [float(station_data[f'类型{i+1}得分']) for i in range(7)]
    
    # 数据处理:
    # 1. 对数变换来减小差异
    log_values = [np.log1p(v) if v > 0 else 0 for v in raw_values]
    
    # 2. Min-Max标准化到0-100范围，保持0还是0
    non_zero_values = [v for v in log_values if v > 0]
    if non_zero_values:
        min_val = min(non_zero_values)
        max_val = max(log_values)
        scaled_values = [
            round((v - min_val) / (max_val - min_val) * 100 if v > 0 else 0, 1)
            for v in log_values
        ]
    else:
        scaled_values = [0] * 7
    
    # 3. 如果所有值都很小，给它们一个最小值以便在图上显示
    if max(scaled_values) < 10:
        scaled_values = [v * 3 for v in scaled_values]
    
    return jsonify({
        'categories': categories,
        'values': scaled_values,
        'raw_values': raw_values  # 同时返回原始值，以便需要时使用
    })

@app.route('/api/station_pois')
def get_station_pois():
    """获取特定站点的POIs和位置信息"""
    station = request.args.get('station')
    
    if not station:
        return jsonify({'error': '未提供站点名称'}), 400
        
    if station_pois_data is None or stations_data is None:
        load_data()
    
    print("Looking for station:", station)  # 调试信息
    print("Available stations:", [s['站名'] for s in stations_data])  # 调试信息
    
    # 获取站点POIs数据
    pois = station_pois_data.get(station)
    if not pois:
        return jsonify({'error': '未找到该站点的POIs数据'}), 404
    
    # 获取站点位置信息
    station_info = None
    for s in stations_data:
        if s['站名'] == station:
            station_info = s
            break
    
    if not station_info:
        return jsonify({'error': f'未找到站点 {station} 的位置信息'}), 404
    
    # 处理POIs数据
    processed_pois = []
    for poi in pois:
        processed_pois.append({
            'name': poi['name'],
            'type': poi['location']['type'],
            'original_type': poi['location']['original_type'],
            'location': {
                'x': poi['location']['x'],
                'y': poi['location']['y']
            }
        })
    
    return jsonify({
        'station_location': {
            'x': float(station_info['经度']),  # 确保转换为float
            'y': float(station_info['纬度'])   # 确保转换为float
        },
        'pois': processed_pois
    })

if __name__ == '__main__':
    # 预加载数据
    load_data()
    # 启动服务器
    app.run(host='0.0.0.0', port=5000, debug=True)
