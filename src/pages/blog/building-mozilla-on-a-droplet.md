---
layout: ../../layouts/BlogPost.astro
title: "Leveraging The Cloud To Overcome Hardware Limitations"
date: "November 15, 2025"
description: "Facing challenges due to low hardware specs, I SSHed into a remote VPS and used those rented computational resources to meet my needs."
---

## The Challenge

While beginning a journey as a Mozilla Bughunter, you're relying on your local machine to run any testing you might need, as at first you won't have even a [commit level 1]() access. 

(Explain the whole issue with C++ changes and non-artifact builds)

## Digital Ocean's Droplets

The pricing from DO's VPSes is geared towards a different use-case and therefore quite affordable for overcoming this problem. This is why it wasn't even worth considering alternatives, maybe less opinionated such as AWS or Azure. Digital Ocean's droplets are already ultra-simple, and ultra-cheap for this application, so why bother? 

## How To Operate Remotely Via SSH

A few major problems ensuided when try to operate remotely and it was far from a perfect solution. Namely, these ones down below required special attention:
### 1. The SSH connection (lack of) persistence

### 2. The necessity to conduct headless testing only
