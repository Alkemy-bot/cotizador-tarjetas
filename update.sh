#!/bin/sh
set -e
git pull origin master
COMPOSE_HTTP_TIMEOUT=200 docker-compose up -d --build
echo "Actualizado correctamente."
