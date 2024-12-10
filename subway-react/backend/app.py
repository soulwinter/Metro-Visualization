from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
# 明确指定CORS配置
CORS(app)

# 缓存数据
stations_data = None
flow_data = None

def load_data():
    global stations_data, flow_data
    if stations_data is None:
        # 读取站点坐标数据
        stations_df = pd.read_csv('../public/station_coordinates.csv')
        stations_data = stations_df.dropna().to_dict('records')
    
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

if __name__ == '__main__':
    # 预加载数据
    load_data()
    # 启动服务器
    app.run(port=5000, debug=True)
