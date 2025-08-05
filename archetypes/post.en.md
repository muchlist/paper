---
title: '{{ replace .File.ContentBaseName "-" " " | title | strings.TrimSuffix " En" }}'
date: {{ .Date }}
draft: true
# weight: 1
categories: ["Backend"]
tags: ["first"]
# aliases: ["/first"]
author: "Muchlis"
# author: ["Me", "You"] # multiple authors
showToc: true
TocOpen: false
hidemeta: false
comments: true
description: '{{ replace .File.ContentBaseName "-" " " | title | strings.TrimSuffix " En" }}'
disableHLJS: true # to disable highlightjs
disableShare: false
disableHLJS: false
hideSummary: false
searchHidden: false
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
ShowShareButtons: true
ShareButtons: ["linkedin", "x", "facebook", "whatsapp", "telegram"]
UseHugoToc: true
# canonicalURL: "https://canonical.url/to/page"
cover:
    # image: "<image path/url>" # image path/url
    # alt: "<alt text>" # alt text
    # caption: "<text>" # display caption under cover
    # relative: false # when using page bundles set this to true
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/muchlist/paper/tree/main/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
# images:
#   - image_01.png
#   - image_02.png
---

{{ replace .File.ContentBaseName "-" " " | title | strings.TrimSuffix " En" }}

<!--more-->