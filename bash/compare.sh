#!/bin/bash

#Compare and take uniq from new file.
OLD=$1
NEW=$2
SAVETO=$3
comm -23 <(sort $NEW) <(sort $OLD) > $SAVETO
wc -l $SAVETO
