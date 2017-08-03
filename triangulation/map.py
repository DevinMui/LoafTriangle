from pylab import *
import requests
import json
import time
url = 'http://192.168.1.16:3000'
route = url+'/nodes'
fake = url+'/fake'
track = url+'/track'
nodes = {}
phones = {}


while 1:
	try:
		r = requests.get(route)
		mb = requests.get(track)
		mbJSON = mb.json()
		for phone in mbJSON:
			phones[phone['android']['x']] = phone['android']['y']
		rJSON = r.json()
		for node in rJSON:
			nodes[node['x']] = node['y']
		ax = pylab.subplot(max(int(k) for k in nodes.keys()))
		ax.scatter(nodes.keys(), nodes.values(), '-ro')
		ax.scatter(phones.keys(), phones.values(), '-ro', s=20)
		ax.show()
		time.sleep(1)
	except:
		print('fail, trying fake')
		pls = requests.get(fake)
		time.sleep(1)

