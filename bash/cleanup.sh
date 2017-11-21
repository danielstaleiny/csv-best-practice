#!/bin/bash
OLD=$1
NEW=$2
REMOVED=$3
UPSERT=$4

rm -f $OLD $REMOVED $UPSERT && mv $NEW $OLD
