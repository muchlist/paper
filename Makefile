init:
	git submodule init && git submodule update

## new/page name=$1: create a new page
new/page:
	hugo new --kind post ${name}

## new/post name=$1: create a new post
new/post:
	hugo new content content/post/${name}.md

