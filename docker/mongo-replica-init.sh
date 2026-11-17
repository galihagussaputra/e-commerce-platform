#!/bin/sh
set -eu

until mongosh --host mongodb:27017 --quiet --eval 'db.adminCommand({ ping: 1 }).ok' >/dev/null 2>&1; do
  sleep 2
done

mongosh --host mongodb:27017 --quiet --eval '
try {
  rs.status();
  print("Replica set already initialized");
} catch (error) {
  try {
    rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] });
    print("Replica set initiated");
  } catch (initError) {
    if (initError.code !== 23) throw initError;
    print("Replica set already initialized concurrently");
  }
}
'

until mongosh --host mongodb:27017 --quiet --eval 'db.adminCommand({ hello: 1 }).isWritablePrimary' | grep -q true; do
  sleep 2
done

echo 'Replica set primary ready'
