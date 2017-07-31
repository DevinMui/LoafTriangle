[![Logo](brownbg.png)](http://www.projectloaf.net)

# Loaf Triangulation

## Table of Contents

* [Abstract](#abstract)
* [Dependencies](#dependencies)
* [Setup](#setup)
* [Results](#results)
* [Usage](#usage)
* [Contributing](#Contributing)
* [License](#license)

## Abstract

In almost every household in the United States, WiFi signals are present. In this experiment/project, we will develop software to sniff for active probes emitted by connection attempts from WiFi-enabled devices such as smartphones. In every WiFi request, there is a present Received Signal Strength Indicator (RSSI) which shows a -dBm value. As the RSSI value is the strength of the WiFi signal between the wireless access point (WiFi AP), we can correlate this value with distance as well as obstructions. However, WiFi signals fluctuate because of WiFi signal reflections. In this experiment, we will attempt to trilaterate the internal position of a WiFi-enabled device.

### Dependencies

* Python 3
* Node.js
* 3 Raspberry Pis
* A compatible WiFi adapter that supports terminal mode

### Setup

Clone this repository on your host machine (e.g. the computer you're on right now)

```bash
$ git clone https://github.com/DevinMui/LoafTriangle
```

Turn on the Pis and run cluster.py with the initialize option and input the configuration on your local machine

```bash
$ python3 cluster.py initialize
```

Visit `http://localhost:3000/track` to look at the JSON response (distance is returned in meters)

#### Example response

```json
{
    "android": {
        "x": 2.150814795347777,
        "y": 1.1330543893206393
    },
    "node0": {
        "distance": 0.5011872336272722,
        "mac": "b8:27:eb:ec:77:38"
    },
    "node1": {
        "distance": 0.6309573444801932,
        "mac": "b8:27:eb:c5:51:a0"
    },
    "node2": {
        "distance": 0.31622776601683794,
        "mac": "b8:27:eb:6f:af:5f"
    }
}
```

To stop the Raspberry Pi servers

```bash
$ python 3 cluster.py stop
```

### Results

TBD

### Usages

* Store heatmaps
* Store user data/preferences
* Smart home
* Robotics
* Security
* Room classifiers
* Length of line
* more...

### Contributors

* Devin Mui
* Jesse Liang

### License

```
Copyright (C) Loaf Triangulation team - All Rights Reserved
Unauthorized copying of this file, via any medium is strictly prohibited
Proprietary and confidential
Written by Loaf Triangulation team <hello@projectloaf.net>, July 2017
```

### Contributing

[Contribution guidelines for this project](CONTRIBUTING.md)