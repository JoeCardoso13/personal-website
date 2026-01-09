---
layout: ../../layouts/BlogPost.astro
title: "Contributing to Firefox: A Guide for New Contributors"
date: "November 01, 2025"
description: "My experience navigating the Firefox development workflow getting my first patches approved."
---

## The Browser

I'd argue the browser is one of the most important softwares in existance today. Maybe right after the Operating System. It's the window through which the bulk of the population access the World Wide Web on a daily basis. It has been the birthplace of some of the world's largest companies by market capitalization, like Amazon, Alphabet (Google) and Meta (Facebook).

Nothstanding its imporance and impact in society, the browser is also - perhaps surprisingly - incredibly complex. Mozilla Firefox contains more than 31 million lines of code. It's a mature codebase, built over 25+ years. Its architecture has predominantly 2 components: 
1. The engine, or platform - in the case of Mozilla Firefox its named **Gecko**. A program made to run scripts downloaded from all over the web, i.e. built to execute untrusted instructions from websites, web applications, etc. 
2. The set of many utility programs that interact with these websites: things that help you memorize form entries, passwords, store your web history, enable bookmarking, etc. This is often simply called front-end, or just **Firefox**.

Most of the teams and specialists working full-time at Mozilla Firefox are organized along those lines (which are often blurry). My work as a bughunter was circumscribed to #2, the **Firefox**.

Side note: when working on [refactoring a component from the Debugger panel in DevTools](/blog/bug1543628), I could understand concretely that the browser UI is rendered by the same engine that renders the contents of the web pages. Which means that everything you see surrounding the page you scroll - tabs, bookmarks and so forth - is stylized with CSS, programmed with JavaScript etc.

## Why Mozilla Firefox?

I started contributing to Firefox because I wanted to understand how browsers actually work under the hood. Also, as a millenial, I have been using it since its inception, and have developed sympathies towards it. The following principles of the [Mozilla Manifesto](https://www.mozilla.org/en-US/about/manifesto/), in particular, stand out to me:

### Principle 2

*The internet is a global public resource that must remain open and accessible.*

### Principle 6

*The effectiveness of the internet as a public resource depends upon interoperability (protocols, data formats, content), innovation and decentralized participation worldwide.*

These principles sound nice, but any company's marketing page could say similar things. What sets Mozilla apart is that their organizational structure legally binds them to this mission. Whereas Mozilla's immediate adversaries are public corporations answering solely to their shareholders, Mozilla's own structure is a peculiar case of a non-profit owning its for-profit subsidiary. The [Mozilla Foundation](https://www.mozillafoundation.org/en/) (non-profit 501(c)(3)) makes sure all major decisions concerning the future of the corporatoin aligns with its open web mission. [Mozilla Corporation](https://www.mozilla.org/en-US/) (for-profit) governs day-to-day business decisions, generating revenues, paying employees and so forth.

## Firefox Impact

Only [3 browser engines](https://en.wikipedia.org/wiki/Browser_engine) remain actively developed today: Blink (Google), WebKit (Apple), Gecko (Mozilla). Keeping Gecko alive among the other 2 is our insurance against the dangers of a monopolized web experience. I remember how [Firefox saved the web](https://www.firefox.com/en-US/more/browser-history/) from IE in the 2000s, and I'm deeply grateful for it. I'm hereby paying this debt of gratitude by hunting some bugs for the team!

Additionally, I have used the [MDN documentation](https://developer.mozilla.org/en-US/) heavily during my journey to master JavaScript. It's the industry-standard documentation for web developers, and I fully endorse its quality. It just so happens to be funded by revenue from Firefox!

## Essential Tools

(maybe find something from here: https://firefox-source-docs.mozilla.org/setup/contributing_code.html)

### Searchfox

( https://searchfox.org/ )

### Matrix

### Bugzilla

### Phabricator

### Documentation

( https://firefox-source-docs.mozilla.org/ )

## The Process

Bugzilla: find your bug

Phabricator: submit and review your patch
