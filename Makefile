# ==================================================================================== #
# HELPERS
# ==================================================================================== #

## help: print this help message
help:
	@echo 'Usage:'
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'

confirm:
	@echo -n 'Are you sure? [y/N] ' && read ans && [ $${ans:-N} = y ]

# ==================================================================================== #
# DEVELOPMENT
# ==================================================================================== #

## init: initialize module
init:
	git submodule init && git submodule update

## new/page name=$1: create a new page
new/page:
	hugo new --kind post ${name}

## new/post name=$1: create a new post
new/post:
	hugo new content content/post/${name}.md

