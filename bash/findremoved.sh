#!/bin/bash

OLDFILE=$1
NEWFILE=$2
SAVETO=$3
BACKUP=$4

sdiff --speed-large-files -s -l $OLDFILE $NEWFILE | grep '[<]$' | cut -d\" -f2 > $SAVETO
cat $SAVETO >> $BACKUP 
wc -l $SAVETO
