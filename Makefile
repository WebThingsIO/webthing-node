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

tmp_dir ?= tmp
runtime ?= node
export runtime
eslint ?= node_modules/eslint/bin/eslint.js
tsc ?= node_modules/typescript/bin/tsc
srcs ?= $(wildcard *.ts lib/*.ts | sort | uniq)
run_args ?=
run_timeout ?= 10

main_src ?= example/multiple-things.js
NODE_PATH := .:${NODE_PATH}
export NODE_PATH


port?=8888
url?=http://localhost:${port}

help:
	@echo "## Usage: "
	@echo "# make start # To start default application"
	@echo "# make test # To test default application"

all: build

setup/%:
	${@F}

node_modules: package.json
	npm install

modules: ${runtime}_modules
	ls $<

package-lock.json: package.json
	rm -fv "$@"
	npm install
	ls "$@"

setup/node: node_modules
	@echo "NODE_PATH=$${NODE_PATH}"
	node --version
	npm --version

setup: setup/${runtime}

build/%: setup
	@echo "log: $@: $^"

build/node: setup node_modules eslint

build: build/${runtime}

run/%: ${main_src} build
	${@F} $< ${run_args}

run/npm: ${main_src} setup
	npm start

run: run/${runtime}

clean:
	rm -rf ${tmp_dir}

cleanall: clean
	rm -f *~

distclean: cleanall
	rm -rf node_modules

${tmp_dir}/rule/test/pid/%: ${main_src} build modules
	@mkdir -p "${@D}"
	${@F} $< & echo $$! > "$@"
	sleep ${run_timeout}
	cat $@

test/%: ${tmp_dir}/rule/test/pid/%
	cat $<
	curl ${url} || curl -I ${url}
	@echo ""
	curl --fail ${url}/0/properties
	@echo ""
	curl --fail ${url}/1/properties
	@echo ""
	kill $$(cat $<) ||:
	kill -9 $$(cat $<) ||:

test/npm: package.json
	npm test

test: test/${runtime}

start: run

start/board/%: example/platform/Makefile example/platform/board/%.js
	${MAKE} -C ${<D} board/${@F}

check/%: ${srcs}
	${MAKE} setup
	@echo "log: SHELL=$${SHELL}"
	status=0 ; \
 for src in $^; do \
 echo "log: check: $${src}: ($@)" ; \
 ${@F} $${src} \
 && echo "log: check: $${src}: OK" \
 || status=1 ; \
 done ; \
	exit $${status}

check/npm:
	npm run lint

check: check/${runtime}

eslint: .eslintrc.js ${eslint}
	@rm -rf tmp/dist
	${eslint} --no-color --fix . ||:
	${eslint} --no-color .
	${tsc}
	git diff --exit-code

eslint/setup: node_modules
	ls ${eslint} || npm install eslint-plugin-node eslint
	${eslint} --version

${eslint}:
	ls $@ || make eslint/setup
	touch $@

.eslintrc.js: ${eslint}
	ls $@ || $< --init

lint/%: eslint
	sync

lint: lint/${runtime}
	sync
