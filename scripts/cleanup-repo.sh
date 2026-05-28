#!/bin/sh
# Ce script doit être exécuté une seule fois pour corriger les fichiers déjà trackés par Git,
# puis le script lui-même doit être committé.

git rm --cached dev-server.err.log dev-server.log
git rm -r --cached release-portable-nosign-2/
