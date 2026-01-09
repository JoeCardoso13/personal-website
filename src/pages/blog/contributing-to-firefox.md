---
layout: ../../layouts/BlogPost.astro
title: "Contributing to Firefox: A Guide for New Contributors"
date: "November 01, 2025"
description: "My experience navigating the Firefox development workflow getting my first patches approved."
---

## The Browser

A browser is probably more complex than most of us assume at first. Its architecture has predominantly 2 components: 
1. The engine - in the case of Mozilla Firefox: **Gecko**. Which is a program/platform that runs scripts downloaded from all over the web, i.e. it is built to execute untrusted instructions from websites, web applications, etc. 
2. The set of many utility programs that interact with these websites: things that help you memorize form entries, passwords, store your web history, enable bookmarking, etc. This is often simply called front-end, or just **Firefox**.

Most of the teams and specialists working full-time are organized along those lines (which, of course, are often blurry). My work as a bughunter was circumscribed to item #2, the **Firefox**.

Side note: interestingly enough, when working on [refactoring a component from the Debugger panel in DevTools](/blog/bug1543628), I could understand concretely that the browser UI is rendered by the same engine that renders the contents of the web pages. Which means that everything you see surrounding the page you scroll - tabs, bookmarks and so forth - is stylized with CSS, programmed with JavaScript etc.

## Why Mozilla Firefox?

I started contributing because I wanted to understand how browsers actually work under the hood. Also because, as a millenial, I have been using it since the beginning and have a deeper relationship with this browser. The following principles of the [Mozilla Manifesto](https://www.mozilla.org/en-US/about/manifesto/), in particular, stand out to me:

### Principle 2

*The internet is a global public resource that must remain open and accessible.*

### Principle 6

*The effectiveness of the internet as a public resource depends upon interoperability (protocols, data formats, content), innovation and decentralized participation worldwide.*

(maybe expand on this a little bit)

## Firefox Impact

(Gecko, the last bastion of freedom)
Only 3 browser engines remain active today: Blink (Google), WebKit (Apple), Gecko (Mozilla). Keeping Gecko alive, among the other 2 is like insurance against the dangers of a worldwide monopolized web experience. I saw how Firefox saved the web from IE in the 2000s. I see my work at Mozilla as a my little payment contribution towards this insurance that keeps the entire web better for everybody.

(MDN, the most important documentation project in the world)

## Ingredients For Contribution

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
