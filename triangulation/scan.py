import sys
import json
import socket
import time
import subprocess
import os
import glob
import argparse
import logging
import statistics
import atexit
from multiprocessing import Process, Value, Manager
from uuid import getnode as get_mac
logger = logging.getLogger('scan.py')
import requests

found_nodes = False

omac = get_mac()
owmac = ':'.join(("%012X" % omac)[i:i+2] for i in range(0, 12, 2))
own_mac = owmac.lower()
url = 'http://192.168.1.8:3000'

def get_node_and_mac():
	payload = {'mac': own_mac}
	route = url + '/init'
	r = requests.post(route, data=payload)
	return r.json()['length'] - 1

def restart_wifi():
	os.system("/sbin/ifdown --force wlan0")
	os.system("/sbin/ifup --force wlan0")
	os.system("iwconfig wlan0 mode managed")
	while True:
		ping_response = subprocess.Popen(
			["/bin/ping", "-c1", "-w100", url], stdout=subprocess.PIPE).stdout.read()
		if '64 bytes' in ping_response.decode('utf-8'):
			break
		time.sleep(1)


def num_wifi_cards():
	cmd = 'iwconfig'
	p = subprocess.Popen(cmd, shell=True, stdin=subprocess.PIPE,
						 stdout=subprocess.PIPE, stderr=subprocess.STDOUT, close_fds=True)
	output = p.stdout.read().decode('utf-8')
	return output.count("wlan")


