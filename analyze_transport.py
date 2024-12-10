import json
import csv

def jsons_to_csv(jsons_file_path, csv_file_path):
    # 打开 jsons 文件
    with open(jsons_file_path, 'r', encoding='utf-8') as jsons_file:
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as csv_file:
            csv_writer = csv.writer(csv_file)
            # 写入表头
            csv_writer.writerow(['日期', '时间', '地铁线路', '交易类型', '站名', 'card_no'])
            
            # 逐行读取 json 数据
            for line in jsons_file:
                record = json.loads(line)  # 解析每行 JSON
                
                # 遍历数据字段
                for entry in record.get('data', []):
                    deal_type = entry.get('deal_type', '')
                    if '地铁' in deal_type:  # 过滤掉巴士信息
                        deal_date = entry.get('deal_date', '')
                        company_name = entry.get('company_name', '')
                        station = entry.get('station', '')
                        card_no = entry.get('card_no', '')  # 获取 card_no 字段
                        
                        # 分离日期和时间
                        date, time = deal_date.split(' ', 1) if ' ' in deal_date else (deal_date, '')
                        
                        # 写入 CSV 行
                        csv_writer.writerow([date, time, company_name, deal_type, station, card_no])

# 文件路径
jsons_file_path = '/Users/chubohan/Desktop/repo/final5024/2018record.jsons'  # 替换为实际 JSONS 文件路径
csv_file_path = 'output.csv'  # 替换为所需 CSV 输出路径

# 调用函数
jsons_to_csv(jsons_file_path, csv_file_path)

print(f"数据已成功转换为 CSV 文件：{csv_file_path}")