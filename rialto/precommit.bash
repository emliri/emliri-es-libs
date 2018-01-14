#!/bin/bash

git status --porcelain | grep .ts$ | awk 'match($1, "M"){print $2}' | xargs ./node_modules/.bin/eslint

