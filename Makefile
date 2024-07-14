init:
	git submodule init && git submodule update

## new/page name=$1: create a new page
new/page:
	hugo new --kind post ${name}