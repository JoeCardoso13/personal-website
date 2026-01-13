---
layout: ../../layouts/BlogPost.astro
title: "Contributing to Firefox: A Guide for New Contributors"
date: "November 01, 2025"
description: "My experience navigating the Firefox development workflow and getting my first patches approved."
---


## Why Mozilla Firefox?

I started contributing to Firefox because I wanted to understand how browsers actually work under the hood. Also, as a millennial, I have been using Firefox since its inception, and have developed sympathies towards it. The following principles of the [Mozilla Manifesto](https://www.mozilla.org/en-US/about/manifesto/), in particular, stand out to me:

### Principle 2

*The internet is a global public resource that must remain open and accessible.*

### Principle 6

*The effectiveness of the internet as a public resource depends upon interoperability (protocols, data formats, content), innovation and decentralized participation worldwide.*

The cool thing about Mozilla is that their organizational structure legally binds them to this mission. Whereas Mozilla's competitors are public corporations answering solely to their shareholders, Mozilla's structure is a peculiar case of a non-profit owning its for-profit subsidiary. The [Mozilla Foundation](https://www.mozillafoundation.org/en/) (non-profit 501(c)(3)) makes sure all major decisions concerning the future of the corporation align with its open web mission. [Mozilla Corporation](https://www.mozilla.org/en-US/) (for-profit) governs day-to-day business decisions, generating revenues, paying employees and so forth.

## Firefox Impact

Only [3 browser engines](https://en.wikipedia.org/wiki/Browser_engine) remain actively developed today: Blink (Google), WebKit (Apple), and Gecko (Mozilla). Keeping Gecko alive is our insurance against the dangers of a monopolized web experience. I remember how [Firefox saved the web](https://www.firefox.com/en-US/more/browser-history/) from IE back in the 2000s, and I'm deeply grateful for it. So I'm hereby paying this debt of gratitude by hunting some bugs for the team!

Additionally, during my journey to master JavaScript I relied heavily on the [MDN documentation](https://developer.mozilla.org/en-US/). I fully endorse its quality, it's the industry-standard documentation for web developers. This gem is funded by revenue from Firefox! Time to give back to the community.

## The Browser

Most people experience the internet through a browser. This is an extremely important piece of software. It has been the birthplace of some of the world's largest companies by market capitalization: Amazon, Alphabet (Google) and Meta (Facebook).

Beyond its importance and impact in society, the browser is also - perhaps surprisingly - incredibly complex. Mozilla Firefox contains more than 31 million lines of code. It's a mature codebase, built over 25+ years. Its architecture comprises of, predominantly, 2 components: 
1. The engine, or platform - in the case of Mozilla Firefox, named **Gecko**, is a program made to run scripts downloaded from all over the web. It's built to execute untrusted instructions from websites, web applications, etc. 
2. The frontend, which is the set of many utility programs that interact with these websites: things that help you memorize form entries, passwords, store your web history, enable bookmarking, etc. This is often simply called **Firefox**.

Most of the teams and specialists working full-time at Mozilla Firefox are organized along those (sometimes blurry) lines. My work as a bughunter was circumscribed to #2, the **Firefox**.

*Side note: the browser UI is rendered by the same engine that renders the contents of the web pages. This means that everything you see surrounding a page you scroll - tabs, bookmarks and so forth - is stylized with CSS, programmed with JavaScript, etc. I could see this, in practice, when working on [refactoring a component from the Debugger panel in DevTools](/blog/bug1543628).*


## Essential Tools

The process of finding a bug to tackle, working on it and submitting a patch can be quite involved, sometimes overwhelming. A good starting reference is [here](https://firefox-source-docs.mozilla.org/setup/contributing_code.html). Here's a quick description of the most important tools I found during this journey:

### Searchfox

[Searchfox](https://searchfox.org/) is the source code search and navigation tool. It indexes C++, Rust, and JavaScript across the entire Firefox codebase. You can search by text, file path, or regex. It is a great place to start working on your bug. It helps you circumscribe affected files in an organized way, so you can tackle them systematically. For an in-depth description of this tool, watch the [FOSDEM 22 presentation by Emilio Cobos](https://archive.fosdem.org/2022/schedule/event/mozilla_searchfox/).

### Matrix

This is Mozilla's real-time chat platform, like a modern IRC. It's where you ask questions, get unstuck, and interact with maintainers. For general contribution questions, `#introduction:mozilla.org` is welcoming to newcomers. When documentation fails you, Matrix is where humans help.

### Bugzilla

I consider [Bugzilla](https://bugzilla.mozilla.org/) the most important tool from this list. Its basic function is a bug tracker, but it goes beyond that. It works more like a full work management system (think tickets, JIRA). It's been running since 1998. Every bug, feature request, and task lives here. Each bug has a unique ID, a history of comments, attachments, and links to related patches. As a contributor, this is where you find work: you can filter by `good-first-bug` to find beginner-friendly issues.

### Phabricator

This is the code review platform. After you write your patch locally, you submit it to Phabricator as a "Differential" (e.g., D272807). Reviewers comment inline, request changes, and eventually approve. Once approved, the patch lands in the repository. Every patch I submitted went through multiple rounds of review here. Good learning can happen here, as maintainers explain why something should be done differently.

### Documentation

[The official documentation](https://firefox-source-docs.mozilla.org/) for the Firefox codebase covers everything. It can be useful for deeper learning, i.e. to understand about a particular part of the codebase you're working on. It is **not**, however, where you'll get specific answers or quick fixes. It's dense but comprehensive, you might want to bookmark it.

## The Process

First you need to get [your local development build of Firefox](https://firefox-source-docs.mozilla.org/setup/index.html) up and running. The idea is that you make your changes locally and then build your own version of Firefox to run manual testing against. This way you can check if your changes do what you expect. Building the entire codebase on your local machine is going to be a long and computationally intensive operation. You'll need to choose between artifact or non-artifact builds. As explained in my post about [overcoming hardware limitations](/blog/building-mozilla-on-a-droplet), the non-artifact is much heavier, but necessary if you're changing C++ code.

Use [Bugzilla to find a bug to work on](https://firefox-source-docs.mozilla.org/setup/contributing_code.html#find-a-bug-we-ve-identified-as-a-good-fit-for-new-contributors). Finding an suitable bug to your skill level is one of the most difficult parts of this journey. When a bug is already assigned to someone, that's a clue **not** to work on it. Some bug pages have lots of previous discussion and helpful input from maintainers.

Keep your code changes within a single commit. The commit message must have this format: `Bug <bug number> - <patch summary>. r?<reviewer’s Bugzilla handle>!` because Phabricator is going to parse it when you submit the patch. The command to submit a patch is `moz-phab`. When running it you might notice that the git commit message has changed. A link to the Phabricator page was added. This is where most of the interactions with the reviewers happen. To further change the content of this commit without touching the description, use `git commit --amend --no-edit`. Also, if running into issues caused by leftovers from previous code changes, run `./mach clobber`, then `./mach build` for a fresh build.

As you'll probably work on the patch through multiple days, it's important to rebase your in-progress git branch against the newest `main` branch constantly. That's because Firefox is quite a busy codebase, and updates are made constantly to the `main` repo. So if your patch is sitting on an old version of `main`, it can cause merge conflicts. The workflow is `git switch main` => `git pull` => `git switch <branch-name>` => `git rebase main`. Another good habit to keep is linting your code with `./mach lint --outgoing --fix`.
