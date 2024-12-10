import pandas as pd
from math import sin, cos, sqrt, fabs, atan2
from math import pi as PI

def transformLat(x, y):
    ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * sqrt(fabs(x))
    ret += (20.0 * sin(6.0 * x * PI) + 20.0 * sin(2.0 * x * PI)) * 2.0 / 3.0
    ret += (20.0 * sin(y * PI) + 40.0 * sin(y / 3.0 * PI)) * 2.0 / 3.0
    ret += (160.0 * sin(y / 12.0 * PI) + 320 * sin(y * PI / 30.0)) * 2.0 / 3.0
    return ret

def transformLon(x, y):
    ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * sqrt(fabs(x))
    ret += (20.0 * sin(6.0 * x * PI) + 20.0 * sin(2.0 * x * PI)) * 2.0 / 3.0
    ret += (20.0 * sin(x * PI) + 40.0 * sin(x / 3.0 * PI)) * 2.0 / 3.0
    ret += (150.0 * sin(x / 12.0 * PI) + 300.0 * sin(x / 30.0 * PI)) * 2.0 / 3.0
    return ret

def gcj02_to_wgs84(lon, lat):
    a = 6378245.0
    ee = 0.00669342162296594323
    
    if lon is None or lat is None:
        return None, None
        
    dLat = transformLat(lon - 105.0, lat - 35.0)
    dLon = transformLon(lon - 105.0, lat - 35.0)
    radLat = lat / 180.0 * PI
    magic = 1 - ee * sin(radLat) * sin(radLat)
    sqrtMagic = sqrt(magic)
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI)
    dLon = (dLon * 180.0) / (a / sqrtMagic * cos(radLat) * PI)
    wgsLat = lat - dLat
    wgsLon = lon - dLon
    return wgsLon, wgsLat

def main():
    # 读取CSV文件
    df = pd.read_csv('/Users/chubohan/Desktop/repo/final5024/subway-react/public/station_coordinates1.csv')
    
    # 转换坐标
    converted_coords = [gcj02_to_wgs84(lon, lat) for lon, lat in zip(df['经度'], df['纬度'])]
    df['经度'] = [coord[0] for coord in converted_coords]
    df['纬度'] = [coord[1] for coord in converted_coords]
    
    # 保存转换后的文件
    df.to_csv('/Users/chubohan/Desktop/repo/final5024/subway-react/public/station_coordinates.csv', index=False)
    print("坐标转换完成，已保存到 station_coordinates.csv")

if __name__ == '__main__':
    main()
