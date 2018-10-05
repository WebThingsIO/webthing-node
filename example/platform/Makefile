#!/bin/make -f
# -*- makefile -*-
# SPDX-License-Identifier: MPL-2.0
#{
# Copyright 2018-present Samsung Electronics France SAS, and other contributors
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.*
#}

main_src ?= index.js
lib_srcs ?= $(wildcard */*.js | sort)
runtime ?= node
topreldir ?= ../..
topdir ?= ${CURDIR}/${topreldir}
run_args ?= start
sudo ?= sudo

default: check

%: %/${runtime}
	echo "# $@: $^"

run/%: ${main_src} /sys/class/gpio/export
	ls $<
	${@F} $< ${run_args}

run/node: ${main_src} package.json /sys/class/gpio/export
	ls -l node_modules || ${MAKE} node_modules
	ls -l ${topreldir}/node_modules || { cd ${topreldir} && npm install ; }
	npm run ${run_args}

run: run/${runtime}

force:

/sys/class/gpio/export: force
	${sudo} cat /sys/kernel/debug/gpio

node_modules: package.json
	-which npm
	npm --version
	npm install
	@mkdir -p "$@"

package.json:
	npm init

check/%: ${lib_srcs}
	status=0 ; \
	for src in $^; do \
 echo "log: check: $${src}: ($@)" ; \
 ${@F} $${src} \
 && echo "log: check: $${src}: OK" \
 || status=1 ; \
 done ; \
	exit $${status}

check: check/${runtime}


flex-phat/%: ${main_src} /sys/class/gpio/export
	-gpio -v || sudo apt-get install gpio
	gpio -g mode 11 up
	${MAKE} run/${@F} run_args="${@D}"


play-phat/%: ${main_src} /sys/class/gpio/export
	-lsmod | grep gpio_keys \
 && ${sudo} modprobe -rv gpio_keys \
 || echo "log: will use /sys/class/gpio/"
	${MAKE} run/${@F} run_args="${@D}"

traffic-phat/%: ${main_src} /sys/class/gpio/export
	-gpio -v || sudo apt-get install gpio || echo "TODO: install BCM tool"
	list="13 19 26" ; \
 for num in $${list} ; do \
 sudo gpio export $num in \
 sudo gpio -g mode $num up \
 sudo gpio unexport $num \
 done
	${MAKE} run/${@F} run_args="${@D}"
