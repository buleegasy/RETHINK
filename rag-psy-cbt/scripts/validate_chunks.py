import json
import os
import sys

def validate_jsonl(file_path):
    print(f"Validating {file_path}...")
    required_fields = ["chunk_id", "source_type", "target_audience", "keywords", "summary", "content"]
    
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist.")
        return False
    
    success = True
    line_num = 0
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line_num += 1
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    missing = [f for f in required_fields if f not in data]
                    if missing:
                        print(f"Line {line_num}: Missing fields {missing}")
                        success = False
                except json.JSONDecodeError as e:
                    print(f"Line {line_num}: Invalid JSON - {e}")
                    success = False
    except Exception as e:
        print(f"Error reading file: {e}")
        return False
    
    if success:
        print(f"Validation successful for {file_path} ({line_num} lines).")
    return success

if __name__ == "__main__":
    data_dir = "data/cleaned"
    files = [f for f in os.listdir(data_dir) if f.endswith(".jsonl")]
    
    if not files:
        print(f"No JSONL files found in {data_dir}")
        sys.exit(0)
        
    all_success = True
    for file in files:
        if not validate_jsonl(os.path.join(data_dir, file)):
            all_success = False
            
    if not all_success:
        sys.exit(1)
