#!/bin/bash

# This script is intended to run tests for the SCADA water pumping station application.

# Navigate to the backend directory and run tests
cd backend
npm test

# Navigate to the frontend directory and run tests
cd ../frontend
npm test

echo "All tests have been executed."