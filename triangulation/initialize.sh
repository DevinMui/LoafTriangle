#!/bin/bash
apt-get update
apt-get install -y htop vim python3 python3-requests
DEBIAN_FRONTEND=noninteractive apt-get -o Dpkg::Options::="--force-confnew" --force-yes -fuy install wireless-tools firmware-atheros usbutils wireshark tshark hostapd
ssh-keygen -b 2048 -t rsa -f /home/pi/.ssh/id_rsa -q -N ""