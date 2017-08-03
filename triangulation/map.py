from pylab import *
import requests
import json
import time
url = 'http://192.168.1.16:3000'
route = url+'/nodes'
fake = url+'/fake'
pts = {}

print(pls.json())
while 1:
	try:
		r = requests.get(route)
		print(x)
		rJSON = r.json()
		for node in rJSON:
			pts[node['x']] = node['y']
		plot(pts.keys(), pts.values())
		show()
		time.sleep(1)
	except:
		print('fail, trying fake')
		pls = requests.get(fake)
		time.sleep(1)

