#!/bin/sh

set -e

host="$1"
shift
cmd="$@"

until kafkacat -b "$host:9092" -L; do
  echo "Waiting for Kafka ($host:9092)..."
  sleep 5
done

>&2 echo "Kafka is up - executing command"
exec $cmd
