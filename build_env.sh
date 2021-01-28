#!/bin/bash
# We do not want to track our environment variables in source
# but unfortunately, serverless bundles everything up each time
# a deployment happens and a `.env` file needs to be included.
# This script dynamically creates it... very naively

# WARNING: This will overwrite .env
printf "CLIENT_ID=$CLIENT_ID\n" >> .env
printf "CLIENT_SECRET=$CLIENT_SECRET\n" >> .env
printf "OAUTH_TOKEN=$OAUTH_TOKEN\n" >> .env
