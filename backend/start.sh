#!/usr/bin/env bash
set -o errexit

python manage.py migrate --no-input
python manage.py seed_orhsb
python manage.py seed_rhs_data
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
