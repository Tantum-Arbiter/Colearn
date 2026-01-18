#!/bin/bash

# This script simulates Firestore downtime during NFT load testing
# It should be run from the host machine (not inside a container)
# or with docker socket mounted

firestore_container="firestore-emulator"

echo "=========================================="
echo "Firestore Failure Simulation"
echo "=========================================="

# Initial delay to let the test ramp up
sleep_before=15
echo "Waiting $sleep_before seconds for load test to ramp up..."
sleep $sleep_before

echo "Taking down $firestore_container"
docker stop $firestore_container

sleep_time_1=45
echo "Firestore is DOWN - sleeping for $sleep_time_1 seconds..."
sleep $sleep_time_1

echo "Bringing up $firestore_container"
docker start $firestore_container

echo "Firestore is back UP"
echo "=========================================="

