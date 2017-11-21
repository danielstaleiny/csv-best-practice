#!/bin/bash

##initial sort and reduce by same items from csv.

READFROM=$1
SAVETO=$2

sort -o $SAVETO -t , -k 5.1,5 -s -u $READFROM
wc -l $SAVETO && rm -f $READFROM
