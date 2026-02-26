import requests

with open("backend/test_upload.csv", "rb") as f:
    r = requests.post("http://localhost:8000/upload", files={"file": f})

print(f"Status: {r.status_code}")
print(f"Response: {r.text}")
