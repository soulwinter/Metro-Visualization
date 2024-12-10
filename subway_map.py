import pandas as pd
import dash
from dash import html, dcc, callback, Input, Output
import plotly.graph_objects as go
from datetime import datetime, timedelta

# 读取站点数据
stations_df = pd.read_csv('station_coordinates.csv')
flow_df = pd.read_csv('output_transformed.csv')

# 移除没有坐标的站点
stations_df = stations_df.dropna()

# 处理flow_df的时间数据
flow_df['datetime'] = pd.to_datetime(flow_df['日期'] + ' ' + flow_df['时间'])
flow_df['date'] = flow_df['datetime'].dt.date
unique_dates = sorted(flow_df['date'].unique())

# 创建10分钟时间区间
time_intervals = []
start_time = datetime.strptime('00:00:00', '%H:%M:%S')
for i in range(144):  # 24小时 * 6个10分钟区间
    end_time = start_time + timedelta(minutes=10)
    time_intervals.append({
        'label': f'{start_time.strftime("%H:%M")}-{end_time.strftime("%H:%M")}',
        'value': i
    })
    start_time = end_time

# 创建Dash应用
app = dash.Dash(__name__)

# 设置应用布局
app.layout = html.Div([
    html.H1('深圳地铁站分布图', 
            style={'textAlign': 'center', 'color': '#2c3e50', 'marginTop': '20px'}),
    
    # 日期选择器
    html.Div([
        html.Button('←', id='prev-date', n_clicks=0),
        html.Span(id='current-date', style={'margin': '0 20px'}),
        html.Button('→', id='next-date', n_clicks=0),
    ], style={'textAlign': 'center', 'margin': '20px'}),
    
    # 时间滑块
    html.Div([
        html.Label('时间区间选择：'),
        dcc.Slider(
            id='time-slider',
            min=0,
            max=143,
            step=1,
            value=42,  # 默认显示7:00
            marks={i: time_intervals[i]['label'] for i in range(0, 144, 12)},
        )
    ], style={'margin': '20px auto', 'width': '90%'}),
    
    # 地图
    dcc.Graph(
        id='subway-map',
        style={'height': '80vh'}
    ),
    
    # 存储当前日期的隐藏div
    html.Div(str(unique_dates[0]), id='current-date-storage', style={'display': 'none'})
], style={
    'margin': '0 auto',
    'maxWidth': '1200px',
    'padding': '20px'
})

@app.callback(
    [Output('subway-map', 'figure'),
     Output('current-date', 'children'),
     Output('current-date-storage', 'children')],
    [Input('time-slider', 'value'),
     Input('prev-date', 'n_clicks'),
     Input('next-date', 'n_clicks'),
     Input('current-date-storage', 'children')]
)
def update_figure(time_interval, prev_clicks, next_clicks, current_date_str):
    # 获取当前日期
    current_date = datetime.strptime(current_date_str, '%Y-%m-%d').date()
    
    # 处理日期变化
    ctx = dash.callback_context
    if ctx.triggered:
        button_id = ctx.triggered[0]['prop_id'].split('.')[0]
        if button_id == 'prev-date':
            idx = unique_dates.index(current_date)
            if idx > 0:
                current_date = unique_dates[idx - 1]
        elif button_id == 'next-date':
            idx = unique_dates.index(current_date)
            if idx < len(unique_dates) - 1:
                current_date = unique_dates[idx + 1]
    
    # 计算时间区间
    start_time = datetime.strptime('00:00:00', '%H:%M:%S') + timedelta(minutes=10*time_interval)
    end_time = start_time + timedelta(minutes=10)
    
    # 筛选当前时间区间的数据
    mask = (flow_df['date'] == current_date) & \
           (flow_df['datetime'].dt.time >= start_time.time()) & \
           (flow_df['datetime'].dt.time < end_time.time())
    current_flow = flow_df[mask]
    
    # 统计各站点进出站人数
    station_stats = pd.DataFrame()
    station_stats['进站'] = current_flow[current_flow['交易类型'] == 0]['站名'].value_counts()
    station_stats['出站'] = current_flow[current_flow['交易类型'] == 1]['站名'].value_counts()
    
    # 创建基础图形
    fig = go.Figure()
    
    # 获取最大人流量用于归一化
    max_flow = max(station_stats['进站'].max() if not station_stats['进站'].empty else 0,
                   station_stats['出站'].max() if not station_stats['出站'].empty else 0,
                   1)  # 避免除以0
    
    # 添加站点标记
    for _, station in stations_df.iterrows():
        # 基础站点标记（红色）
        fig.add_trace(go.Scatter(
            x=[station['经度']],
            y=[station['纬度']],
            mode='markers+text',
            marker=dict(size=12, color='red'),
            text=station['站名'],
            textposition='bottom center',
            textfont=dict(size=10, color='black'),
            showlegend=False
        ))
        
        # 添加进站圈（橙色）
        in_flow = station_stats.get('进站', pd.Series()).get(station['站名'], 0)
        if in_flow > 0:
            size = 12 + (in_flow / max_flow * 30)  # 根据人流量调整大小
            fig.add_trace(go.Scatter(
                x=[station['经度']],
                y=[station['纬度']],
                mode='markers',
                marker=dict(
                    size=size,
                    color='rgba(255, 165, 0, 0.3)',  # 半透明橙色
                    line=dict(width=1, color='orange')
                ),
                showlegend=False
            ))
        
        # 添加出站圈（蓝色）
        out_flow = station_stats.get('出站', pd.Series()).get(station['站名'], 0)
        if out_flow > 0:
            size = 12 + (out_flow / max_flow * 30)  # 根据人流量调整大小
            fig.add_trace(go.Scatter(
                x=[station['经度']],
                y=[station['纬度']],
                mode='markers',
                marker=dict(
                    size=size,
                    color='rgba(0, 165, 255, 0.3)',  # 半透明蓝色
                    line=dict(width=1, color='blue')
                ),
                showlegend=False
            ))
    
    # 更新布局
    fig.update_layout(
        title=f'深圳地铁站分布图 - {start_time.strftime("%H:%M")}-{end_time.strftime("%H:%M")}',
        title_x=0.5,
        plot_bgcolor='white',
        paper_bgcolor='white',
        showlegend=False,
        margin=dict(l=50, r=50, t=50, b=50),
        xaxis=dict(
            showgrid=False,
            zeroline=False,
            showline=True,
            linewidth=1,
            linecolor='black',
            mirror=True
        ),
        yaxis=dict(
            showgrid=False,
            zeroline=False,
            showline=True,
            linewidth=1,
            linecolor='black',
            mirror=True
        ),
        yaxis_scaleanchor="x",
        yaxis_scaleratio=1,
    )
    
    return fig, current_date.strftime('%Y-%m-%d'), str(current_date)

# 添加自定义CSS样式
app.index_string = '''
<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>深圳地铁站分布图</title>
        {%favicon%}
        {%css%}
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                background-color: #f5f6fa;
            }
            button {
                padding: 5px 15px;
                font-size: 16px;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
    </body>
</html>
'''

if __name__ == '__main__':
    app.run_server(debug=True, port=8050)
