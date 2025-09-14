#!/bin/bash

echo "Scaling down service to 2 replicas"
docker-compose scale channel-metadata-store=2
sleep_time=15
echo "Sleeping for $sleep_time seconds"
sleep $sleep_time

echo "Scaling down to 1 replicas"
docker-compose scale channel-metadata-store=1
sleep_time=15
echo "Sleeping for $sleep_time seconds"
sleep $sleep_time

echo "Scaling up to 3 replicas"
docker-compose scale channel-metadata-store=3
sleep_time=15
echo "Sleeping for $sleep_time seconds"
sleep $sleep_time

echo "Scaling channel-metadata-store back to 4 replicas"
docker-compose scale channel-metadata-store=4
