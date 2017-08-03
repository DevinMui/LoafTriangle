from pylab import *
import requests
import json
import time
url = 'http://192.168.1.8:3000'
route = url+'/nodes'
fake = url+'/fake'
track = url+'/track'
nodes = {}
phones = {}
oldPhones = {}
ion()
fig = figure()
ax = fig.add_subplot(111)

while 1:
	# try:
	r = requests.get(route)
	mb = requests.get(track)
	mbJSON = mb.json()
	print mbJSON

	if phones:
		oldPhones = phones.copy()
	phones.clear()

	phones['x'] = mbJSON['android']['x']
	phones['y'] = mbJSON['android']['y']
	#ax = fig.add_subplot(111)
	rJSON = r.json()
	print rJSON
	for node in rJSON:
		nodes[node['x']] = node['y']
	
	try:
		ax.scatter(oldPhones['x'], oldPhones['y'], s=10)
	except:
		print 'hi'
	ax.scatter(nodes.keys(), nodes.values())
	ax.scatter(phones['x'], phones['y'], s=20)
	fig.show()
	pause(0.001)
	time.sleep(1)
	# except:
	# 	print('fail')
	# 	#pls = requests.get(fake)
	# 	time.sleep(1)

