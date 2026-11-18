#!/bin/bash
awk -v a="$1" -v b="$2" '{ if (match($0,/^ +[0-9a-f]+:/)) { s=substr($0,RSTART,RLENGTH); gsub(/[ :]/,"",s); if (s>=a && s<=b) print } }' /home/gautier/SynologyDrive/code/current/demoports/3s-money/re/img_all.dis | sed 's/\t/ /g' | sed -E 's/^ +([0-9a-f]+): +([0-9a-f]{2} )+ */\1 /;s/DWORD PTR //;s/ +/ /g'
