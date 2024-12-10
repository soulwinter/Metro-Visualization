import pandas as pd
import requests
import json
import os
from collections import defaultdict
from config import get_amap_key, AMAP_BASE_URL
from convert_coordinates import gcj02_to_wgs84
import time

# Configuration
api_key = "ea40ee821c720a82f888c7300b75730d"
RADIUS = 300
PAGE_SIZE = 25

# Type definitions and weights
TYPE_WEIGHTS = {
    # Hospital (ID: 1)
    '090100': 6, '090200': 5,
    # School (ID: 2)
    '141200': 4, '141300': 3,
    # Commercial (ID: 3)
    '060100': 10, '060300': 3, '110000': 2, '100101': 1.5, '100102': 2, '100103': 2,
    # Science & Education (ID: 4)
    '140100': 20, '140200': 10, '140300': 10, '140400': 10, '140500': 10, 
    '140600': 10, '140700': 15,
    # Office (ID: 5)
    '120100': 5, '120201': 3, '120202': 2, '130000': 1.5, '160000': 1,
    '170000': 1, '070700': 0.8, '140900': 1, '141100': 0.8,
    # Transportation (ID: 6)
    '150104': 50, '150200': 50, '150400': 30,
    # Residential (ID: 7)
    '120300': 10, '120203': 5
}

# Type mapping
TYPE_MAPPING = {
    # Hospital
    '0901': 1,
    # School
    '1412': 2, '1413': 2,
    # Commercial
    '0601': 3, '0603': 3, '1100': 3, '1001': 3,
    # Science & Education
    '1401': 4, '1402': 4, '1403': 4, '1404': 4, '1405': 4, '1406': 4, '1407': 4,
    # Office
    '1201': 5, '1202': 5, '1300': 5, '1600': 5, '1700': 5, '0707': 5, '1409': 5, '1411': 5,
    # Transportation
    '1501': 6, '1502': 6, '1504': 6,
    # Residential
    '1203': 7
}

# Type definitions and type codes for API queries
TYPE_CODES = {
    1: '090100|090200',  # Hospital
    2: '141200|141300',  # School
    3: '060100|060300|110000|100000|110000',  # Commercial
    4: '140100|140200|140300|140400|140500|140600|140700',  # Science & Education
    5: '120100|120201|120202|130000|160000|170000|070700|140900|141100',  # Office
    6: '150104|150200|150400',  # Transportation
    7: '120300|120203'  # Residential
}

def get_type_id(type_code):
    prefix = type_code[:4]
    return TYPE_MAPPING.get(prefix)

def get_weight(type_code):
    # If exact match exists
    if type_code in TYPE_WEIGHTS:
        return TYPE_WEIGHTS[type_code]
    
    # Try prefix match (for XX00 cases)
    prefix = type_code[:4] + '00'
    if prefix in TYPE_WEIGHTS:
        return TYPE_WEIGHTS[prefix]
    
    return 0

def load_existing_data():
    existing_stations = set()
    if os.path.exists('station_type.csv') and os.path.exists('station_around.csv'):
        try:
            type_df = pd.read_csv('station_type.csv')
            around_df = pd.read_csv('station_around.csv')
            # Only consider stations that exist in both files
            existing_stations = set(type_df['站名']) & set(around_df['站名'])
            print(f"Found {len(existing_stations)} stations in existing files")
        except Exception as e:
            print(f"Error reading existing files: {e}")
            existing_stations = set()
    return existing_stations

def get_nearby_pois(longitude, latitude):
    all_pois = []
    type_scores = defaultdict(float)
    poi_details = []

    # Query each type category separately
    for type_id, type_codes in TYPE_CODES.items():
        print(f"  Querying type {type_id} ({TYPE_DESCRIPTIONS[type_id]})")
        page = 1
        total_pois = 0
        
        while True:
            url = f"{AMAP_BASE_URL}/v3/place/around"
            params = {
                'key': api_key,
                'location': f"{longitude},{latitude}",
                'radius': RADIUS,
                'output': 'json',
                'offset': PAGE_SIZE,
                'page': page,
                'extensions': 'all',
                'types': type_codes
            }
            
            try:
                response = requests.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                pois = data.get('pois', [])
                
                if not pois:
                    break
                
                for poi in pois:
                    type_code = poi['typecode']
                    weight = get_weight(type_code)
                    
                    if weight > 0:
                        type_scores[type_id] += weight
                        total_pois += 1
                        
                        # Convert coordinates
                        x, y = map(float, poi['location'].split(','))
                        wgs_x, wgs_y = gcj02_to_wgs84(x, y)
                        
                        poi_details.append({
                            'name': poi['name'],
                            'location': {
                                'x': wgs_x,
                                'y': wgs_y,
                                'type': type_id,
                                'original_type': type_code
                            }
                        })
                
                if len(pois) < PAGE_SIZE:
                    break
                    
                page += 1
                
            except Exception as e:
                print(f"    Error querying API: {e}")
                break
        
        print(f"    Found {total_pois} POIs with weight > 0")
        # Add small delay between queries
        time.sleep(0.1)

    return type_scores, poi_details

def main():
    # Read station coordinates
    stations_df = pd.read_csv('station_coordinates_gcj02.csv')
    total_stations = len(stations_df)
    
    # Load existing data
    existing_stations = load_existing_data()
    
    results = []
    station_pois = []
    
    for idx, row in stations_df.iterrows():
        station_name = row['站名']
        
        # Skip if already processed
        if station_name in existing_stations:
            print(f"Skipping station {station_name} (already processed)")
            continue
            
        print(f"\nProcessing station {station_name} ({idx + 1}/{total_stations})")
        longitude = row['经度']
        latitude = row['纬度']
        
        # Get POIs and calculate scores
        type_scores, poi_details = get_nearby_pois(longitude, latitude)
        
        # Find dominant type
        dominant_type = max(type_scores.items(), key=lambda x: x[1])[0] if type_scores else 0
        
        # Prepare results
        result = {
            '站名': station_name,
            '主导类型': dominant_type
        }
        # Add scores for each type
        for type_id in range(1, 8):
            score = type_scores.get(type_id, 0)
            result[f'类型{type_id}得分'] = score
            print(f"  Type {type_id} score: {score:.2f}")
        
        results.append(result)
        
        # Store POI details
        station_pois.append({
            '站名': station_name,
            'POIs': json.dumps(poi_details, ensure_ascii=False)
        })
        
        # Save intermediate results after each station
        pd.DataFrame(results).to_csv('station_type.csv', index=False)
        pd.DataFrame(station_pois).to_csv('station_around.csv', index=False)
        print(f"Saved results for {station_name}")
    
    print("\nAll stations processed successfully!")

# Add type descriptions for better logging
TYPE_DESCRIPTIONS = {
    1: "Hospital",
    2: "School",
    3: "Commercial",
    4: "Science & Education",
    5: "Office",
    6: "Transportation",
    7: "Residential"
}

if __name__ == '__main__':
    main()
