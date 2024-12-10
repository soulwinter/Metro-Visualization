import pandas as pd
import requests
import time
from config import get_amap_key, AMAP_BASE_URL

def get_station_location(station_name, city="深圳"):
    """
    使用高德地图API获取地铁站的经纬度
    """
    api_key = get_amap_key()
    url = f"{AMAP_BASE_URL}/v3/place/text"
    
    params = {
        'key': api_key,
        'keywords': f"{station_name}地铁站",
        'city': city,
        'types': '150500',  # 地铁站POI类型码
        'output': 'json'
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        if data['status'] == '1' and data['pois']:
            # 获取第一个匹配结果
            location = data['pois'][0]['location']
            longitude, latitude = location.split(',')
            return float(longitude), float(latitude)
        else:
            print(f"未找到地铁站: {station_name}")
            return None, None
    except Exception as e:
        print(f"查询出错 ({station_name}): {str(e)}")
        return None, None

def main():
    # 读取转换后的CSV文件
    df = pd.read_csv('output_transformed.csv')
    
    # 读取已有的坐标文件
    try:
        existing_coordinates = pd.read_csv('station_coordinates1.csv')
        print(f"已读取现有坐标文件，包含 {len(existing_coordinates)} 个站点")
    except FileNotFoundError:
        existing_coordinates = pd.DataFrame(columns=['站名', '经度', '纬度'])
        print("未找到现有坐标文件，将创建新文件")
    
    # 获取唯一的站名列表
    unique_stations = df['站名'].unique()
    print(f"共找到 {len(unique_stations)} 个唯一站点")
    
    # 创建存储结果的列表
    stations_data = []
    
    # 为每个站点获取经纬度
    for station in unique_stations:
        # 检查是否已有该站点的坐标
        existing_station = existing_coordinates[existing_coordinates['站名'] == station]
        if not existing_station.empty and pd.notna(existing_station['经度'].iloc[0]):
            # 如果已有坐标且经度不为空，直接使用现有数据
            longitude = existing_station['经度'].iloc[0]
            latitude = existing_station['纬度'].iloc[0]
            print(f"使用现有坐标: {station}")
        else:
            # 如果没有坐标或经度为空，查询API
            print(f"正在查询: {station}")
            longitude, latitude = get_station_location(station)
            # 添加延时以避免触发API限制
            time.sleep(0.1)
        
        stations_data.append({
            '站名': station,
            '经度': longitude,
            '纬度': latitude
        })
    
    # 创建新的DataFrame并保存为CSV
    stations_df = pd.DataFrame(stations_data)
    stations_df.to_csv('station_coordinates.csv', index=False, encoding='utf-8')
    print(f"已保存站点坐标到 station_coordinates.csv")
    
    # 输出统计信息
    total = len(stations_df)
    found = len(stations_df.dropna())
    print(f"\n统计信息:")
    print(f"总站点数: {total}")
    print(f"成功获取坐标: {found}")
    print(f"未找到坐标: {total - found}")

if __name__ == "__main__":
    main()