def process_scan(time_window, own_node):

	payload = None

	node_x = None
	node_y = None

	route = url + '/nodes'
	r = requests.get(route)
	if len(r.json()) < 3:
		return payload

	for node in r.json():
		if node['node'] == own_node
			node_x = node['x']
			node_y = node['y']
			
	print r.json()

	logger.debug("Reading files...")
	output = ""
	maxFileNumber = -1
	fileNameToRead = ""
	for filename in glob.glob("/tmp/tshark-temp*"):
		fileNumber = int(filename.split("_")[1])
		if fileNumber > maxFileNumber:
			maxFileNumber = fileNumber
			fileNameToRead = filename

	logger.debug("Reading from %s" % fileNameToRead)
	cmd = subprocess.Popen(("tshark -r "+fileNameToRead+" -T fields -e frame.time_epoch -e wlan.sa -e wlan.bssid -e radiotap.dbm_antsignal").split(
	), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	output += cmd.stdout.read().decode('utf-8')

	timestamp_threshold = float(time.time()) - float(time_window)
	fingerprints = {}
	relevant_lines = 0
	for line in output.splitlines():
		try:
			timestamp, mac, mac2, power_levels = line.split("\t")
			# print mac
			if mac == mac2 or float(timestamp) < timestamp_threshold or len(mac) == 0:
				# print float(timestamp) < timestamp_threshold
				continue
			
			relevant_lines+=1
			rssi = power_levels.split(',')[0]
			if len(rssi) == 0:
				continue

			if mac not in fingerprints:
				fingerprints[mac] = []
			fingerprints[mac].append(float(rssi))
		except:
			print "pass"
			pass
	logger.debug("..done")

	# Compute medians
	fingerprints2 = []

	for mac in fingerprints:
		if len(fingerprints[mac]) == 0:
			continue
		if str(mac) == own_mac:
			print 'WOW YOU VIOLATED THE LAW'
			continue
		else:
			if str(mac) != "f0:d7:aa:7e:f9:0c":
				continue
		# print mac
		fingerprints2.append(
			{"mac": mac, "rssi": int(statistics.median(fingerprints[mac]))})

	logger.debug("Processed %d lines, found %d fingerprints in %d relevant lines" %
				 (len(output.splitlines()), len(fingerprints2),relevant_lines))

	if len(fingerprints2) == 0:
		return payload
	else:
		r.json()[]
		payload = {
			'mac': fingerprints2[0]['mac'],
			'rssi': fingerprints2[0]['rssi'],
			'x': node_x,
			'y': node_y
		}
		logger.debug(payload)
		# return payload
		return payload

def init(time_window, own_node, args):
	other_nodes = []
	while(True):
		other_nodes = []
		route = url + '/init'
		r = requests.get(route)
		for node in r.json():
			other_nodes.append(node)
		if len(other_nodes) > 2:
			break

	fingerprints2 = []
	payload = None
	while(True):

		logger.debug("Reading files...")
		output = ""
		maxFileNumber = -1
		fileNameToRead = ""
		for filename in glob.glob("/tmp/tshark-temp*"):
			fileNumber = int(filename.split("_")[1])
			if fileNumber > maxFileNumber:
				maxFileNumber = fileNumber
				fileNameToRead = filename

		logger.debug("Reading from %s" % fileNameToRead)
		cmd = subprocess.Popen(("tshark -r "+fileNameToRead+" -T fields -e frame.time_epoch -e wlan.sa -e wlan.bssid -e radiotap.dbm_antsignal").split(
		), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		output += cmd.stdout.read().decode('utf-8')

		timestamp_threshold = float(time.time()) - float(time_window)
		fingerprints = {}
		relevant_lines = 0
		for line in output.splitlines():
			try:
				timestamp, mac, mac2, power_levels = line.split("\t")
				if mac == mac2 or float(timestamp) < timestamp_threshold or len(mac) == 0:
					# print mac
					# print float(timestamp) < timestamp_threshold
					continue
				
				relevant_lines+=1
				rssi = power_levels.split(',')[0]
				if len(rssi) == 0:
					continue

				if mac not in fingerprints:
					fingerprints[mac] = []
				fingerprints[mac].append(float(rssi))
				logger.debug(mac)
			except:
				pass
		logger.debug("..done")

		# print fingerprints

		for mac in fingerprints:
			if len(fingerprints[mac]) == 0:
				continue
			if str(mac) == own_mac:
				# print 'WOW YOU VIOLATED THE LAW'
				continue
			else:
				for node in other_nodes:
					if mac == node['mac']:
						other_nodes.remove(node)
						fingerprints2.append(
						{
							"rssi": int(statistics.median(fingerprints[mac])),
							"mac": mac
						})
					else:
						continue

		logger.debug("Processed %d lines, found %d fingerprints in %d relevant lines" %
					 (len(output.splitlines()), len(fingerprints2),relevant_lines))

		if len(fingerprints2) == 2:
			payload = {
				"node": own_node,
				"mac": own_mac,
				"rssis": fingerprints2
			}

		if len(r.json()) == 3 and payload:
			break
		time.sleep(float(time_window))
		
	# print payload
	r = requests.post(
		args.server +
		"/",
		json=payload)
		
	logger.debug(
		"Sent to server with status code: " + str(r.status_code))	

def run_command(command):
	p = subprocess.Popen(
		command.split(),
		stdout=subprocess.PIPE,
		stderr=subprocess.STDOUT)
	return iter(p.stdout.readline, b'')


def tshark_is_running():
	ps_output = subprocess.Popen(
		"ps aux".split(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	ps_stdout = ps_output.stdout.read().decode('utf-8')
	isRunning = 'tshark' in ps_stdout and '[tshark]' not in ps_stdout
	logger.debug("tshark is running: " + str(isRunning))
	return isRunning


def start_scan(wlan):
	if not tshark_is_running():
		# Remove previous files
		for filename in glob.glob("/tmp/tshark-temp*"):
			os.remove(filename)
		subprocess.Popen(("/usr/bin/tshark -I -i " + wlan + " -b files:4 -b filesize:1000 -w /tmp/tshark-temp").split(),
						 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		if tshark_is_running():
			logger.info("Starting scan")


def stop_scan():
	if tshark_is_running():
		os.system("pkill -9 tshark")
		if not tshark_is_running():
			logger.info("Stopped scan")


def main(node_num):

	# Check if SUDO
	# http://serverfault.com/questions/16767/check-admin-rights-inside-python-script
	if os.getuid() != 0:
		print("you must run sudo!")
		return

	# Check which interface
	# Test if wlan0 / wlan1
	default_wlan = "wlan1"
	default_single_wifi = False
	if num_wifi_cards() == 1:
		default_single_wifi = True
		default_wlan = "wlan0"

	# Parse arguments
	parser = argparse.ArgumentParser()
	parser.add_argument("-g", "--group", default="", help="group name")
	parser.add_argument(
		"-i",
		"--interface",
		default=default_wlan,
		help="Interface to listen on - default %s" % default_wlan)
	parser.add_argument(
		"-t",
		"--time",
		default=5,
		help="scanning time in seconds (default 3)")
	parser.add_argument(
		"--single-wifi",
		default=default_single_wifi,
		action="store_true",
		help="Engage single-wifi card mode?")
	parser.add_argument(
		"-s",
		"--server",
		default=url,
		help="send payload to this server")
	parser.add_argument(
		"-n",
		"--node",
		type=int,
		default=-1,
		help="which node is this")
	# parser.add_argument("-n", "--nodebug", action="store_true")
	args = parser.parse_args()

	# Check arguments for logging
	loggingLevel = logging.DEBUG
	# if args.nodebug:
	# 	loggingLevel = logging.ERROR
	logger.setLevel(loggingLevel)
	fh = logging.FileHandler('scan.log')
	fh.setLevel(loggingLevel)
	ch = logging.StreamHandler()
	ch.setLevel(loggingLevel)
	formatter = logging.Formatter(
		'%(asctime)s - %(funcName)s:%(lineno)d - %(levelname)s - %(message)s')
	fh.setFormatter(formatter)
	ch.setFormatter(formatter)
	logger.addHandler(fh)
	logger.addHandler(ch)

	# Startup scanning
	# print("Using server " + args.server)
	logger.debug("Using server " + args.server)
	start_scan(args.interface)
	init(args.time, node_num, args) # initialization with loaf server
	while True:
		try:
			# if args.single_wifi:
			# 	logger.debug("Stopping scan...")
			# 	stop_scan()
			# 	logger.debug("Stopping monitor mode...")
			# 	restart_wifi()
			# 	logger.debug("Restarting WiFi in managed mode...")
			payload = process_scan(args.time, node_num)
			if payload != None:
				r = requests.post(
					args.server +
					"/trilateration",
					json=payload)
				logger.debug(
					"Sent to server with status code: " + str(r.status_code))
			time.sleep(float(args.time))  # Wait before getting next window
		except Exception:
			logger.error("Fatal error in main loop", exc_info=True)
			time.sleep(float(args.time))


def exit_handler():
	os.system("pkill -9 tshark")

if __name__ == "__main__":
	node_number = get_node_and_mac()
	atexit.register(exit_handler)
	main(node_number)