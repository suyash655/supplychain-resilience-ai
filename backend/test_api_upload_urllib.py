import urllib.request
import urllib.parse
import os

url = "http://localhost:8000/upload"
file_path = "backend/test_upload.csv"
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

with open(file_path, "rb") as f:
    file_content = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="{os.path.basename(file_path)}"\r\n'
    f"Content-Type: text/csv\r\n\r\n"
).encode("utf-8") + file_content + f"\r\n--{boundary}--\r\n".encode("utf-8")

req = urllib.request.Request(url, data=body, method="POST")
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(f"Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
