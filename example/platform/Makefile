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

default: help all

main_src ?= index.js
lib_srcs ?= $(wildcard */*.js | sort)
runtime ?= node
topreldir ?= ../..
topdir ?= ${CURDIR}/${topreldir}
run_args ?=
npm_args ?= start
sudo ?= sudo
gpio ?= gpio
tmp_dir ?= tmp

export PATH
NODE_PATH := ${topreldir}:${NODE_PATH}
export NODE_PATH

rpi_gpio ?= 11
rpi_gpio_list ?= 13 19 26
edison_gpio ?= 12

help:
	@echo "Usage:"
	@echo '# make start'
	@echo '# make $${board}'
	@echo '# make artik1020'
	@echo '# make edison'
	@echo '# make flex-phat'
	@echo '# make play-phat'
	@echo '# make traffic-phat'

%: %/${runtime}
	echo "# $@: $^"

all: check

setup/node: ${topreldir}/node_modules node_modules
	@echo "NODE_PATH=$${NODE_PATH}"
	@echo "$@: $^"

run/%: /sys/class/gpio/export ${main_src} setup
	ls -l $<
	-which ${@F}
	${@F} ${main_src} ${run_args}

sudo/run/%: /sys/class/gpio/export ${main_src} setup
	ls -l $<
	-which ${@F}
	${sudo} env "PATH=${PATH}" ${@F} ${main_src} ${run_args}

run/npm: /sys/class/gpio/export package.json setup
	ls -l $<
	npm run ${npm_args} ${run_args}

run: run/${runtime}
	sync

start: run
	sync

force:

/sys/kernel/debug/gpio:
	${sudo} ls -l $@

/sys/class/gpio/export: /sys/kernel/debug/gpio force
	${sudo} cat $<

node_modules: package.json
	-which npm
	npm --version
	npm install
	@mkdir -p "$@"
	ln -fs ../../.. ${@}/webthing

package.json:
	npm init

${topreldir}/node_modules: ${topreldir}/package.json
	cd ${@D} && npm install


check/%: ${lib_srcs}
	${MAKE} setup
	status=0 ; \
	for src in $^; do \
 echo "log: check: $${src}: ($@)" ; \
 ${@F} $${src} \
 && echo "log: check: $${src}: OK" \
 || status=1 ; \
 done ; \
	exit $${status}

check: check/${runtime}

board/%: ${main_src} board/%.js /sys/class/gpio/export setup
	${runtime} $< ${@F}

/sys/class/gpio/gpio${edison_gpio}: /sys/class/gpio/export
	echo ${edison_gpio} | ${sudo} tee $<
	ls -l $@

artik1020/%: ${main_src}
	${MAKE} sudo/run/${@F} run_args="${@D}"

edison/%: /sys/class/gpio/gpio${edison_gpio} ${main_src}
	echo out | ${sudo} tee ${<}/direction
	echo 0 | ${sudo} tee ${<}/value
	${sudo} cat /sys/kernel/debug/gpio_debug/gpio${edison_gpio}/current_pinmux # mode0
	echo mode1 | ${sudo} tee /sys/kernel/debug/gpio_debug/gpio${edison_gpio}/current_pinmux
	${MAKE} sudo/run/${@F} run_args="${@D}"

gpio: /sys/class/gpio/export 
	-${gpio} -v || ${sudo} apt-get install gpio || echo "TODO: install BCM tool"
	-${gpio} -v

flex-phat/%: ${main_src} gpio
	${gpio} -g mode ${rpi_gpio} up
	${MAKE} run/${@F} run_args="${@D}"

play-phat/%: ${main_src} /sys/class/gpio/export
	-lsmod | grep gpio_keys \
 && ${sudo} modprobe -rv gpio_keys \
 || echo "log: will use /sys/class/gpio/"
	${MAKE} run/${@F} run_args="${@D}"

traffic-phat/%: ${main_src} gpio
	 for num in ${rpi_gpio_list} ; do \
 ${sudo} ${gpio} export $${num} in ; \
 ${sudo} ${gpio} -g mode $${num} up ; \
 ${sudo} ${gpio} unexport $${num} ; \
 done
	${MAKE} run/${@F} run_args="${@D}"
