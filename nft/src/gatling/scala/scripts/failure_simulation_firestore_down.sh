#!/bin/bash

firestore_instance="firestore"

echo "Taking down $firestore_instance"
docker-compose stop $firestore_instance

sleep_time_1=45
echo "Sleeping for $sleep_time_1 seconds before bringing up firestore instance"
sleep $sleep_time_1

echo "Bringing up $firestore_instance"
docker-compose start $firestore_instance

