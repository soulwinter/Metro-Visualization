import requests
import json
from collections import Counter
from config import get_amap_key, AMAP_BASE_URL

# 医院、学校
# 090000|140000

# 餐饮、购物、娱乐：
# 060100|060300|110000|100000|110000

# 办公：
# 120201|120202|130000|160000|170000|070700

# 交通设施：
# 150104|150200|150400

# 住宅：
# 120300|120203


# 配置信息
api_key = get_amap_key()
# 113.798296,22.651433
latitude = 22.651433 # 替换为你的纬度
longitude = 113.798296  # 替换为你的经度
radius = 500  # 搜索半径（米）
page_size = 25  # 每页返回的 POI 个数，最大为 50

# 调用高德地图的 POI 周边搜索 API，分页获取
def get_nearby_poi(api_key, latitude, longitude, radius, max_results=100):
    all_pois = []
    page = 1

    while len(all_pois) < max_results:
        url = f"{AMAP_BASE_URL}/v3/place/around"
        params = {
            'key': "ea40ee821c720a82f888c7300b75730d",
            'location': f"{longitude},{latitude}",
            'radius': radius,
            'output': 'json',
            'offset': page_size,  # 每次获取的 POI 数量
            'page': page,  # 页码，从 1 开始
            'sortrule': 'weight',
            'types': '150104|150200|150400'
            # 010000-
        }
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == '1':
                pois = data.get('pois', [])
                if not pois:
                    break  # 如果当前页没有数据，退出循环
                all_pois.extend(pois)
                page += 1
            else:
                print("API 返回错误：", data.get('info'))
                break
        else:
            print("请求失败，HTTP 状态码：", response.status_code)
            break

    # 限制最多返回 max_results 条 POI 数据
    return all_pois[:max_results]

# 分析 POI 数据，计算各类 POI 的比例
def calculate_poi_proportions(pois):
    types = [poi['type'] for poi in pois]
    type_counter = Counter(types)
    
    total = len(types)
    proportions = {poi_type: count / total * 100 for poi_type, count in type_counter.items()}
    
    return proportions

# 显示 POI 信息
def display_poi_information(pois):
    for poi in pois:
        name = poi.get('name', '未知名称')
        address = poi.get('location', '未知地址')
        type_code = poi.get('typecode', '未知类型')
        print(f"名称: {name}, 地址: {address}, 类型: {type_code}")

# 获取 POI 数据
pois = get_nearby_poi(api_key, latitude, longitude, radius, max_results=100)

# 输出 POI 详细信息
print("\n附近的 POI 信息：")
display_poi_information(pois)