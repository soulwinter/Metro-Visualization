import pandas as pd
import re

# Read the CSV file
df = pd.read_csv('/Users/chubohan/Desktop/repo/final5024/output.csv')

# Function to extract number from subway line
def extract_line_number(line):
    # Chinese number mapping
    chinese_numbers = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
    }
    
    # First try to match pattern with Chinese number
    match = re.search(r'地铁([一二三四五六七八九十]+)号线', line)
    if match:
        chinese_num = match.group(1)
        return chinese_numbers.get(chinese_num, chinese_num)
    
    # If no Chinese number found, try Arabic numbers
    num = re.search(r'地铁(\d+)号线', line)
    if num:
        return int(num.group(1))
    return line

# Transform subway line numbers
df['地铁线路'] = df['地铁线路'].apply(extract_line_number)

# Transform transaction types (入站 -> 0, 出站 -> 1)
df['交易类型'] = df['交易类型'].apply(lambda x: 0 if '入站' in x else 1)

# Save the transformed data
df.to_csv('output_transformed.csv', index=False)
print("Transformation completed. Results saved to 'output_transformed.csv'")
