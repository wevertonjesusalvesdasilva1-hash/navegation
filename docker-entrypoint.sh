#!/bin/sh
set -e

if [ -n "$WG_CONFIG" ]; then
  mkdir -p /etc/wireguard
  echo "$WG_CONFIG" > /etc/wireguard/wg0.conf
  chmod 600 /etc/wireguard/wg0.conf
  wg-quick up wg0
  echo "WireGuard VPN ativo"
fi

exec npm start
