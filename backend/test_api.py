import requests

r = requests.post('http://localhost:8000/api/analyze', json={'prompt':'test', 'response':'test'})
print("STATUS:", r.status_code)
print("BODY:", r.text)
