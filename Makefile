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

default: all

tmp_dir ?= tmp
runtime ?= node
run_args ?=
run_timeout ?= 10
main_src ?= example/multiple-things.js
SHELL :=NODE_PATH=. ${SHELL}


all: node_modules

node_modules: package.json
	npm install

clean:
	rm -rf ${tmp_dir}

cleanall: clean
	rm *~

distclean: cleanall
	rm -rf node_modules

${tmp_dir}/rule/test/pid/%: ${main_src}
	mkdir -p "${@D}"
	${@F} $< & echo $$! > "$@"
	sleep ${run_timeout}

test/%: ${tmp_dir}/rule/test/pid/%
	cat $<
	curl http://localhost:8888
	kill $$(cat $<)

test: test/${runtime}
